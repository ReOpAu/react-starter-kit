// Address Search Service
export {
	AddressSearchService,
	AddressCache,
	AddressSearchError,
	createCacheError,
	createOptionsError,
	createSearchError,
	createSelectionError,
	createStateError,
	createValidationError,
	type CacheMetrics,
	type PerformanceMetrics,
	type AlertType,
	type AlertSeverity,
	type AlertEvent,
	type AlertConfig,
} from "./address-search";

export type {
	AddressSearchErrorCode,
	AddressSearchErrorType,
	AddressSelectionEntry,
	CacheKey,
	CacheOptions,
	CacheResult,
	EnrichmentCacheKey,
	SearchContext,
	SearchHistoryEntry,
	SearchResult,
	SearchState,
	SelectionContext,
	SelectionResult,
	SelectionState,
	ServiceConfig,
	ServiceStateSnapshot,
	ShowOptionsConfig,
	ShowOptionsResult,
	TelemetryEvent,
	ValidationResult,
} from "./address-search";

// Hooks
export { useAddressSearchService } from "./hooks/useAddressSearchService";
