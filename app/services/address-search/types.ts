import type { LocationIntent, Mode, Suggestion } from "~/stores/types";

/**
 * Normalized cache key that ensures consistency across all cache operations.
 * This is the SINGLE SOURCE OF TRUTH for cache key generation.
 */
export type CacheKey = `addressSearch:${string}`;

/**
 * Enrichment cache key for place details.
 */
export type EnrichmentCacheKey = `placeDetails:${string}`;

/**
 * Context provided when initiating a search.
 */
export interface SearchContext {
	/** Source of the search request */
	source: Mode;
	/** Current detected intent */
	intent?: LocationIntent;
	/** Whether this is an autocomplete request (incremental typing) */
	isAutocomplete?: boolean;
	/** Session token for Google Places billing optimization */
	sessionToken?: string;
}

/**
 * Immutable state representing the current search.
 * This is preserved until explicitly cleared or a new search begins.
 */
export interface SearchState {
	/** The normalized query string */
	readonly query: string;
	/** Normalized cache key for this search */
	readonly cacheKey: CacheKey;
	/** All suggestions returned from this search */
	readonly suggestions: ReadonlyArray<Suggestion>;
	/** The source that initiated this search */
	readonly source: Mode;
	/** The detected/classified intent */
	readonly intent: LocationIntent;
	/** Timestamp when search was performed */
	readonly timestamp: number;
	/** Number of results returned */
	readonly resultCount: number;
}

/**
 * Result of a search operation.
 */
export interface SearchResult {
	/** Whether the search was successful */
	success: boolean;
	/** The search state if successful */
	searchState?: SearchState;
	/** Error details if unsuccessful */
	error?: AddressSearchErrorType;
	/** Number of retry attempts made */
	attempts?: number;
}

/**
 * Context provided when making a selection.
 */
export interface SelectionContext {
	/** Whether this selection came from an agent tool call */
	isAgentSelection?: boolean;
	/** Whether to skip validation (for recalled selections) */
	skipValidation?: boolean;
	/** Preserved intent from recall mode */
	preserveIntent?: LocationIntent;
}

/**
 * Immutable state representing the current selection.
 */
export interface SelectionState {
	/** The selected suggestion */
	readonly selectedSuggestion: Suggestion;
	/** The original query that produced this selection */
	readonly originalQuery: string;
	/** Cache key that contains the original options */
	readonly originalCacheKey: CacheKey;
	/** The source of the selection */
	readonly source: Mode;
	/** The classified intent at time of selection */
	readonly intent: LocationIntent;
	/** Timestamp of selection */
	readonly timestamp: number;
	/** Whether this selection has been validated */
	readonly isValidated: boolean;
	/** Whether the agent has acknowledged this selection */
	readonly isAcknowledged: boolean;
}

/**
 * Result of a selection operation.
 */
export interface SelectionResult {
	/** Whether the selection was successful */
	success: boolean;
	/** The selection state if successful */
	selectionState?: SelectionState;
	/** Whether validation is pending (rural exception) */
	pendingRuralConfirmation?: boolean;
	/** Error details if unsuccessful */
	error?: AddressSearchErrorType;
}

/**
 * Configuration for the "show options again" capability.
 * Encapsulates the business logic for this feature.
 */
export interface ShowOptionsConfig {
	/** Whether options can be shown (has confirmed selection AND cached options) */
	canShow: boolean;
	/** The cache key containing the original options */
	optionsCacheKey?: CacheKey;
	/** Number of options available */
	optionsCount: number;
	/** The current selection that options are relative to */
	currentSelection?: Suggestion;
}

/**
 * Result of showing options again.
 */
export interface ShowOptionsResult {
	/** Whether the operation was successful */
	success: boolean;
	/** The options if successful */
	options?: Suggestion[];
	/** Error details if unsuccessful */
	error?: AddressSearchErrorType;
}

/**
 * Validation result from address validation service.
 */
export interface ValidationResult {
	/** Whether validation succeeded */
	success: boolean;
	/** Whether the address is valid */
	isValid?: boolean;
	/** Whether this is a rural exception requiring user confirmation */
	isRuralException?: boolean;
	/** Formatted address from validation */
	formattedAddress?: string;
	/** Place ID from validation */
	placeId?: string;
	/** Coordinates from validation */
	location?: {
		latitude: number;
		longitude: number;
	};
	/** Error message if validation failed */
	error?: string;
}

/**
 * Entry in search history (searches with >= 2 results).
 */
export interface SearchHistoryEntry {
	readonly id: string;
	readonly query: string;
	readonly cacheKey: CacheKey;
	readonly resultCount: number;
	readonly timestamp: number;
	readonly context: {
		readonly mode: Mode;
		readonly intent: LocationIntent;
	};
}

/**
 * Entry in address selection history (confirmed selections).
 */
export interface AddressSelectionEntry {
	readonly id: string;
	readonly originalQuery: string;
	readonly originalCacheKey: CacheKey;
	readonly selectedAddress: Suggestion;
	readonly timestamp: number;
	readonly context: {
		readonly mode: Mode;
		readonly intent: LocationIntent;
	};
}

/**
 * Complete snapshot of the service's internal state.
 * Used for debugging and state inspection.
 */
export interface ServiceStateSnapshot {
	readonly currentSearch: SearchState | null;
	readonly currentSelection: SelectionState | null;
	readonly showOptionsConfig: ShowOptionsConfig;
	readonly isShowingOptions: boolean;
	readonly timestamp: number;
}

/**
 * Options for cache operations.
 */
export interface CacheOptions {
	/** Time-to-live in milliseconds */
	ttl?: number;
	/** Whether to overwrite existing cache entry */
	overwrite?: boolean;
}

/**
 * Result of a cache operation.
 */
export interface CacheResult<T> {
	/** Whether the operation found/set data */
	hit: boolean;
	/** The data if found */
	data?: T;
	/** The cache key used */
	cacheKey: CacheKey | EnrichmentCacheKey;
}

/**
 * Error type reference (defined in errors.ts).
 */
export interface AddressSearchErrorType {
	name: string;
	message: string;
	code: string;
	recoverable: boolean;
	context?: Record<string, unknown>;
	toUserMessage(): string;
}
