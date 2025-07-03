import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	HistoryPanel,
	ManualSearchForm,
	SelectedResultCard,
	StateDebugPanel,
	SuggestionsDisplay,
	VoiceInputController,
} from "~/components/address-finder";
import AgentDebugCopyPanel from "~/components/address-finder/AgentDebugCopyPanel";
import AgentStatePanel from "~/components/address-finder/AgentStatePanel";
import SuburbBoundaryMap from "~/components/address-finder/SuburbBoundaryMap";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { useActionHandler } from "~/hooks/useActionHandler";
import { useAddressFinderClientTools } from "~/hooks/useAddressFinderClientTools";
import { useAgentSync } from "~/hooks/useAgentSync";
import { useAudioManager } from "~/hooks/useAudioManager";
import { useConversationManager } from "~/hooks/useConversationManager";
import { useReliableSync } from "~/hooks/useReliableSync";
import {
	classifyIntent,
	classifySelectedResult,
	getIntentColor,
	fetchLatLngForPlaceId,
} from "~/utils/addressFinderUtils";

import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
// New Pillar-Aligned Store Imports
import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";

export default function AddressFinder() {
	const queryClient = useQueryClient();
	const { syncToAgent } = useAgentSync();
	const { performReliableSync } = useReliableSync();

	// State from new pillar-aligned stores
	const {
		isRecording,
		isVoiceActive,
		agentRequestedManual,
		isLoggingEnabled,
		setAgentRequestedManual,
	} = useUIStore();
	const {
		searchQuery,
		selectedResult,
		currentIntent,
		activeSearchSource,
		setActiveSearch,
		setSelectedResult,
		setCurrentIntent,
		setAgentLastSearchQuery,
		agentLastSearchQuery,
	} = useIntentStore();
	const { setApiResults } = useApiStore();
	const { history, addHistory } = useHistoryStore();
	const { clearSelectionAndSearch } = useAddressFinderActions();

	// Local component state
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

	// Session token management
	const sessionTokenRef = useRef<string | null>(null);

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback((...args: unknown[]) => {
		// Use getState() to access store values without creating a reactive dependency
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[AddressFinder]", ...args);
		}
	}, []); // Empty dependency array makes this completely stable

	// Session token functions
	const getSessionToken = useCallback(() => {
		if (!sessionTokenRef.current) {
			sessionTokenRef.current = crypto.randomUUID();
			log("Generated new session token:", sessionTokenRef.current);
		}
		return sessionTokenRef.current;
	}, [log]);

	const clearSessionToken = useCallback(() => {
		if (sessionTokenRef.current) {
			log("Clearing session token:", sessionTokenRef.current);
			sessionTokenRef.current = null;
		}
	}, [log]);

	// ARCHITECTURAL FIX: Use a ref to break the dependency cycle
	const conversationRef = useRef<
		ReturnType<typeof useConversationManager>["conversation"] | null
	>(null);

	const {
		handleSelect,
		isValidating,
		validationError,
		handleClear,
		pendingRuralConfirmation,
		handleAcceptRuralAddress,
	} = useActionHandler({
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
	});

	const clientTools = useAddressFinderClientTools(
		getSessionToken,
		clearSessionToken,
	);
	const { conversation } = useConversationManager(clientTools);

	// Keep the ref updated with the latest conversation object.
	useEffect(() => {
		conversationRef.current = conversation;
	}, [conversation]);

	const { startRecording, stopRecording } = useAudioManager();

	// New handlers to correctly pass the conversation object
	const handleStartRecording = useCallback(() => {
		startRecording(conversation);
	}, [startRecording, conversation]);

	const handleStopRecording = useCallback(() => {
		stopRecording(conversation);
	}, [stopRecording, conversation]);

	// API Action
	const getPlaceSuggestionsAction = useAction(api.address.getPlaceSuggestions.getPlaceSuggestions);
	const getPlaceDetailsAction = useAction(api.address.getPlaceDetails.getPlaceDetails);

	// UNIFIED QUERY - Single source of truth for all API data
	// This hook is a reactive subscriber to the agent's search results.
	// By enabling it only during conversation, and preventing fetches, it ensures
	// the UI updates instantly when the agent's tools populate the React Query cache.
	const {
		data: suggestions = [], // Default to empty array
		isLoading,
		isError,
		error,
	} = useQuery<Suggestion[]>({
		queryKey: ["addressSearch", searchQuery],
		queryFn: () => {
			// This function should not fetch from the network. It's a reactive
			// wrapper around the cache entry that the agent's tools modify.
			return (
				queryClient.getQueryData<Suggestion[]>([
					"addressSearch",
					searchQuery,
				]) || []
			);
		},
		enabled: isRecording, // Only subscribe to agent suggestions when in conversation mode.
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	// REQUIRED & CONSOLIDATED: Sync React Query state to Zustand and then to Agent
	useEffect(() => {
		const suggestionsFromCache =
			queryClient.getQueryData<Suggestion[]>(["addressSearch", searchQuery]) ||
			[];
		setApiResults({
			suggestions: suggestionsFromCache,
			isLoading,
			error: error ? (error as Error).message : null,
			source: activeSearchSource,
		});
		syncToAgent();
	}, [
		isLoading,
		error,
		searchQuery,
		activeSearchSource,
		setApiResults,
		syncToAgent,
		queryClient,
	]);

	// Debounced search query effect
	useEffect(() => {
		const timer = setTimeout(() => {
			if (!isRecording && searchQuery !== debouncedSearchQuery) {
				setDebouncedSearchQuery(searchQuery);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery, isRecording, debouncedSearchQuery]);

	// --- SELECTION ACKNOWLEDGMENT STATE ---
	const [selectionAcknowledged, setSelectionAcknowledged] = useState(false);

	// Construct agent state for debugging
	const agentStateForDebug = useMemo(() => {
		const timestamp = Date.now();
		return {
			ui: {
				isRecording,
				isVoiceActive,
				currentIntent: currentIntent || "general",
				searchQuery,
				hasQuery: !!searchQuery,
			},
			api: {
				suggestions,
				isLoading,
				error: error ? (error as Error).message : null,
				hasResults: suggestions.length > 0,
				hasMultipleResults: suggestions.length > 1,
				resultCount: suggestions.length,
				source: isRecording ? "voice" : "manual",
			},
			selection: {
				selectedResult,
				hasSelection: !!selectedResult,
				selectedAddress: selectedResult?.description || null,
				selectedPlaceId: selectedResult?.placeId || null,
				selectionAcknowledged,
			},
			meta: {
				lastUpdate: timestamp,
				sessionActive: isRecording,
				agentRequestedManual,
				dataFlow: "API → React Query → Pillar Stores → Agent",
			},
		};
	}, [
		isRecording,
		isVoiceActive,
		currentIntent,
		searchQuery,
		suggestions,
		isLoading,
		error,
		selectedResult,
		agentRequestedManual,
		selectionAcknowledged,
	]);

	// Listen for selectionAcknowledged from agent state
	useEffect(() => {
		if (agentStateForDebug.selection.selectionAcknowledged) {
			setSelectionAcknowledged(true);
		}
	}, [agentStateForDebug.selection.selectionAcknowledged]);

	// Only clear suggestions after selectionAcknowledged is true
	useEffect(() => {
		if (selectedResult && selectionAcknowledged) {
			setApiResults({
				suggestions: [],
				isLoading: false,
				error: null,
				source: activeSearchSource,
			});
			setSelectionAcknowledged(false); // Reset for next cycle
		}
	}, [selectedResult, selectionAcknowledged, setApiResults, activeSearchSource]);

	// Event handlers
	const handleSelectResult = useCallback(
		async (result: Suggestion) => {
			let updatedResult = result;
			if ((result.lat === undefined || result.lng === undefined) && result.placeId) {
				const detailsRes = await getPlaceDetailsAction({ placeId: result.placeId });
				if (detailsRes.success && detailsRes.details?.geometry?.location) {
					updatedResult = {
						...result,
						lat: detailsRes.details.geometry.location.lat,
						lng: detailsRes.details.geometry.location.lng,
						// Optionally merge more details if needed
					};
				}
			}
			
			// CRITICAL: Update agent's suggestions context to include this selection
			// This prevents "stale context" issues by ensuring the agent can find the selection
			// Works for both manual selections and auto-selections
			const currentSearchQuery = searchQuery || result.description;
			const currentSuggestions = queryClient.getQueryData<Suggestion[]>([
				"addressSearch", 
				currentSearchQuery
			]) || [];
			
			// Add the selected result to the suggestions if it's not already there
			if (!currentSuggestions.find(s => s.placeId === result.placeId)) {
				const updatedSuggestions = [...currentSuggestions, updatedResult];
				queryClient.setQueryData(
					["addressSearch", currentSearchQuery],
					updatedSuggestions
				);
				log("🔧 Context sync: Added selection to agent's suggestions array");
			}
			
			handleSelect(updatedResult);
			setAgentLastSearchQuery(currentSearchQuery); // Use the current search query, not null
			queryClient.removeQueries({
				queryKey: ["addressSearch", result?.description],
				exact: true,
			});
			// --- CRITICAL: Immediately sync agent context after selection ---
			// This ensures the agent sees the confirmed selection in its context, per UNIFIED_ADDRESS_SYSTEM.md and state-management-strategy.md
			syncToAgent();
		},
		[handleSelect, setAgentLastSearchQuery, queryClient, getPlaceDetailsAction, syncToAgent, searchQuery, log]
	);

	const handleRequestAgentState = useCallback(() => {
		if (conversation.status === "connected") {
			const prompt =
				"Please report your current state. Use the getCurrentState tool to find out what it is, and then tell me the result.";
			log("🤖 Requesting agent state with prompt:", prompt);
			conversation.sendUserMessage?.(prompt);
			addHistory({ type: "user", text: "Requested current state from agent." });
		} else {
			log("⚠️ Cannot request agent state, conversation not connected.");
			addHistory({
				type: "system",
				text: "Error: Conversation not connected.",
			});
		}
	}, [conversation, addHistory, log]);

	// Dynamic UI visibility
	const shouldShowSuggestions =
		isRecording && suggestions.length > 0 && !selectedResult && !isLoading;
	const shouldShowManualForm = !isRecording || agentRequestedManual;
	const shouldShowSelectedResult = selectedResult && !isValidating;
	const shouldShowValidationStatus = isValidating || validationError;

	// After every successful search or autocomplete, update the agentLastSearchQuery
	const handleManualSearch = useCallback(
		async (query: string) => {
			// 1. Fetch suggestions from API
			const result = await getPlaceSuggestionsAction({ query });
			if (result.success) {
				// 2. Update agent context and cache
				setAgentLastSearchQuery(query);
				queryClient.setQueryData(["addressSearch", query], result.suggestions);
				// ...rest of logic (e.g., sync, UI updates)...
			} else {
				// Optionally handle error (e.g., show error to user)
				// log('Manual search failed:', result.error);
			}
		},
		[setAgentLastSearchQuery, queryClient, getPlaceSuggestionsAction],
	);

	// Defensive checks: if agentLastSearchQuery is null or the cache is empty, do not attempt selection and prompt for a new search.
	const canSelect = useMemo(() => {
		if (!agentLastSearchQuery) return false;
		const suggestions = queryClient.getQueryData<Suggestion[]>([
			"addressSearch",
			agentLastSearchQuery,
		]);
		return suggestions && suggestions.length > 0;
	}, [agentLastSearchQuery, queryClient]);

	// Add state for low-confidence single result
	const [showLowConfidence, setShowLowConfidence] = useState(false);

	// Helper to extract state abbreviation from a string
	function extractState(str: string): string | null {
		const match = str.match(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
		return match ? match[1].toUpperCase() : null;
	}

	// Auto-select or show search again for conversational flow
	// extractState is a stable function defined in the component scope and does not change between renders
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (
			isRecording &&
			!selectedResult &&
			suggestions.length === 1 &&
			!isLoading &&
			!isError
		) {
			const suggestion = suggestions[0];
			const userState = extractState(searchQuery);
			const resultState = extractState(suggestion.description);

			const highConfidence = (suggestion.confidence ?? 1) >= 0.8;
			const stateMatches = !userState || !resultState || userState === resultState;

			if (highConfidence && stateMatches) {
				handleSelectResult(suggestion);
				setShowLowConfidence(false);
			} else {
				setShowLowConfidence(true);
			}
		} else {
			setShowLowConfidence(false);
		}
	}, [isRecording, selectedResult, suggestions, isLoading, isError, handleSelectResult, searchQuery]);

	// Handler for Search Again button
	const handleSearchAgain = useCallback(() => {
		setShowLowConfidence(false);
		handleClear("user");
	}, [handleClear]);

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<div className="space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">Intelligent Address Finder v3</h1>
					<p className="text-sm text-gray-600">
						Voice-enabled address search with AI assistance
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Badge
						variant="outline"
						className={getIntentColor(currentIntent || "general")}
					>
						Intent: {currentIntent || "general"}
					</Badge>
					{isRecording && (
						<Badge
							variant="secondary"
							className="animate-pulse bg-red-100 text-red-800"
						>
							🎤 Conversation Active
							{agentRequestedManual && " + Manual Input"}
						</Badge>
					)}
				</div>

				{/* Rural Address Confirmation Prompt */}
				{pendingRuralConfirmation && (
					<Card className="border-yellow-300 bg-yellow-50">
						<CardHeader>
							<CardTitle>Rural Address Exception</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="mb-2">
								<strong>
									This address could not be confirmed at the property level, but
									appears to be a rural address.
								</strong>
								<br />
								<span>
									If you are sure this is correct, you may accept it anyway.
								</span>
								<div className="mt-2 text-sm text-gray-700">
									<div>
										<strong>Address:</strong>{" "}
										{pendingRuralConfirmation.validation.formattedAddress ||
											pendingRuralConfirmation.result.description}
									</div>
									<div>
										<strong>Validation granularity:</strong>{" "}
										{pendingRuralConfirmation.validation.validationGranularity}
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button onClick={handleAcceptRuralAddress}>
									Accept Anyway
								</Button>
								<Button
									variant="outline"
									onClick={() => {
										/* Clear pending state */ setSelectedResult(null);
										setActiveSearch({ query: "", source: "manual" });
										setAgentRequestedManual(false);
									}}
								>
									Cancel
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				<Card>
					<CardHeader>
						<CardTitle>Address Lookup</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<VoiceInputController
							isRecording={isRecording}
							isVoiceActive={isVoiceActive}
							startRecording={handleStartRecording}
							stopRecording={handleStopRecording}
						/>
						<Separator />

						{shouldShowManualForm ? (
							<div className="space-y-4">
								{agentRequestedManual && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="flex items-start gap-3">
											<div className="text-blue-600 text-lg">🤖 → 📝</div>
											<div>
												<p className="text-sm font-medium text-blue-800 mb-1">
													{isRecording
														? "Hybrid Mode Active"
														: "AI Agent requested manual input"}
												</p>
												<p className="text-xs text-blue-600">
													{isRecording
														? "You can now type addresses while continuing the voice conversation."
														: "The AI suggested typing your address manually for better accuracy."}
												</p>
											</div>
										</div>
									</div>
								)}

								<ManualSearchForm
									onSelect={handleSelectResult}
									disabled={isValidating}
								/>
							</div>
						) : (
							<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
								<p className="text-sm text-gray-600 mb-2">
									🤖 Voice conversation is active
								</p>
								<p className="text-xs text-gray-500">
									The AI will manage place suggestions through conversation. It
									can enable manual input if needed.
								</p>
							</div>
						)}

						{shouldShowValidationStatus && (
							<Card className="border-yellow-200 bg-yellow-50/50">
								<CardContent className="p-4">
									{isValidating && (
										<p className="font-semibold animate-pulse">
											Validating selected address...
										</p>
									)}
									{validationError && (
										<p className="text-red-600 font-semibold">
											Validation Error: {validationError}
										</p>
									)}
								</CardContent>
							</Card>
						)}

						{shouldShowSelectedResult && (
							<>
								<SelectedResultCard
									result={selectedResult}
									onClear={handleClear}
									lat={selectedResult?.lat}
									lng={selectedResult?.lng}
								/>
								{/* Suburb boundary map for suburb/locality results */}
								{selectedResult &&
									Array.isArray(selectedResult.types) &&
									(selectedResult.types.includes("locality") ||
										selectedResult.types.includes("suburb")) &&
									selectedResult.placeId && (
										<div className="mt-4">
											<SuburbBoundaryMap
												suburbName={selectedResult.description}
												placeId={selectedResult.placeId}
												mapId="a26a63faa4c27b9388a5618d"
											/>
										</div>
									)}
							</>
						)}
					</CardContent>
				</Card>

				{/* AI-Generated Suggestions Display */}
				{shouldShowSuggestions && !showLowConfidence && (
					<Card className="border-blue-200 bg-blue-50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								🤖 AI-Generated Place Suggestions
								<Badge variant="outline" className="bg-blue-100 text-blue-800">
									{suggestions.length} results
								</Badge>
							</CardTitle>
							<p className="text-sm text-blue-600">
								Agent-generated suggestions during conversation
							</p>
						</CardHeader>
						<CardContent>
							<SuggestionsDisplay
								suggestions={suggestions}
								onSelect={handleSelectResult}
								isLoading={isLoading}
								isError={isError}
								error={error}
							/>
						</CardContent>
					</Card>
				)}
				{shouldShowSuggestions && showLowConfidence && (
					<Card className="border-yellow-200 bg-yellow-50">
						<CardHeader>
							<CardTitle>Low Confidence Result</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="text-yellow-800">
								<p>
									I found one possible match, but I'm not confident it's correct:
								</p>
								<button
									type="button"
									onClick={() => handleSelectResult(suggestions[0])}
									className="font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer text-left"
								>
									{suggestions[0]?.description}
								</button>
								<p className="text-xs">(Confidence: {Math.round((suggestions[0]?.confidence ?? 0) * 100)}%)</p>
							</div>
							<div className="flex gap-2">
								<Button onClick={() => handleSelectResult(suggestions[0])} className="bg-green-600 hover:bg-green-700">
									Confirm This Result
								</Button>
								<Button onClick={handleSearchAgain} variant="outline">
									Search Again
								</Button>
								<Button
									onClick={() => setAgentRequestedManual(true)}
									variant="outline"
								>
									Manual Input
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				<HistoryPanel history={history} />

				<details className="group rounded-lg bg-gray-50 p-4 border border-gray-200">
					<summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
						Toggle Debug Panels
					</summary>
					<div className="mt-4 space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<StateDebugPanel
								suggestions={suggestions}
								isLoading={isLoading}
								isError={isError}
								error={error}
								debouncedSearchQuery={debouncedSearchQuery}
								agentRequestedManual={agentRequestedManual}
								sessionToken={sessionTokenRef.current}
								conversationStatus={conversation.status}
								conversationConnected={conversation.status === "connected"}
							/>
							<AgentStatePanel agentState={agentStateForDebug} />
						</div>
						<AgentDebugCopyPanel
							agentState={agentStateForDebug}
							history={history}
						/>
					</div>
				</details>

				<div className="text-center space-x-4">
					<Button onClick={handleRequestAgentState} variant="secondary">
						Get Agent State
					</Button>
					<Button onClick={() => handleClear("user")} variant="outline">
						Clear All State
					</Button>
				</div>
			</div>
		</div>
	);
}
