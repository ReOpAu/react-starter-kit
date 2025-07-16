import type { useConversation } from "@elevenlabs/react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { type RefObject, useCallback, useState } from "react";
import { useReliableSync } from "~/elevenlabs/hooks/useReliableSync";
import { useIntentStore } from "~/stores/intentStore";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import { classifySelectedResult } from "~/utils/addressFinderUtils";

// Constants for place details enrichment
const ENRICHMENT_CACHE_KEY = "placeDetails";

// Helper function to check if a result is already enriched
const isResultEnriched = (result: Suggestion): boolean => {
	return Boolean(result.postcode && result.suburb && result.lat && result.lng);
};

// Helper function to log enrichment operations
const logEnrichment = (
	operation: string,
	result: Suggestion,
	extra?: Record<string, unknown>,
) => {
	console.log(`[AddressHandler:Enrichment] ${operation}`, {
		placeId: result.placeId,
		description: result.description,
		isEnriched: isResultEnriched(result),
		...extra,
	});
};

type UseActionHandlerDependencies = {
	log: (...args: any[]) => void;
	setCurrentIntent: (intent: LocationIntent) => void;
	setSelectedResult: (result: Suggestion | null) => void;
	setActiveSearch: (payload: {
		query: string;
		source: "manual" | "voice";
	}) => void;
	setAgentRequestedManual: (requested: boolean) => void;
	addHistory: (item: HistoryItem) => void;
	getSessionToken: () => string;
	clearSessionToken: () => void;
	isRecording: boolean;
	conversationRef: RefObject<ReturnType<typeof useConversation> | null>;
	queryClient: QueryClient;
	clearSelectionAndSearch: () => void;
	// New dependencies for consolidated selection logic
	getPlaceDetailsAction: any;
	setAgentLastSearchQuery: (query: string | null) => void;
	addAddressSelection: (entry: any) => void;
	searchQuery: string;
	currentIntent: LocationIntent | null;
	preserveIntent: LocationIntent | null;
	setPreserveIntent: (intent: LocationIntent | null) => void;
	resetRecallMode: () => void;
	syncToAgent: () => void;
};

export function useActionHandler({
	log,
	setCurrentIntent,
	setSelectedResult,
	setActiveSearch,
	setAgentRequestedManual,
	addHistory,
	getSessionToken,
	clearSessionToken,
	isRecording,
	conversationRef,
	queryClient,
	clearSelectionAndSearch,
	// New dependencies for consolidated selection logic
	getPlaceDetailsAction,
	setAgentLastSearchQuery,
	addAddressSelection,
	searchQuery,
	currentIntent,
	preserveIntent,
	setPreserveIntent,
	resetRecallMode,
	syncToAgent,
}: UseActionHandlerDependencies) {
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [pendingRuralConfirmation, setPendingRuralConfirmation] =
		useState<null | { result: Suggestion; validation: any }>(null);
	const validateAddressAction = useAction(
		api.address.validateAddress.validateAddress,
	);
	const { performReliableSync } = useReliableSync();

	// Consolidated selection handler with enrichment and validation
	const handleSelectResult = useCallback(
		async (result: Suggestion): Promise<void> => {
			log("🎯 === CONSOLIDATED SELECTION FLOW START ===");
			let enrichedResult = { ...result };

			// Step 1: Enrichment (from original handleSelectResult)
			if (result.placeId && !isResultEnriched(result)) {
				logEnrichment("Starting enrichment", result);

				// Check cache first
				const cachedData = queryClient.getQueryData<{
					success: boolean;
					details: {
						formattedAddress: string;
						lat: number;
						lng: number;
						types: string[];
						suburb?: string;
						postcode?: string;
					};
				}>([ENRICHMENT_CACHE_KEY, result.placeId]);

				if (cachedData?.success) {
					logEnrichment("Using cached data", result);
					enrichedResult = {
						...result, // Keep original suggestion data like confidence
						description: cachedData.details.formattedAddress,
						displayText: cachedData.details.formattedAddress,
						lat: cachedData.details.lat,
						lng: cachedData.details.lng,
						types: cachedData.details.types,
						suburb: cachedData.details.suburb,
						postcode: cachedData.details.postcode,
					};
				} else {
					// Fetch fresh data from API
					logEnrichment("Fetching from API", result);
					try {
						const detailsRes = await getPlaceDetailsAction({
							placeId: result.placeId,
						});

						if (detailsRes.success) {
							logEnrichment("Enrichment successful", result, {
								formattedAddress: detailsRes.details.formattedAddress,
								postcode: detailsRes.details.postcode,
								suburb: detailsRes.details.suburb,
							});

							// Cache the result
							queryClient.setQueryData(
								[ENRICHMENT_CACHE_KEY, result.placeId],
								detailsRes,
							);

							enrichedResult = {
								...result, // Keep original suggestion data like confidence
								description: detailsRes.details.formattedAddress,
								displayText: detailsRes.details.formattedAddress,
								lat: detailsRes.details.lat,
								lng: detailsRes.details.lng,
								types: detailsRes.details.types,
								suburb: detailsRes.details.suburb,
								postcode: detailsRes.details.postcode,
							};
						} else {
							// Log enrichment failure but continue with original result
							logEnrichment("Enrichment failed", result, {
								error: detailsRes.error,
							});
							console.warn(
								`[AddressHandler] Failed to enrich place details for ${result.placeId}:`,
								detailsRes.error,
							);
						}
					} catch (error) {
						logEnrichment("Enrichment API call failed", result, { error });
						console.warn(
							`[AddressHandler] Exception during enrichment for ${result.placeId}:`,
							error,
						);
					}
				}
			} else if (isResultEnriched(result)) {
				logEnrichment("Already enriched, skipping", result);
			} else {
				logEnrichment("No placeId, skipping enrichment", result);
			}

			// Step 2: Add to suggestions cache for agent context
			// CRITICAL: Use agentLastSearchQuery to maintain cache consistency for "show options again"
			const { agentLastSearchQuery } = useIntentStore.getState();
			const currentSearchQuery =
				agentLastSearchQuery || searchQuery || enrichedResult.description;

			const currentSuggestions =
				queryClient.getQueryData<Suggestion[]>([
					"addressSearch",
					currentSearchQuery,
				]) || [];
			if (
				!currentSuggestions.find((s) => s.placeId === enrichedResult.placeId)
			) {
				const updatedSuggestions = [...currentSuggestions, enrichedResult];
				queryClient.setQueryData(
					["addressSearch", currentSearchQuery],
					updatedSuggestions,
				);
				log("🔧 Context sync: Added selection to agent's suggestions array");
			}

			// Step 3: Intent classification and validation (from original handleSelect)
			const intent = classifySelectedResult(enrichedResult);
			log(`🎯 Initial classification from suggestion: ${intent}`);

			if (intent === "address") {
				log('🔬 Intent is "address", proceeding with full validation.');
				setValidationError(null);
				setIsValidating(true);

				try {
					// Check if Convex is available before calling the action
					if (!validateAddressAction) {
						throw new Error(
							"Address validation service is not available. Please ensure Convex dev server is running.",
						);
					}

					const validation = await validateAddressAction({
						address: enrichedResult.description,
					});

					log("🔬 VALIDATION RESULT:", validation);

					if (validation.success && validation.isValid) {
						// Further enrich with validation data if available
						const finalResult: Suggestion = {
							...enrichedResult,
							description: validation.result.address.formattedAddress,
							placeId: validation.result.geocode.placeId,
							lat: validation.result.geocode?.location?.latitude,
							lng: validation.result.geocode?.location?.longitude,
						};
						const finalIntent = classifySelectedResult(finalResult);
						log(`🎯 Final intent after validation: ${finalIntent}`);
						setCurrentIntent(finalIntent);

						setSelectedResult(finalResult);
						setActiveSearch({
							query: finalResult.description,
							source: "manual",
						});
						setAgentRequestedManual(false);
						// Reset options display when making a new selection
						useUIStore.getState().setShowingOptionsAfterConfirmation(false);
						addHistory({
							type: "user",
							text: `Selected: "${finalResult.description}"`,
						});

						clearSessionToken();

						// Step 4: Agent communication
						if (
							isRecording &&
							conversationRef.current?.status === "connected"
						) {
							const selectionMessage = `I have selected "${finalResult.description}" from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
							log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

							try {
								conversationRef.current?.sendUserMessage?.(selectionMessage);
								log("✅ Message sent to agent successfully");
								addHistory({
									type: "system",
									text: "Notified agent about selection",
								});
							} catch (error) {
								log("❌ Failed to send message to agent:", error);
								addHistory({
									type: "system",
									text: `Failed to notify agent: ${error}`,
								});
							}
						}

						// Step 5: Store selection and sync
						log(
							`🔧 Storing selection - originalQuery: "${currentSearchQuery}", selectedAddress.description: "${finalResult.description}"`,
						);
						addAddressSelection({
							originalQuery: currentSearchQuery,
							selectedAddress: finalResult,
							context: {
								mode: isRecording ? "voice" : "manual",
								intent: currentIntent ?? "general",
							},
						});
						setAgentLastSearchQuery(currentSearchQuery);
						resetRecallMode();
						// Single consolidated sync at the end
						syncToAgent();
					} else if (
						validation.success &&
						"isRuralException" in validation &&
						validation.isRuralException
					) {
						// Rural exception: prompt user for confirmation
						setPendingRuralConfirmation({ result: enrichedResult, validation });
						setValidationError(null);
						addHistory({
							type: "system",
							text: `Rural address exception: ${validation.error}`,
						});
					} else {
						const errorMessage =
							validation.error ||
							"The selected address could not be validated.";
						log(`❌ VALIDATION FAILED: ${errorMessage}`);
						setValidationError(errorMessage);
						addHistory({
							type: "system",
							text: `Validation failed: ${errorMessage}`,
						});
					}
				} catch (error: any) {
					log("💥 VALIDATION ACTION FAILED:", error);
					console.error("Full error object:", error);

					// Enhanced error handling to catch "require is not defined" errors
					let errorMessage = "An unknown error occurred";
					if (error.message?.includes("require is not defined")) {
						errorMessage =
							"Server-side code execution error. Please check the server logs.";
					} else if (error.data?.message) {
						errorMessage = error.data.message;
					} else if (error.message) {
						errorMessage = error.message;
					}

					setValidationError(`Validation failed: ${errorMessage}`);
					addHistory({
						type: "system",
						text: `Validation action failed: ${errorMessage}`,
					});
				} finally {
					setIsValidating(false);
				}
			} else {
				// Non-address intents: proceed without validation
				log(`🎯 Intent is "${intent}", skipping full validation.`);

				// Preserve intent if this is a recall, otherwise update based on selection
				if (preserveIntent) {
					setCurrentIntent(preserveIntent);
					setPreserveIntent(null);
				} else {
					setCurrentIntent(intent);
				}

				setSelectedResult(enrichedResult);
				setActiveSearch({
					query: enrichedResult.description,
					source: "manual",
				});
				setAgentRequestedManual(false);
				// Reset options display when making a new selection
				useUIStore.getState().setShowingOptionsAfterConfirmation(false);
				addHistory({
					type: "user",
					text: `Selected: "${enrichedResult.description}"`,
				});
				clearSessionToken();

				// Agent communication for non-address selections
				if (isRecording && conversationRef.current?.status === "connected") {
					const selectionMessage = `I have selected "${enrichedResult.description}". This is a ${intent}, not a full address. Please acknowledge this selection.`;
					log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

					try {
						conversationRef.current?.sendUserMessage?.(selectionMessage);
						log("✅ Message sent to agent successfully");
						addHistory({
							type: "system",
							text: `Notified agent about ${intent} selection`,
						});
					} catch (error) {
						log("❌ Failed to send message to agent:", error);
						addHistory({
							type: "system",
							text: `Failed to notify agent: ${error}`,
						});
					}
				}

				// Store selection and sync
				log(
					`🔧 Storing selection - originalQuery: "${currentSearchQuery}", selectedAddress.description: "${enrichedResult.description}"`,
				);
				addAddressSelection({
					originalQuery: currentSearchQuery,
					selectedAddress: enrichedResult,
					context: {
						mode: isRecording ? "voice" : "manual",
						intent: currentIntent ?? "general",
					},
				});
				setAgentLastSearchQuery(currentSearchQuery);
				resetRecallMode();
				// Single consolidated sync at the end
				syncToAgent();
			}
			log("🎯 === CONSOLIDATED SELECTION FLOW END ===");
		},
		[
			log,
			getPlaceDetailsAction,
			queryClient,
			searchQuery,
			validateAddressAction,
			setCurrentIntent,
			setSelectedResult,
			setActiveSearch,
			setAgentRequestedManual,
			addHistory,
			clearSessionToken,
			isRecording,
			conversationRef,
			addAddressSelection,
			setAgentLastSearchQuery,
			syncToAgent,
			resetRecallMode,
			currentIntent,
			preserveIntent,
			setPreserveIntent,
		],
	);

	// Legacy handleSelect for backward compatibility (will be removed)
	const handleSelect = useCallback(
		async (result: Suggestion) => {
			log("🎯 === UNIFIED SELECTION FLOW START ===");
			log("🎯 Handling selection:", {
				description: result.description,
				placeId: result.placeId,
				types: result.types,
			});

			const intent = classifySelectedResult(result);
			log(`🎯 Initial classification from suggestion: ${intent}`);
			setCurrentIntent(intent);

			if (intent === "address") {
				log('🔬 Intent is "address", proceeding with full validation.');
				setValidationError(null);
				setIsValidating(true);

				try {
					// Check if Convex is available before calling the action
					if (!validateAddressAction) {
						throw new Error(
							"Address validation service is not available. Please ensure Convex dev server is running.",
						);
					}

					const validation = await validateAddressAction({
						address: result.description,
					});

					log("🔬 VALIDATION RESULT:", validation);

					if (validation.success && validation.isValid) {
						const enrichedResult: Suggestion = {
							...result,
							description: validation.result.address.formattedAddress,
							placeId: validation.result.geocode.placeId,
							lat: validation.result.geocode?.location?.latitude,
							lng: validation.result.geocode?.location?.longitude,
							// You can add more enriched data here if your Suggestion type supports it
						};
						const finalIntent = classifySelectedResult(enrichedResult);
						log(`🎯 Final intent after enrichment: ${finalIntent}`);
						setCurrentIntent(finalIntent);

						setSelectedResult(enrichedResult);
						setActiveSearch({
							query: enrichedResult.description,
							source: "manual",
						});
						setAgentRequestedManual(false);
						// Reset options display when making a new selection
						useUIStore.getState().setShowingOptionsAfterConfirmation(false);
						addHistory({
							type: "user",
							text: `Selected: "${enrichedResult.description}"`,
						});

						clearSessionToken();

						if (
							isRecording &&
							conversationRef.current?.status === "connected"
						) {
							const selectionMessage = `I have selected "${enrichedResult.description}" from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
							log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

							try {
								conversationRef.current?.sendUserMessage?.(selectionMessage);
								log("✅ Message sent to agent successfully");
								addHistory({
									type: "system",
									text: "Notified agent about selection",
								});
							} catch (error) {
								log("❌ Failed to send message to agent:", error);
								addHistory({
									type: "system",
									text: `Failed to notify agent: ${error}`,
								});
							}
						}
					} else if (
						validation.success &&
						"isRuralException" in validation &&
						validation.isRuralException
					) {
						// Rural exception: prompt user for confirmation
						setPendingRuralConfirmation({ result, validation });
						setValidationError(null);
						addHistory({
							type: "system",
							text: `Rural address exception: ${validation.error}`,
						});
					} else {
						const errorMessage =
							validation.error ||
							"The selected address could not be validated.";
						log(`❌ VALIDATION FAILED: ${errorMessage}`);
						setValidationError(errorMessage);
						addHistory({
							type: "system",
							text: `Validation failed: ${errorMessage}`,
						});
					}
				} catch (error: any) {
					log("💥 VALIDATION ACTION FAILED:", error);
					console.error("Full error object:", error);

					// Enhanced error handling to catch "require is not defined" errors
					let errorMessage = "An unknown error occurred";
					if (error.message?.includes("require is not defined")) {
						errorMessage =
							"Server-side code execution error. Please check the server logs.";
					} else if (error.data?.message) {
						errorMessage = error.data.message;
					} else if (error.message) {
						errorMessage = error.message;
					}

					setValidationError(`Validation failed: ${errorMessage}`);
					addHistory({
						type: "system",
						text: `Validation action failed: ${errorMessage}`,
					});
				} finally {
					setIsValidating(false);
				}
			} else {
				log(`🎯 Intent is "${intent}", skipping full validation.`);
				setSelectedResult(result);
				setActiveSearch({ query: result.description, source: "manual" });
				setAgentRequestedManual(false);
				// Reset options display when making a new selection
				useUIStore.getState().setShowingOptionsAfterConfirmation(false);
				addHistory({ type: "user", text: `Selected: "${result.description}"` });
				clearSessionToken();

				if (isRecording && conversationRef.current?.status === "connected") {
					const selectionMessage = `I have selected "${result.description}". This is a ${intent}, not a full address. Please acknowledge this selection.`;
					log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

					try {
						conversationRef.current?.sendUserMessage?.(selectionMessage);
						log("✅ Message sent to agent successfully");
						addHistory({
							type: "system",
							text: `Notified agent about ${intent} selection`,
						});
					} catch (error) {
						log("❌ Failed to send message to agent:", error);
						addHistory({
							type: "system",
							text: `Failed to notify agent: ${error}`,
						});
					}
				}
			}
			log("🎯 === UNIFIED SELECTION FLOW END ===");
		},
		[
			log,
			setCurrentIntent,
			setSelectedResult,
			setActiveSearch,
			setAgentRequestedManual,
			addHistory,
			clearSessionToken,
			isRecording,
			conversationRef,
			validateAddressAction,
		],
	);

	const handleClear = useCallback(
		(context: "user" | "agent" = "user") => {
			log(`🗑️ === UNIFIED CLEAR FLOW START (context: ${context}) ===`);
			const { searchQuery } = useIntentStore.getState();

			if (searchQuery) {
				queryClient.removeQueries({
					queryKey: ["addressSearch", searchQuery],
					exact: true,
				});
				log("🔧 Cleared React Query cache for:", searchQuery);
			}

			clearSelectionAndSearch();
			addHistory({ type: context, text: "State cleared." });
			log("✅ ALL STATE CLEARED");

			// Explicitly notify the agent if a conversation is active
			if (isRecording && conversationRef.current?.status === "connected") {
				const clearMessage =
					"I have cleared my previous selection and am ready to continue.";
				log("🗨️ SENDING CLEAR MESSAGE TO AGENT:", clearMessage);
				try {
					conversationRef.current?.sendUserMessage?.(clearMessage);
					log("✅ Clear message sent to agent successfully");
					addHistory({
						type: "system",
						text: "Notified agent about state clear",
					});
				} catch (error) {
					log("❌ Failed to send clear message to agent:", error);
					addHistory({
						type: "system",
						text: `Failed to notify agent of clear: ${error}`,
					});
				}
			}

			performReliableSync("clear").catch((error) => {
				log("❌ Sync failed after clear:", error);
			});
			log("🔄 SYNC WITH AGENT INITIATED");

			log("🗑️ === UNIFIED CLEAR FLOW END ===");
		},
		[
			log,
			queryClient,
			clearSelectionAndSearch,
			addHistory,
			performReliableSync,
			isRecording,
			conversationRef,
		],
	);

	// Handler to accept rural address after user confirmation
	const handleAcceptRuralAddress = useCallback(() => {
		if (pendingRuralConfirmation) {
			const { result, validation } = pendingRuralConfirmation;
			const enrichedResult: Suggestion = {
				...result,
				description: validation.formattedAddress || result.description,
				placeId: validation.placeId || result.placeId,
				types: [...(result.types || []), "user_confirmed_rural"],
			};
			setSelectedResult(enrichedResult);
			setActiveSearch({ query: enrichedResult.description, source: "manual" });
			setAgentRequestedManual(false);
			// Reset options display when making a new selection
			useUIStore.getState().setShowingOptionsAfterConfirmation(false);
			addHistory({
				type: "user",
				text: `User confirmed rural address: "${enrichedResult.description}"`,
			});
			clearSessionToken();
			setPendingRuralConfirmation(null);
			// Optionally: notify agent as with normal selection
			if (isRecording && conversationRef.current?.status === "connected") {
				const selectionMessage = `I have confirmed the rural address "${enrichedResult.description}". Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
				log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);
				try {
					conversationRef.current?.sendUserMessage?.(selectionMessage);
					log("✅ Message sent to agent successfully");
					addHistory({
						type: "system",
						text: "Notified agent about rural address selection",
					});
				} catch (error) {
					log("❌ Failed to send message to agent:", error);
					addHistory({
						type: "system",
						text: `Failed to notify agent: ${error}`,
					});
				}
			}
		}
	}, [
		pendingRuralConfirmation,
		setSelectedResult,
		setActiveSearch,
		setAgentRequestedManual,
		addHistory,
		clearSessionToken,
		isRecording,
		conversationRef,
		log,
	]);

	return {
		handleSelectResult, // New consolidated function
		handleSelect, // Legacy function for backward compatibility
		isValidating,
		validationError,
		handleClear,
		pendingRuralConfirmation,
		handleAcceptRuralAddress,
	};
}
