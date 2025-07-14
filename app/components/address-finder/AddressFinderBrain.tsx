import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActionHandler } from "~/hooks/useActionHandler";
import { useAddressAutoSelection } from "~/hooks/useAddressAutoSelection";
import { useAddressFinderActions } from "~/hooks/useAddressFinderActions";
import { useAddressRecall } from "~/hooks/useAddressRecall";
import { useAddressSession } from "~/hooks/useAddressSession";
import { useAgentSync } from "~/elevenlabs/hooks/useAgentSync";
import { useConversationLifecycle } from "~/hooks/useConversationLifecycle";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useHistoryStore } from "~/stores/historyStore";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import {
	classifyIntent,
	classifySelectedResult,
} from "~/utils/addressFinderUtils";
import { useVelocityIntentClassification } from "~/hooks/useVelocityIntentClassification";

// Constants
const DEBOUNCE_DELAY = 300;

interface AddressFinderBrainProps {
	children: (handlers: AddressFinderBrainHandlers) => React.ReactNode;
}

export interface AddressFinderBrainHandlers {
	// Core handlers
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
	autoCorrection: any;

	// Validation state
	isValidating: boolean;
	validationError: string | null;
	pendingRuralConfirmation: any;

	// Session management
	sessionToken: string | null;
	conversationStatus: string;

	// Debug state
	agentStateForDebug: any;
}

export function AddressFinderBrain({ children }: AddressFinderBrainProps) {
	const queryClient = useQueryClient();
	const { syncToAgent } = useAgentSync();

	// State from stores
	const {
		isRecording,
		agentRequestedManual,
		setAgentRequestedManual,
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
	} = useIntentStore();

	const { setApiResults } = useApiStore();
	const { addHistory } = useHistoryStore();
	const { clearSelectionAndSearch } = useAddressFinderActions();
	const { addSearchToHistory } = useSearchHistoryStore();
	const addAddressSelection = useAddressSelectionStore(
		(s) => s.addAddressSelection,
	);

	// Local component state
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

	// Custom hooks for extracted logic
	const { getSessionToken, clearSessionToken, getCurrentSessionToken } =
		useAddressSession();

	const {
		isRecallMode,
		preserveIntent,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		resetRecallMode,
		setPreserveIntent,
	} = useAddressRecall();

	// Logging utility
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[AddressFinderBrain]", ...args);
		}
	}, []);

	// Temporary conversation ref for useActionHandler
	const conversationRef = useRef<any>(null);

	// API actions
	const getPlaceDetailsAction = useAction(
		api.address.getPlaceDetails.getPlaceDetails,
	);

	const {
		handleSelectResult: consolidatedHandleSelectResult,
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
	});

	// Use the consolidated selection handler from useActionHandler
	const handleSelectResult = consolidatedHandleSelectResult;

	// Initialize conversation lifecycle with the handleSelectResult
	const {
		conversation,
		handleStartRecording,
		handleStopRecording,
		handleRequestAgentState,
	} = useConversationLifecycle({
		getSessionToken,
		clearSessionToken,
		handleSelectResult,
	});

	// Update the conversation ref for useActionHandler
	useEffect(() => {
		conversationRef.current = conversation;
	}, [conversation]);

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

	// Auto-selection logic
	const { showLowConfidence, autoCorrection } = useAddressAutoSelection({
		suggestions,
		isLoading,
		isError,
		onSelectResult: handleSelectResult,
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
		}, DEBOUNCE_DELAY);
		return () => clearTimeout(timer);
	}, [searchQuery, isRecording, debouncedSearchQuery]);

	// Velocity-based intent classification for manual typing
	const {
		shouldClassify: shouldClassifyByVelocity,
		detectedIntent: velocityDetectedIntent,
		typingState,
	} = useVelocityIntentClassification(
		searchQuery || "",
		currentIntent || "general",
		{
			enabled: !isRecording && !isRecallMode && !selectedResult && !!searchQuery && searchQuery.length >= 2,
			velocityChangeThreshold: 2.0,
			minBaselineKeystrokes: 3,
			maxIntervalForBaseline: 1000,
		}
	);

	// Apply velocity-based intent classification
	useEffect(() => {
		if (shouldClassifyByVelocity && velocityDetectedIntent) {
			const storeIntent = useIntentStore.getState().currentIntent;
			if (velocityDetectedIntent !== storeIntent) {
				log(`🚀 Velocity-based classification: "${searchQuery}" → "${velocityDetectedIntent}" (was: "${storeIntent}")`);
				console.log('🏪 Before setCurrentIntent - store intent:', storeIntent, 'new intent:', velocityDetectedIntent);
				setCurrentIntent(velocityDetectedIntent);
				// Force a delay to check if the store actually updated
				setTimeout(() => {
					console.log('🏪 After setCurrentIntent (delayed) - store intent:', useIntentStore.getState().currentIntent);
				}, 50);
			}
		}
	}, [shouldClassifyByVelocity, velocityDetectedIntent, searchQuery, log]);

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
			isVoiceActive: false, // Will be provided by the store
			currentIntent: currentIntent || "general",
			searchQuery,
			hasQuery: !!searchQuery,
			velocityClassification: {
				enabled: !isRecording && !isRecallMode && !selectedResult,
				typingState,
				shouldClassify: shouldClassifyByVelocity,
				detectedIntent: velocityDetectedIntent,
			},
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
			selectionAcknowledged: false, // Will be provided by the store
		},
		meta: {
			lastUpdate: Date.now(),
			sessionActive: isRecording,
			agentRequestedManual,
			dataFlow: "API → React Query → Pillar Stores → Agent",
		},
	};

	const handlers: AddressFinderBrainHandlers = {
		// Core handlers
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
		autoCorrection,

		// Validation state
		isValidating,
		validationError,
		pendingRuralConfirmation,

		// Session management
		sessionToken: getCurrentSessionToken(),
		conversationStatus: conversation.status,

		// Debug state
		agentStateForDebug,
	};

	return <>{children(handlers)}</>;
}
