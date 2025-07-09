import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActionHandler } from "~/hooks/useActionHandler";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useAddressFinderClientTools } from "~/hooks/useAddressFinderClientTools";
import { useAgentSync } from "~/hooks/useAgentSync";
import { useAudioManager } from "~/hooks/useAudioManager";
import { useConversationManager } from "~/hooks/useConversationManager";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { Suggestion } from "~/stores/types";
import type { LocationIntent, Mode } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import {
	classifyIntent,
	classifySelectedResult,
} from "~/utils/addressFinderUtils";

interface AddressFinderBrainProps {
	children: (brainState: AddressFinderBrainState) => React.ReactNode;
}

export interface AddressFinderBrainState {
	// Core state
	suggestions: Suggestion[];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	selectedResult: Suggestion | null;
	searchQuery: string;
	currentIntent: LocationIntent | null;
	debouncedSearchQuery: string;

	// UI state
	isRecording: boolean;
	isVoiceActive: boolean;
	agentRequestedManual: boolean;
	selectionAcknowledged: boolean;
	isValidating: boolean;
	validationError: string | null;
	pendingRuralConfirmation: null | { result: Suggestion; validation: any };

	// Memory state
	searchHistory: SearchHistoryEntry[];
	addressSelections: AddressSelectionEntry[];

	// Handlers
	handleSelectResult: (result: Suggestion) => void;
	handleStartRecording: () => void;
	handleStopRecording: () => void;
	handleClear: (source: "user" | "agent") => void;
	handleAcceptRuralAddress: () => void;
	handleRecallPreviousSearch: (entry: SearchHistoryEntry) => void;
	handleRecallConfirmedSelection: (entry: AddressSelectionEntry) => void;
	handleRequestAgentState: () => void;
	handleManualTyping: (query: string) => void;

	// Computed state
	shouldShowSuggestions: boolean;
	shouldShowManualForm: boolean;
	shouldShowSelectedResult: boolean;
	shouldShowValidationStatus: boolean;
	showLowConfidence: boolean;
	
	// Auto-correction state
	autoCorrection: {
		hasCorrection: boolean;
		suburbChanged: boolean;
		postcodeChanged: boolean;
		stateChanged: boolean;
		originalSuburb: string | null;
		correctedSuburb: string | null;
		originalPostcode: string | null;
		correctedPostcode: string | null;
		originalState: string | null;
		correctedState: string | null;
	} | null;

	// Session management
	sessionToken: string | null;
	conversationStatus: string;

	// Debug state
	agentStateForDebug: any;
	history: any[];
}

export function AddressFinderBrain({ children }: AddressFinderBrainProps) {
	const queryClient = useQueryClient();
	const { syncToAgent } = useAgentSync();

	// State from pillar-aligned stores
	const {
		isRecording,
		isVoiceActive,
		agentRequestedManual,
		isLoggingEnabled,
		setAgentRequestedManual,
		selectionAcknowledged,
		setSelectionAcknowledged,
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
	const { addSearchToHistory } = useSearchHistoryStore();
	const searchHistory = useSearchHistoryStore((s) => s.searchHistory);
	const addressSelections = useAddressSelectionStore(
		(s) => s.addressSelections,
	);
	const addAddressSelection = useAddressSelectionStore(
		(s) => s.addAddressSelection,
	);

	// Local component state
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
	const [isRecallMode, setIsRecallMode] = useState(false);
	const [showLowConfidence, setShowLowConfidence] = useState(false);
	const [preserveIntent, setPreserveIntent] = useState<LocationIntent | null>(
		null,
	);
	const [currentAutoCorrection, setCurrentAutoCorrection] = useState<{
		hasCorrection: boolean;
		suburbChanged: boolean;
		postcodeChanged: boolean;
		stateChanged: boolean;
		originalSuburb: string | null;
		correctedSuburb: string | null;
		originalPostcode: string | null;
		correctedPostcode: string | null;
		originalState: string | null;
		correctedState: string | null;
	} | null>(null);

	// Session token management
	const sessionTokenRef = useRef<string | null>(null);

	// Logging utility
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[AddressFinderBrain]", ...args);
		}
	}, []);

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

	// Conversation management
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

	// API actions
	const getPlaceDetailsAction = useAction(
		api.address.getPlaceDetails.getPlaceDetails,
	);
	const getPlaceSuggestionsAction = useAction(
		api.address.getPlaceSuggestions.getPlaceSuggestions,
	);

	// Result selection handler
	const handleSelectResult = useCallback(
		async (result: Suggestion) => {
			let updatedResult = result;
			if (
				(result.lat === undefined || result.lng === undefined) &&
				result.placeId
			) {
				const detailsRes = await getPlaceDetailsAction({
					placeId: result.placeId,
				});
				if (detailsRes.success && detailsRes.details?.geometry?.location) {
					updatedResult = {
						...result,
						lat: detailsRes.details.geometry.location.lat,
						lng: detailsRes.details.geometry.location.lng,
					};
				}
			}
			const currentSearchQuery = searchQuery || result.description;
			const currentSuggestions =
				queryClient.getQueryData<Suggestion[]>([
					"addressSearch",
					currentSearchQuery,
				]) || [];
			if (!currentSuggestions.find((s) => s.placeId === result.placeId)) {
				const updatedSuggestions = [...currentSuggestions, updatedResult];
				queryClient.setQueryData(
					["addressSearch", currentSearchQuery],
					updatedSuggestions,
				);
				log("🔧 Context sync: Added selection to agent's suggestions array");
			}
			handleSelect(updatedResult);

			// Preserve intent if this is a recall, otherwise update based on selection
			if (preserveIntent) {
				setCurrentIntent(preserveIntent);
				setPreserveIntent(null);
			} else {
				// Update intent based on the selected result
				const resultIntent = classifySelectedResult(updatedResult);
				setCurrentIntent(resultIntent);
			}

			log(`🔧 Storing selection - originalQuery: "${currentSearchQuery}", selectedAddress.description: "${updatedResult.description}", selectedAddress.displayText: "${updatedResult.displayText}"`);
			addAddressSelection({
				originalQuery: currentSearchQuery,
				selectedAddress: updatedResult,
				context: {
					mode: isRecording ? "voice" : "manual",
					intent: currentIntent ?? "general",
				},
			});
			setAgentLastSearchQuery(currentSearchQuery);
			queryClient.removeQueries({
				queryKey: ["addressSearch", result?.description],
				exact: true,
			});
			syncToAgent();
			// Note: Don't add selections to search history
			// Only the useEffect below adds searches with multiple results to history
			setIsRecallMode(false);
		},
		[
			handleSelect,
			setAgentLastSearchQuery,
			queryClient,
			syncToAgent,
			searchQuery,
			log,
			isRecording,
			currentIntent,
			getPlaceDetailsAction,
			isRecallMode,
			addAddressSelection,
			preserveIntent,
			setPreserveIntent,
			classifySelectedResult,
		],
	);

	// Audio and conversation management
	const clientTools = useAddressFinderClientTools(
		getSessionToken,
		clearSessionToken,
		handleSelectResult,
	);
	const { conversation } = useConversationManager(clientTools);

	useEffect(() => {
		conversationRef.current = conversation;
	}, [conversation]);

	const { startRecording, stopRecording } = useAudioManager();

	const handleStartRecording = useCallback(() => {
		startRecording(conversation);
	}, [startRecording, conversation]);

	const handleStopRecording = useCallback(() => {
		stopRecording(conversation);
	}, [stopRecording, conversation]);

	// Query management
	const {
		data: suggestions = [],
		isLoading,
		isError,
		error,
	} = useQuery<Suggestion[]>({
		queryKey: ["addressSearch", searchQuery],
		queryFn: () => {
			return (
				queryClient.getQueryData<Suggestion[]>([
					"addressSearch",
					searchQuery,
				]) || []
			);
		},
		enabled: isRecording,
		staleTime: Number.POSITIVE_INFINITY,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});

	// Sync React Query state to stores
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

		// Add searches with multiple results to search history
		if (searchQuery && suggestionsFromCache.length >= 2 && !isRecallMode) {
			addSearchToHistory({
				query: searchQuery,
				resultCount: suggestionsFromCache.length,
				context: {
					mode: activeSearchSource === "voice" ? "voice" : "manual",
					intent: currentIntent ?? "general",
				},
			});
		}

		syncToAgent();
	}, [
		isLoading,
		error,
		searchQuery,
		activeSearchSource,
		setApiResults,
		syncToAgent,
		queryClient,
		addSearchToHistory,
		isRecallMode,
		currentIntent,
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

	// Dynamic intent classification based on user typing
	useEffect(() => {
		if (
			searchQuery &&
			searchQuery.length >= 2 &&
			!isRecallMode &&
			!selectedResult &&
			!isRecording
		) {
			const detectedIntent = classifyIntent(searchQuery);
			if (detectedIntent !== currentIntent) {
				setCurrentIntent(detectedIntent);
			}
		}
	}, [
		searchQuery,
		isRecallMode,
		selectedResult,
		isRecording,
		currentIntent,
		setCurrentIntent,
	]);

	// Helper functions
	const extractState = useCallback((str: string): string | null => {
		const match = str.match(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
		return match ? match[1].toUpperCase() : null;
	}, []);

	const extractSuburb = useCallback((str: string): string | null => {
		const parts = str.split(',');
		if (parts.length >= 2) {
			// Get the part before the state/postcode
			const suburbPart = parts[1].trim();
			const suburbMatch = suburbPart.split(' ')[0]; // First word after comma
			return suburbMatch || null;
		}
		return null;
	}, []);

	const extractPostcode = useCallback((str: string): string | null => {
		const match = str.match(/\b\d{4}\b/);
		return match ? match[0] : null;
	}, []);

	const detectAutoCorrection = useCallback((input: string, output: string) => {
		const inputSuburb = extractSuburb(input);
		const outputSuburb = extractSuburb(output);
		const inputPostcode = extractPostcode(input);
		const outputPostcode = extractPostcode(output);
		const inputState = extractState(input);
		const outputState = extractState(output);

		// Check for suburb changes (low consequence)
		const suburbChanged = Boolean(inputSuburb && outputSuburb && 
			inputSuburb.toLowerCase() !== outputSuburb.toLowerCase());

		// Check for postcode changes (medium consequence)  
		const postcodeChanged = Boolean(inputPostcode && outputPostcode && 
			inputPostcode !== outputPostcode);

		// Check for state changes (high consequence)
		const stateChanged = Boolean(inputState && outputState && 
			inputState !== outputState);

		// Check for significant address reformatting
		const inputWords = input.toLowerCase().split(/\s+/);
		const outputWords = output.toLowerCase().split(/\s+/);
		const sharedWords = inputWords.filter(word => 
			outputWords.some(outWord => outWord.includes(word) || word.includes(outWord))
		);
		const similarityRatio = sharedWords.length / Math.max(inputWords.length, 1);
		const significantReformatting = similarityRatio < 0.6;

		return {
			hasCorrection: suburbChanged || postcodeChanged || stateChanged || significantReformatting,
			suburbChanged,
			postcodeChanged,
			stateChanged,
			significantReformatting,
			originalSuburb: inputSuburb,
			correctedSuburb: outputSuburb,
			originalPostcode: inputPostcode,
			correctedPostcode: outputPostcode,
			originalState: inputState,
			correctedState: outputState,
			similarityRatio,
		};
	}, [extractSuburb, extractPostcode, extractState]);

	// Enhanced auto-select logic with auto-correction detection
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

			// === DETECT AUTO-CORRECTIONS ===
			const autoCorrection = detectAutoCorrection(searchQuery, suggestion.description);
			
			// === ADAPTIVE CONFIDENCE THRESHOLDS ===
			const getConfidenceThreshold = () => {
				const baseThreshold = isRecording ? 0.65 : 0.72; // Voice vs manual

				// Intent-based adjustments
				switch (currentIntent) {
					case "address":
						return baseThreshold + 0.05; // Higher bar for addresses
					case "suburb":
						return baseThreshold - 0.03; // More tolerant for suburbs
					case "street":
						return baseThreshold; // Standard threshold
					case "general":
						return baseThreshold - 0.08; // Most tolerant for general
					default:
						return baseThreshold;
				}
			};

			const baseConfidence = suggestion.confidence ?? 0.5;
			const confidenceThreshold = getConfidenceThreshold();
			
			// === APPLY AUTO-CORRECTION PENALTIES ===
			let adjustedConfidence = baseConfidence;
			
			if (autoCorrection.hasCorrection) {
				// Apply penalties based on consequence level
				if (autoCorrection.stateChanged) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.4); // Heavy penalty for state changes (high consequence)
					log(`🔄 State auto-correction detected: ${autoCorrection.originalState} → ${autoCorrection.correctedState}`);
				}
				
				if (autoCorrection.postcodeChanged) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.1); // Medium penalty for postcode changes
					log(`🔄 Postcode auto-correction detected: ${autoCorrection.originalPostcode} → ${autoCorrection.correctedPostcode}`);
				}
				
				if (autoCorrection.suburbChanged) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.05); // Light penalty for suburb changes (low consequence)
					log(`🔄 Suburb auto-correction detected: ${autoCorrection.originalSuburb} → ${autoCorrection.correctedSuburb}`);
				}
				
				if (autoCorrection.significantReformatting) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.02); // Minimal penalty for reformatting
					log(`🔄 Address reformatting detected: ${Math.round(autoCorrection.similarityRatio * 100)}% similarity`);
				}
			}

			const highConfidence = adjustedConfidence >= confidenceThreshold;
			const stateMatches = !userState || !resultState || userState === resultState;

			// === ENHANCED AUTO-SELECTION LOGIC ===
			if (highConfidence && stateMatches) {
				// Store auto-correction information
				setCurrentAutoCorrection(autoCorrection);
				
				// Check if suburb was corrected - show confirmation instead of auto-selecting
				if (autoCorrection.suburbChanged) {
					log(`🔄 Suburb correction detected: ${autoCorrection.originalSuburb} → ${autoCorrection.correctedSuburb} - showing confirmation`);
					setShowLowConfidence(true); // Show confirmation UI for suburb changes
				} else {
					// Auto-select without suburb corrections
					const logMessage = autoCorrection.hasCorrection 
						? `🎯 Auto-selecting with minor correction (confidence ${Math.round(adjustedConfidence * 100)}%)` 
						: `🎯 Auto-selecting with confidence ${Math.round(adjustedConfidence * 100)}% (threshold: ${Math.round(confidenceThreshold * 100)}%)`;
					
					log(logMessage);
					
					// Create a suggestion with the corrected description as the display text
					const suggestionWithDescription = {
						...suggestion,
						// Use the Google-corrected description instead of the original transcription
						displayText: suggestion.description
					};
					
					log(`🔧 Auto-correction: Setting displayText to "${suggestion.description}" for input "${searchQuery}"`);
					handleSelectResult(suggestionWithDescription);
					setShowLowConfidence(false);
				}
			} else {
				// Show low confidence UI with detailed reasoning
				const reasons = [];
				if (adjustedConfidence < confidenceThreshold) {
					reasons.push(`confidence ${Math.round(adjustedConfidence * 100)}% < ${Math.round(confidenceThreshold * 100)}%`);
				}
				if (!stateMatches) {
					reasons.push(`state mismatch (${userState} vs ${resultState})`);
				}
				if (autoCorrection.hasCorrection) {
					reasons.push('auto-correction detected');
				}
				
				log(`⚠️ Low confidence: ${reasons.join(', ')}`);
				setShowLowConfidence(true);
			}
		} else {
			setShowLowConfidence(false);
			setCurrentAutoCorrection(null); // Clear auto-correction when not showing suggestions
		}
	}, [
		isRecording,
		selectedResult,
		suggestions,
		isLoading,
		isError,
		handleSelectResult,
		searchQuery,
		extractState,
		detectAutoCorrection,
		log,
		currentIntent,
	]);

	// Recall handlers
	const handleRecallPreviousSearch = useCallback(
		async (entry: SearchHistoryEntry) => {
			setActiveSearch({ query: entry.query, source: entry.context.mode });
			setAgentLastSearchQuery(entry.query);
			setSelectedResult(null);
			setDebouncedSearchQuery(entry.query);
			setIsRecallMode(true);

			const newResults = await getPlaceSuggestionsAction({
				query: entry.query,
				intent: entry.context.intent as
					| "general"
					| "suburb"
					| "street"
					| "address"
					| undefined,
				isAutocomplete: false,
				sessionToken: undefined,
			});
			setApiResults({
				suggestions: newResults.success ? newResults.suggestions : [],
				isLoading: false,
				error: newResults.success ? null : newResults.error,
				source: entry.context.mode,
			});
			queryClient.setQueryData(
				["addressSearch", entry.query],
				newResults.success ? newResults.suggestions : [],
			);

			// Set intent AFTER API results to ensure it sticks
			setCurrentIntent(entry.context.intent as LocationIntent);
			syncToAgent();
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			syncToAgent,
			queryClient,
			getPlaceSuggestionsAction,
		],
	);

	const handleRecallConfirmedSelection = useCallback(
		(entry: AddressSelectionEntry) => {
			setActiveSearch({
				query: entry.originalQuery,
				source: entry.context.mode as Mode,
			});
			setPreserveIntent(entry.context.intent as LocationIntent);
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.originalQuery);
			setApiResults({
				suggestions: [entry.selectedAddress],
				isLoading: false,
				error: null,
				source: entry.context.mode as Mode,
			});
			setSelectedResult(entry.selectedAddress);
			queryClient.setQueryData(
				["addressSearch", entry.originalQuery],
				[entry.selectedAddress],
			);
			setDebouncedSearchQuery(entry.originalQuery);
			syncToAgent();
			setIsRecallMode(true);
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			syncToAgent,
			queryClient,
		],
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

	// Handle typing in manual search form
	const handleManualTyping = useCallback(
		(query: string) => {
			if (!isRecallMode && !selectedResult) {
				setActiveSearch({ query, source: "manual" });
			}
		},
		[setActiveSearch, isRecallMode, selectedResult],
	);

	// Computed state
	const shouldShowSuggestions =
		suggestions.length > 0 && !selectedResult && !isLoading;
	const shouldShowManualForm = !isRecording || agentRequestedManual;
	const shouldShowSelectedResult = Boolean(selectedResult && !isValidating);
	const shouldShowValidationStatus = Boolean(isValidating || validationError);

	// Debug state
	const agentStateForDebug = {
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
			lastUpdate: Date.now(),
			sessionActive: isRecording,
			agentRequestedManual,
			dataFlow: "API → React Query → Pillar Stores → Agent",
		},
	};

	const brainState: AddressFinderBrainState = {
		// Core state
		suggestions,
		isLoading,
		isError,
		error,
		selectedResult,
		searchQuery,
		currentIntent,
		debouncedSearchQuery,

		// UI state
		isRecording,
		isVoiceActive,
		agentRequestedManual,
		selectionAcknowledged,
		isValidating,
		validationError,
		pendingRuralConfirmation,

		// Memory state
		searchHistory,
		addressSelections,

		// Handlers
		handleSelectResult,
		handleStartRecording,
		handleStopRecording,
		handleClear,
		handleAcceptRuralAddress,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		handleRequestAgentState,
		handleManualTyping,

		// Computed state
		shouldShowSuggestions,
		shouldShowManualForm,
		shouldShowSelectedResult,
		shouldShowValidationStatus,
		showLowConfidence,
		
		// Auto-correction state
		autoCorrection: currentAutoCorrection,

		// Session management
		sessionToken: sessionTokenRef.current,
		conversationStatus: conversation.status,

		// Debug state
		agentStateForDebug,
		history,
	};

	return <>{children(brainState)}</>;
}
