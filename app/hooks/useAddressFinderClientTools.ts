import { useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useMemo } from "react";
import {
	classifyIntent,
	classifySelectedResult,
} from "~/utils/addressFinderUtils";

import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
// New Pillar-Aligned Store Imports
import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";

export function useAddressFinderClientTools(
	getSessionToken: () => string,
	clearSessionToken: () => void,
) {
	const queryClient = useQueryClient();
	const getPlaceSuggestionsAction = useAction(api.address.getPlaceSuggestions.getPlaceSuggestions);
	const validateAddressAction = useAction(api.address.validateAddress.validateAddress);
	const getPlaceDetailsAction = useAction(api.address.getPlaceDetails.getPlaceDetails);

	// ✅ FIX: All required state values and setters are destructured at the top level.
	const { isRecording, setAgentRequestedManual } = useUIStore();
	const {
		searchQuery,
		selectedResult,
		currentIntent,
		agentLastSearchQuery,
		setActiveSearch,
		setSelectedResult,
		setCurrentIntent,
		setAgentLastSearchQuery,
	} = useIntentStore();
	const { addHistory } = useHistoryStore();
	const { clearSelectionAndSearch } = useAddressFinderActions();

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback((...args: any[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[ClientTools]", ...args);
		}
	}, []); // Empty dependency array makes this completely stable

	// Enhanced ClientTools for managing place suggestions directly
	const clientTools = useMemo(
		() => ({
			searchAddress: async (params: { query: string }) => {
				log("🔧 Tool Call: searchAddress with params:", params);

				// STATE RESET: Per documentation, a new search must clear any existing selection.
				setSelectedResult(null);
				setCurrentIntent("general");

				const { query } = params;

				if (typeof query !== "string" || !query.trim()) {
					const errorMessage =
						"Invalid or missing 'query' parameter for searchAddress tool.";
					log(`Tool searchAddress failed: ${errorMessage}`, { params });
					return JSON.stringify({
						status: "error",
						error: errorMessage,
					});
				}

				addHistory({ type: "agent", text: `Searching for: "${query}"` });

				try {
					const intent = classifyIntent(query);
					log(
						`🔧 Agent search for "${query}" classified with intent: "${intent}"`,
					);

					if (intent === "address") {
						log(
							`🔬 Intent is "address", using direct/strict validation flow for agent.`,
						);
						const validation = await validateAddressAction({ address: query });

						if (validation.success && validation.isValid) {
							log(
								`✅ Agent search validated successfully: "${validation.result.address.formattedAddress}"`,
							);
							const validatedSuggestion: Suggestion = {
								placeId: validation.result.geocode.placeId,
								description: validation.result.address.formattedAddress,
								types: ["street_address", "validated_address"],
								resultType: "address",
							};

							queryClient.setQueryData(
								["addressSearch", query],
								[validatedSuggestion],
							);
							setAgentLastSearchQuery(query);
							setActiveSearch({ query, source: "voice" });

							return JSON.stringify({
								status: "validated",
								suggestions: [validatedSuggestion],
								message:
									"Address was successfully validated by the system and is ready for selection.",
							});
						}
						log(
							`❌ Agent search failed strict validation: ${validation.error}`,
						);
						addHistory({
							type: "agent",
							text: `Agent search failed validation: ${validation.error}`,
						});
						return JSON.stringify({
							status: "validation_failed",
							suggestions: [],
							error:
								validation.error ||
								"The provided address could not be validated.",
						});
					}

					const result = await getPlaceSuggestionsAction({
						query: query,
						intent: intent || "general",
						isAutocomplete: true,
						sessionToken: getSessionToken(),
					});

					if (result.success && result.suggestions) {
						log(
							`🔧 Search successful, populating cache for query: "${query}" with ${result.suggestions.length} suggestions.`,
						);

						// Manually update the React Query cache - The Single Source of Truth for API State
						queryClient.setQueryData(
							["addressSearch", query],
							result.suggestions,
						);

						// Set the agent context in Zustand - The "Brain's" memory of the last agent action
						setAgentLastSearchQuery(query);

						// Update the main search query in the "Brain" to make the UI display these results.
						setActiveSearch({ query, source: "voice" });

						// Return the suggestions to the agent
						return JSON.stringify(result.suggestions);
					}

					log("🔧 Search returned no results or failed.");
					setAgentLastSearchQuery(null); // Clear context
					return JSON.stringify([]); // Return an empty array on failure or no results.
				} catch (error) {
					log("Tool searchAddress failed:", error);
					setAgentLastSearchQuery(null); // Clear context on failure
					return JSON.stringify({
						status: "error",
						error: error instanceof Error ? error.message : "Search failed",
					});
				}
			},

			getSuggestions: async () => {
				log("🔧 Tool Call: getSuggestions");
				// ✅ CORRECT: Use `getState()` for access inside callbacks to ensure freshness.
				const { isRecording: isRecordingFromState } = useUIStore.getState();
				const currentSearchQuery = useIntentStore.getState().searchQuery;
				const suggestions =
					queryClient.getQueryData<Suggestion[]>([
						"addressSearch",
						currentSearchQuery,
					]) || [];

				log("🔧 getSuggestions returning (unified source):", {
					totalSuggestions: suggestions.length,
					unified: suggestions.length,
					isRecording: isRecordingFromState,
					source: suggestions.length > 0 ? "unified" : "none",
					note: "Using unified React Query source for all suggestions",
				});

				return JSON.stringify({
					suggestions: suggestions,
					count: suggestions.length,
					source: suggestions.length > 0 ? "unified" : "none",
					mode: isRecordingFromState ? "conversation" : "manual",
					availableArrays: {
						unified: suggestions.length,
						note: "single source of truth via React Query",
					},
				});
			},

			selectSuggestion: async (params: unknown) => {
				log("🔧 ===== Tool Call: selectSuggestion =====");
				log("🔧 AGENT ATTEMPTING SELECTION with params:", params);

				let placeId: string | undefined;
				if (typeof params === "string") {
					placeId = params;
				} else if (params && typeof params === "object") {
					const paramObj = params as Record<string, unknown>;
					placeId = (paramObj.placeId || paramObj.place_id) as string | undefined;
				}
				if (typeof placeId !== "string" || !placeId.trim()) {
					const errorMessage = "Invalid or missing 'placeId' or 'place_id' parameter for selectSuggestion tool.";
					log(`Tool selectSuggestion failed: ${errorMessage}`, { params });
					return JSON.stringify({ status: "error", error: errorMessage });
				}

				const {
					selectedResult: currentSelectedResult,
					currentIntent: currentIntentFromState,
					searchQuery: currentSearchQueryFromState,
					agentLastSearchQuery: agentLastSearchQueryFromState,
				} = useIntentStore.getState();

				let selection: Suggestion | undefined = undefined;
				if (agentLastSearchQueryFromState) {
					const suggestionsFromAgentSearch = queryClient.getQueryData<Suggestion[]>(["addressSearch", agentLastSearchQueryFromState]);
					if (suggestionsFromAgentSearch) {
						selection = suggestionsFromAgentSearch.find((s) => s.placeId === placeId);
					}
				}

				if (selection) {
					let updatedSelection = selection;
					if ((selection.lat === undefined || selection.lng === undefined) && selection.placeId) {
						const detailsRes = await getPlaceDetailsAction({ placeId: selection.placeId });
						if (detailsRes.success && detailsRes.details?.geometry?.location) {
							updatedSelection = {
								...selection,
								lat: detailsRes.details.geometry.location.lat,
								lng: detailsRes.details.geometry.location.lng,
							};
						}
					}
					const intent = classifySelectedResult(updatedSelection);
					setCurrentIntent(intent);
					setSelectedResult(updatedSelection);
					setActiveSearch({ query: updatedSelection.description, source: "voice" });
					addHistory({ type: "agent", text: `Agent selected: "${updatedSelection.description}" (${intent})` });
					clearSessionToken();
					setAgentLastSearchQuery(null);
					const confirmationResponse = {
						status: "confirmed",
						selection: updatedSelection,
						intent,
						timestamp: Date.now(),
						confirmationMessage: `Successfully selected "${updatedSelection.description}" as ${intent}`,
					};
					return JSON.stringify(confirmationResponse);
				}

				log("❌ Selection not found for placeId:", placeId);
				const agentLastSearchQueryFromStateForError =
					useIntentStore.getState().agentLastSearchQuery;
				const suggestionsFromAgentSearch = agentLastSearchQueryFromStateForError
					? queryClient.getQueryData<Suggestion[]>([
						"addressSearch",
						agentLastSearchQueryFromStateForError,
					])
					: [];
				log(
					"Available suggestions in agent context:",
					(suggestionsFromAgentSearch || []).map((s) => ({
						placeId: s.placeId,
						description: s.description,
					})),
				);

				// --- DEFENSIVE SYNC: If suggestions are empty but selectedResult matches, confirm selection ---
				// See UNIFIED_ADDRESS_SYSTEM.md and state-management-strategy.md for rationale.
				const currentSelection = useIntentStore.getState().selectedResult;
				if (currentSelection && currentSelection.placeId === placeId) {
					log("✅ Defensive: Confirming selection from selectedResult, not suggestions array.");
					const intent = useIntentStore.getState().currentIntent;
					return JSON.stringify({
						status: "confirmed",
						selection: currentSelection,
						intent,
						timestamp: Date.now(),
						confirmationMessage: `Confirmed selection of \"${currentSelection.description}\" as ${intent} (defensive path)`
					});
				}

				return JSON.stringify({
					status: "not_found",
					searchedPlaceId: placeId,
					error:
						"The requested placeId could not be found in the last set of agent search results. The user may need to search again.",
				});
			},

			getCurrentState: async () => {
				log("🔧 ===== Tool Call: getCurrentState =====");
				// ✅ CORRECT: Use `getState()` for access inside callbacks.
				const { isRecording, isVoiceActive } = useUIStore.getState();
				const { currentIntent, searchQuery, selectedResult } =
					useIntentStore.getState();
				const { apiResults } = useApiStore.getState();

				let systemStatus:
					| "AWAITING_USER_INPUT"
					| "AWAITING_USER_SELECTION"
					| "SELECTION_CONFIRMED";
				let systemStatusDescription: string;

				if (selectedResult) {
					systemStatus = "SELECTION_CONFIRMED";
					systemStatusDescription = `A final address has been selected: "${selectedResult.description}". The agent should now confirm this with the user or ask for next steps.`;
				} else if (
					apiResults.suggestions &&
					apiResults.suggestions.length > 0
				) {
					systemStatus = "AWAITING_USER_SELECTION";
					systemStatusDescription = `Multiple address suggestions are available. The agent should help the user choose from the list of ${apiResults.suggestions.length} options.`;
				} else {
					systemStatus = "AWAITING_USER_INPUT";
					systemStatusDescription = `The system is idle and waiting for the user to provide an address to search for. The agent's primary goal is to ask the user for a search query.`;
				}

				const stateSummary = {
					systemStatus: {
						status: systemStatus,
						description: systemStatusDescription,
					},
					ui: {
						isRecording,
						isVoiceActive,
						currentIntent: currentIntent || "general",
						searchQuery,
						hasQuery: !!searchQuery,
					},
					api: {
						suggestionsCount: apiResults.suggestions.length,
						isLoading: apiResults.isLoading,
						error: apiResults.error,
						hasResults: apiResults.suggestions.length > 0,
					},
					selection: {
						selectedResult,
						hasSelection: !!selectedResult,
						selectedAddress: selectedResult?.description || null,
						selectedPlaceId: selectedResult?.placeId || null,
					},
				};

				log("🔧 getCurrentState returning summary:", stateSummary);
				return JSON.stringify(stateSummary);
			},

			getConfirmedSelection: async () => {
				log("🔧 Tool Call: getConfirmedSelection");
				const { selectedResult: confirmedResult } = useIntentStore.getState();
				const hasSelection = !!confirmedResult;

				const { currentIntent, searchQuery } = useIntentStore.getState();
				const { isRecording: isRecordingFromStore } = useUIStore.getState();

				log("🔧 Current state snapshot (fresh from store):", {
					hasSelection,
					selectedResultExists: !!confirmedResult,
					selectedDescription: confirmedResult?.description,
					selectedPlaceId: confirmedResult?.placeId,
					currentIntent,
					searchQuery,
					isRecording: isRecordingFromStore,
					storeState: {
						selectedResult:
							useIntentStore.getState().selectedResult?.description,
						currentIntent: useIntentStore.getState().currentIntent,
						searchQuery: useIntentStore.getState().searchQuery,
					},
				});

				const response = {
					hasSelection,
					selection: confirmedResult,
					intent: currentIntent,
					searchQuery: searchQuery,
				};

				if (hasSelection) {
					log("✅ CONFIRMED SELECTION AVAILABLE:", {
						description: confirmedResult?.description,
						placeId: confirmedResult?.placeId,
						intent: currentIntent,
					});
				} else {
					log("⚠️ No confirmed selection available.");
				}
				return JSON.stringify(response);
			},

			clearSelection: async () => {
				log("🔧 Tool Call: clearSelection");
				// Directly call the centralized action
				clearSelectionAndSearch();
				log("✅ Selection and search cleared via centralized action.");
				return JSON.stringify({ status: "cleared" });
			},

			confirmUserSelection: async (params: unknown) => {
				log("🔧 ===== Tool Call: confirmUserSelection =====");
				log("🔧 AGENT ACKNOWLEDGING USER SELECTION with params:", params);

				// This tool allows the agent to explicitly acknowledge a user's selection
				const { selectedResult: currentSelection } = useIntentStore.getState();
				log("🔧 Current selection state:", {
					hasSelection: !!currentSelection,
					description: currentSelection?.description,
					placeId: currentSelection?.placeId,
					intent: currentIntent,
				});

				if (currentSelection) {
					const response = {
						status: "acknowledged",
						selection: currentSelection,
						intent: currentIntent,
						message: `Perfect! I've acknowledged your selection of "${currentSelection.description}" as a ${currentIntent}. The selection is now confirmed and ready to use.`,
						timestamp: Date.now(),
					};

					log("✅ ACKNOWLEDGING USER SELECTION:", currentSelection.description);
					addHistory({
						type: "agent",
						text: `✅ Confirmed: "${currentSelection.description}" (${currentIntent})`,
					});

					// Note: Centralized sync effect will handle sync automatically

					return JSON.stringify(response);
				}
				log("❌ NO SELECTION TO ACKNOWLEDGE");
				return JSON.stringify({
					status: "no_selection",
					message:
						"I don't see any current selection to acknowledge. Please make a selection first.",
				});
			},

			requestManualInput: async (params: { reason: string }) => {
				log("🔧 ===== Tool Call: requestManualInput =====");
				const reason =
					params?.reason ||
					"The agent has determined manual input may be more effective.";

				// Keep conversation active. Only set UI flags.
				setAgentRequestedManual(true);
				addHistory({ type: "agent", text: `🤖 → 📝 ${reason}` });

				// ✅ CORRECT: Get fresh state inside the tool function.
				const { isRecording: isRecordingFromState } = useUIStore.getState();

				return JSON.stringify({
					status: "hybrid_mode_activated",
					message: "Manual input has been enabled.",
					isRecording: isRecordingFromState,
				});
			},

			getHistory: async () => {
				log("🔧 Tool Call: getHistory");
				const { history: recordedHistory } = useHistoryStore.getState();
				log("🔧 Returning interaction history. Count:", recordedHistory.length);
				return JSON.stringify(recordedHistory);
			},
		}),
		[
			queryClient,
			getPlaceSuggestionsAction,
			validateAddressAction,
			getPlaceDetailsAction,
			getSessionToken,
			clearSessionToken,
			log,
			isRecording,
			searchQuery,
			selectedResult,
			currentIntent,
			agentLastSearchQuery,
			setActiveSearch,
			setSelectedResult,
			setCurrentIntent,
			addHistory,
			setAgentRequestedManual,
			setAgentLastSearchQuery,
			clearSelectionAndSearch,
		],
	);

	return clientTools;
}
