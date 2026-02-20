import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAddressSelectionStore } from "~/stores/addressSelectionStore";
import { useApiStore } from "~/stores/apiStore";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import { AddressSearchService } from "../address-search/AddressSearchService";
import type {
	SearchContext,
	SearchResult,
	SelectionContext,
	SelectionResult,
	ShowOptionsConfig,
	ShowOptionsResult,
} from "../address-search/types";

/**
 * React hook that provides access to the AddressSearchService.
 *
 * This hook:
 * 1. Initializes the service singleton on first use
 * 2. Provides stable callbacks for service methods
 * 3. Returns reactive state from stores
 *
 * USAGE:
 * ```tsx
 * function MyComponent() {
 *   const {
 *     getOptionsForCurrentSelection,
 *     canShowOptionsAgain,
 *     showOptionsAgain,
 *     selectedResult
 *   } = useAddressSearchService();
 *
 *   if (canShowOptionsAgain()) {
 *     const options = getOptionsForCurrentSelection();
 *   }
 * }
 * ```
 */
export function useAddressSearchService() {
	const queryClient = useQueryClient();
	const initRef = useRef(false);

	// Initialize service on first render
	useEffect(() => {
		if (initRef.current) return;
		if (AddressSearchService.isInitialized()) {
			initRef.current = true;
			return;
		}

		initRef.current = true;

		AddressSearchService.initialize(queryClient, {
			intentStore: useIntentStore,
			uiStore: useUIStore,
			apiStore: useApiStore,
			searchHistoryStore: useSearchHistoryStore,
			addressSelectionStore: useAddressSelectionStore,
		});
	}, [queryClient]);

	// Get service instance (safe after initialization)
	const getService = useCallback((): AddressSearchService | null => {
		try {
			return AddressSearchService.getInstance();
		} catch {
			// Service not yet initialized, return null
			return null;
		}
	}, []);

	// =========================================================================
	// STABLE CALLBACKS FOR SERVICE METHODS
	// =========================================================================

	const recordSearchResults = useCallback(
		(
			query: string,
			suggestions: Suggestion[],
			context: SearchContext,
		): SearchResult => {
			const service = getService();
			if (!service) {
				return {
					success: false,
					error: {
						name: "AddressSearchError",
						message: "Service not initialized",
						code: "STATE_MISSING_DEPENDENCY",
						recoverable: false,
						toUserMessage: () => "Service not initialized",
					},
				};
			}
			return service.recordSearchResults(query, suggestions, context);
		},
		[getService],
	);

	const recordSelection = useCallback(
		(suggestion: Suggestion, context?: SelectionContext): SelectionResult => {
			const service = getService();
			if (!service) {
				return {
					success: false,
					error: {
						name: "AddressSearchError",
						message: "Service not initialized",
						code: "STATE_MISSING_DEPENDENCY",
						recoverable: false,
						toUserMessage: () => "Service not initialized",
					},
				};
			}
			return service.recordSelection(suggestion, context);
		},
		[getService],
	);

	const getOptionsForCurrentSelection = useCallback((): Suggestion[] => {
		const service = getService();
		return service?.getOptionsForCurrentSelection() ?? [];
	}, [getService]);

	const canShowOptionsAgain = useCallback((): boolean => {
		const service = getService();
		return service?.canShowOptionsAgain() ?? false;
	}, [getService]);

	const getShowOptionsConfig = useCallback((): ShowOptionsConfig => {
		const service = getService();
		return (
			service?.getShowOptionsConfig() ?? {
				canShow: false,
				optionsCount: 0,
			}
		);
	}, [getService]);

	const showOptionsAgain = useCallback((): ShowOptionsResult => {
		const service = getService();
		return service?.showOptionsAgain() ?? { success: false };
	}, [getService]);

	const hideOptions = useCallback(() => {
		const service = getService();
		service?.hideOptions();
	}, [getService]);

	const clearCurrentSearch = useCallback(() => {
		const service = getService();
		service?.clearCurrentSearch();
	}, [getService]);

	const getStateSnapshot = useCallback(() => {
		const service = getService();
		return service?.getStateSnapshot() ?? null;
	}, [getService]);

	// =========================================================================
	// REACTIVE STATE FROM STORES
	// =========================================================================

	const selectedResult = useIntentStore((s) => s.selectedResult);
	const searchQuery = useIntentStore((s) => s.searchQuery);
	const agentLastSearchQuery = useIntentStore((s) => s.agentLastSearchQuery);
	const currentIntent = useIntentStore((s) => s.currentIntent);
	const showingOptionsAfterConfirmation = useUIStore(
		(s) => s.showingOptionsAfterConfirmation,
	);
	const suggestions = useApiStore((s) => s.apiResults.suggestions);
	const isLoading = useApiStore((s) => s.apiResults.isLoading);

	// =========================================================================
	// DERIVED STATE
	// =========================================================================

	const showOptionsConfig = useMemo(() => {
		return getShowOptionsConfig();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [getShowOptionsConfig, selectedResult, agentLastSearchQuery]);

	// =========================================================================
	// RETURN PUBLIC API
	// =========================================================================

	return {
		// Service methods (stable callbacks)
		recordSearchResults,
		recordSelection,
		getOptionsForCurrentSelection,
		canShowOptionsAgain,
		getShowOptionsConfig,
		showOptionsAgain,
		hideOptions,
		clearCurrentSearch,
		getStateSnapshot,

		// Reactive state
		selectedResult,
		searchQuery,
		agentLastSearchQuery,
		currentIntent,
		showingOptionsAfterConfirmation,
		suggestions,
		isLoading,
		showOptionsConfig,
	};
}
