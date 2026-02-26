import type { QueryClient } from "@tanstack/react-query";
import type { Suggestion } from "~/stores/types";
import { AddressCache } from "./AddressCache";
import {
	AddressSearchError,
	createOptionsError,
	createSearchError,
	createSelectionError,
	createStateError,
} from "./errors";
import type {
	SearchContext,
	SearchResult,
	SearchState,
	SelectionContext,
	SelectionResult,
	SelectionState,
	ServiceStateSnapshot,
	ShowOptionsConfig,
	ShowOptionsResult,
} from "./types";

// Store type references
type IntentStore = typeof import("~/stores/intentStore").useIntentStore;
type UIStore = typeof import("~/stores/uiStore").useUIStore;
type ApiStore = typeof import("~/stores/apiStore").useApiStore;
// biome-ignore format: typeof import must stay on single line for valid TS syntax
type SearchHistoryStore = typeof import("~/stores/searchHistoryStore").useSearchHistoryStore;
// biome-ignore format: typeof import must stay on single line for valid TS syntax
type AddressSelectionStore = typeof import("~/stores/addressSelectionStore").useAddressSelectionStore;

interface StoreRefs {
	intentStore: IntentStore;
	uiStore: UIStore;
	apiStore: ApiStore;
	searchHistoryStore: SearchHistoryStore;
	addressSelectionStore: AddressSelectionStore;
}

/**
 * Alert types for threshold-based monitoring.
 */
export type AlertType =
	| "slow_operation"
	| "low_cache_hit_rate"
	| "high_error_rate"
	| "metrics_reset";

/**
 * Alert severity levels based on threshold deviation.
 */
export type AlertSeverity = "info" | "warning" | "critical";

/**
 * Alert event emitted when thresholds are exceeded.
 */
export interface AlertEvent {
	type: AlertType;
	severity: AlertSeverity;
	timestamp: number;
	threshold: number;
	actual: number;
	details?: Record<string, unknown>;
}

/**
 * Alert configuration for threshold-based monitoring.
 */
export interface AlertConfig {
	/** Threshold for slow operations in ms (default: 100) */
	slowOperationThresholdMs: number;
	/** Threshold for low cache hit rate (0.0-1.0, default: 0.5) */
	lowCacheHitRateThreshold: number;
	/** Threshold for high error rate (0.0-1.0, default: 0.1) */
	highErrorRateThreshold: number;
	/** Minimum operations before evaluating thresholds (default: 10) */
	minOperationsForAlert: number;
	/** Cooldown period in ms between same alert types (default: 30000 = 30s) */
	alertCooldownMs: number;
	/** Callback for alert events */
	onAlert?: (event: AlertEvent) => void;
}

/**
 * Configuration options for the AddressSearchService.
 */
export interface ServiceConfig {
	/** Enable state validation (expensive, recommended for dev only) */
	enableStateValidation: boolean;
	/** Enable detailed logging */
	enableLogging: boolean;
	/** Telemetry callback for tracking service events */
	onTelemetry?: (event: TelemetryEvent) => void;
	/** Maximum operations to track before auto-reset (memory management) */
	maxOperationsBeforeReset: number;
	/** Alert configuration for threshold monitoring */
	alerts?: Partial<AlertConfig>;
}

/**
 * Telemetry event for tracking service operations.
 */
export interface TelemetryEvent {
	type:
		| "search_recorded"
		| "selection_recorded"
		| "show_options"
		| "state_resync"
		| "state_validation_failed"
		| "error"
		| "performance";
	timestamp: number;
	details?: Record<string, unknown>;
	/** Duration in milliseconds (for performance events) */
	durationMs?: number;
}

/**
 * Performance metrics snapshot for the service.
 */
export interface PerformanceMetrics {
	/** Average operation duration in ms */
	avgOperationMs: number;
	/** Total operations tracked */
	operationCount: number;
	/** Cache metrics from AddressCache */
	cache: {
		hitRate: number;
		hits: number;
		misses: number;
		writes: number;
		preservations: number;
	};
	/** Operation timing breakdown */
	timing: {
		searches: { count: number; totalMs: number; avgMs: number };
		selections: { count: number; totalMs: number; avgMs: number };
		showOptions: { count: number; totalMs: number; avgMs: number };
	};
}

/**
 * Default alert configuration.
 */
const DEFAULT_ALERT_CONFIG: AlertConfig = {
	slowOperationThresholdMs: 100,
	lowCacheHitRateThreshold: 0.5,
	highErrorRateThreshold: 0.1,
	minOperationsForAlert: 10,
	alertCooldownMs: 30000, // 30 seconds between same alert types
};

/**
 * Default configuration - validation enabled in development only.
 */
const DEFAULT_CONFIG: ServiceConfig = {
	enableStateValidation:
		typeof process !== "undefined" && process.env?.NODE_ENV === "development",
	enableLogging: true,
	maxOperationsBeforeReset: 10000,
};

/**
 * Centralized Address Search Service.
 *
 * PURPOSE: Replace scattered business logic with a single, testable service
 * that enforces all business rules and provides clear, consistent APIs.
 *
 * BUSINESS RULES ENFORCED:
 * 1. Cache Preservation Rule: Selection never destroys original search results
 * 2. Complete Options Rule: "Show options again" always returns ALL original suggestions
 * 3. Cache Consistency Rule: Cache keys are normalized and always consistent
 * 4. State Integrity Rule: Service maintains consistent internal state
 * 5. Error Clarity Rule: All errors provide clear business context
 *
 * USAGE:
 * - From Brain components: Use via useAddressSearchService() hook
 * - From client tools: Use singleton instance directly
 */
export class AddressSearchService {
	private static instance: AddressSearchService | null = null;

	private readonly cache: AddressCache;
	private readonly stores: StoreRefs;
	private readonly config: ServiceConfig;

	// Internal state tracking
	private currentSearchState: SearchState | null = null;
	private currentSelectionState: SelectionState | null = null;

	// Telemetry counters
	private telemetryCounters = {
		searches: 0,
		selections: 0,
		showOptions: 0,
		resyncs: 0,
		validationFailures: 0,
		errors: 0,
	};

	// Performance timing tracking
	private timingMetrics = {
		searches: { count: 0, totalMs: 0 },
		selections: { count: 0, totalMs: 0 },
		showOptions: { count: 0, totalMs: 0 },
	};

	// Alert configuration
	private alertConfig: AlertConfig;

	// Alert cooldown tracking (prevents spam during sustained issues)
	private alertCooldowns = new Map<AlertType, number>();

	private constructor(
		queryClient: QueryClient,
		stores: StoreRefs,
		config?: Partial<ServiceConfig>,
	) {
		this.cache = new AddressCache(queryClient);
		this.stores = stores;
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.alertConfig = { ...DEFAULT_ALERT_CONFIG, ...config?.alerts };
	}

	/**
	 * Log a message if logging is enabled.
	 */
	private log(message: string, data?: Record<string, unknown>): void {
		if (this.config.enableLogging) {
			if (data) {
				console.log(`[AddressSearchService] ${message}`, data);
			} else {
				console.log(`[AddressSearchService] ${message}`);
			}
		}
	}

	/**
	 * Emit a telemetry event.
	 */
	private emitTelemetry(
		type: TelemetryEvent["type"],
		details?: Record<string, unknown>,
	): void {
		const event: TelemetryEvent = {
			type,
			timestamp: Date.now(),
			details,
		};

		// Update internal counters
		switch (type) {
			case "search_recorded":
				this.telemetryCounters.searches++;
				break;
			case "selection_recorded":
				this.telemetryCounters.selections++;
				break;
			case "show_options":
				this.telemetryCounters.showOptions++;
				break;
			case "state_resync":
				this.telemetryCounters.resyncs++;
				break;
			case "state_validation_failed":
				this.telemetryCounters.validationFailures++;
				break;
			case "error":
				this.telemetryCounters.errors++;
				break;
		}

		// Call external telemetry callback if configured
		this.config.onTelemetry?.(event);
	}

	/**
	 * Build standardized error context for selection errors.
	 */
	private buildSelectionErrorContext(
		suggestion: Suggestion,
		additionalContext?: Record<string, unknown>,
	): Record<string, unknown> {
		const searchState = this.currentSearchState;
		const availableCount = searchState
			? this.cache.getSuggestionCount(searchState.cacheKey)
			: 0;

		return {
			placeId: suggestion.placeId,
			suggestionDescription: suggestion.description,
			availableSuggestionsCount: availableCount,
			searchQuery: searchState?.query ?? "unknown",
			timestamp: Date.now(),
			...additionalContext,
		};
	}

	/**
	 * Build standardized error context for options errors.
	 */
	private buildOptionsErrorContext(
		config: ShowOptionsConfig,
		additionalContext?: Record<string, unknown>,
	): Record<string, unknown> {
		const { agentLastSearchQuery } = this.stores.intentStore.getState();

		return {
			hasSelection: !!config.currentSelection,
			currentSelection: config.currentSelection?.description ?? null,
			agentLastSearchQuery: agentLastSearchQuery ?? "none",
			optionsCacheKey: config.optionsCacheKey ?? null,
			optionsCount: config.optionsCount,
			activeCacheKeys: this.cache.getActiveCacheKeys().length,
			timestamp: Date.now(),
			...additionalContext,
		};
	}

	/**
	 * Get telemetry counters for monitoring.
	 */
	getTelemetryCounters(): typeof this.telemetryCounters {
		return { ...this.telemetryCounters };
	}

	/**
	 * Track operation timing for performance monitoring.
	 * Also triggers alert checking for threshold monitoring.
	 */
	private trackTiming(
		operation: "searches" | "selections" | "showOptions",
		durationMs: number,
	): void {
		this.timingMetrics[operation].count++;
		this.timingMetrics[operation].totalMs += durationMs;

		// Check alerts after tracking (includes memory management)
		this.checkAlerts(operation, durationMs);
	}

	/**
	 * Create a timing tracker that measures operation duration.
	 */
	private startTiming(): () => number {
		const start = performance.now();
		return () => performance.now() - start;
	}

	/**
	 * Get comprehensive performance metrics for monitoring.
	 */
	getPerformanceMetrics(): PerformanceMetrics {
		const cacheMetrics = this.cache.getMetrics();

		const calculateAvg = (metric: { count: number; totalMs: number }) =>
			metric.count > 0 ? metric.totalMs / metric.count : 0;

		const totalOps =
			this.timingMetrics.searches.count +
			this.timingMetrics.selections.count +
			this.timingMetrics.showOptions.count;

		const totalMs =
			this.timingMetrics.searches.totalMs +
			this.timingMetrics.selections.totalMs +
			this.timingMetrics.showOptions.totalMs;

		return {
			avgOperationMs: totalOps > 0 ? totalMs / totalOps : 0,
			operationCount: totalOps,
			cache: {
				hitRate: cacheMetrics.hitRate,
				hits: cacheMetrics.hits,
				misses: cacheMetrics.misses,
				writes: cacheMetrics.writes,
				preservations: cacheMetrics.preservations,
			},
			timing: {
				searches: {
					count: this.timingMetrics.searches.count,
					totalMs: this.timingMetrics.searches.totalMs,
					avgMs: calculateAvg(this.timingMetrics.searches),
				},
				selections: {
					count: this.timingMetrics.selections.count,
					totalMs: this.timingMetrics.selections.totalMs,
					avgMs: calculateAvg(this.timingMetrics.selections),
				},
				showOptions: {
					count: this.timingMetrics.showOptions.count,
					totalMs: this.timingMetrics.showOptions.totalMs,
					avgMs: calculateAvg(this.timingMetrics.showOptions),
				},
			},
		};
	}

	/**
	 * Check if an alert is on cooldown.
	 */
	private isAlertOnCooldown(type: AlertType): boolean {
		const lastAlertTime = this.alertCooldowns.get(type);
		if (!lastAlertTime) return false;

		const elapsed = Date.now() - lastAlertTime;
		return elapsed < this.alertConfig.alertCooldownMs;
	}

	/**
	 * Calculate alert severity based on threshold deviation.
	 * - info: 1-2x threshold
	 * - warning: 2-5x threshold
	 * - critical: >5x threshold
	 */
	private calculateSeverity(
		type: AlertType,
		threshold: number,
		actual: number,
	): AlertSeverity {
		// metrics_reset is always info level
		if (type === "metrics_reset") return "info";

		// For rate-based thresholds (cache hit, error rate), invert the ratio
		const isRateThreshold =
			type === "low_cache_hit_rate" || type === "high_error_rate";

		let ratio: number;
		if (isRateThreshold) {
			// For rates, severity increases as actual deviates from threshold
			if (type === "low_cache_hit_rate") {
				// threshold is minimum acceptable (e.g., 0.5), actual is below
				ratio = threshold > 0 ? threshold / Math.max(actual, 0.01) : 1;
			} else {
				// threshold is maximum acceptable (e.g., 0.1), actual is above
				ratio = threshold > 0 ? actual / threshold : 1;
			}
		} else {
			// For timing thresholds, ratio is actual/threshold
			ratio = threshold > 0 ? actual / threshold : 1;
		}

		if (ratio >= 5) return "critical";
		if (ratio >= 2) return "warning";
		return "info";
	}

	/**
	 * Emit an alert event when thresholds are exceeded.
	 * Respects cooldown periods to prevent alert spam.
	 */
	private emitAlert(
		type: AlertType,
		threshold: number,
		actual: number,
		details?: Record<string, unknown>,
	): void {
		// Skip if on cooldown (except metrics_reset which always fires)
		if (type !== "metrics_reset" && this.isAlertOnCooldown(type)) {
			return;
		}

		const severity = this.calculateSeverity(type, threshold, actual);
		const event: AlertEvent = {
			type,
			severity,
			timestamp: Date.now(),
			threshold,
			actual,
			details,
		};

		// Update cooldown
		this.alertCooldowns.set(type, Date.now());

		this.log(`Alert [${severity}]: ${type}`, { threshold, actual, ...details });
		this.alertConfig.onAlert?.(event);
	}

	/**
	 * Check and emit alerts based on current metrics.
	 * Called after tracking timing to monitor thresholds.
	 */
	private checkAlerts(
		operation: "searches" | "selections" | "showOptions",
		durationMs: number,
	): void {
		const totalOps =
			this.timingMetrics.searches.count +
			this.timingMetrics.selections.count +
			this.timingMetrics.showOptions.count;

		// Check slow operation threshold
		if (durationMs > this.alertConfig.slowOperationThresholdMs) {
			this.emitAlert(
				"slow_operation",
				this.alertConfig.slowOperationThresholdMs,
				durationMs,
				{ operation },
			);
		}

		// Only check aggregate thresholds after minimum operations
		if (totalOps < this.alertConfig.minOperationsForAlert) {
			return;
		}

		// Check cache hit rate threshold
		const cacheMetrics = this.cache.getMetrics();
		if (cacheMetrics.hitRate < this.alertConfig.lowCacheHitRateThreshold) {
			this.emitAlert(
				"low_cache_hit_rate",
				this.alertConfig.lowCacheHitRateThreshold,
				cacheMetrics.hitRate,
				{
					hits: cacheMetrics.hits,
					misses: cacheMetrics.misses,
				},
			);
		}

		// Check error rate threshold
		const errorRate =
			totalOps > 0 ? this.telemetryCounters.errors / totalOps : 0;
		if (errorRate > this.alertConfig.highErrorRateThreshold) {
			this.emitAlert(
				"high_error_rate",
				this.alertConfig.highErrorRateThreshold,
				errorRate,
				{
					errors: this.telemetryCounters.errors,
					totalOps,
				},
			);
		}

		// Memory management: auto-reset after threshold
		if (totalOps >= this.config.maxOperationsBeforeReset) {
			this.resetMetrics();
		}
	}

	/**
	 * Reset all metrics (for memory management or testing).
	 */
	resetMetrics(): void {
		const previousMetrics = this.getPerformanceMetrics();

		// Reset telemetry counters
		this.telemetryCounters = {
			searches: 0,
			selections: 0,
			showOptions: 0,
			resyncs: 0,
			validationFailures: 0,
			errors: 0,
		};

		// Reset timing metrics
		this.timingMetrics = {
			searches: { count: 0, totalMs: 0 },
			selections: { count: 0, totalMs: 0 },
			showOptions: { count: 0, totalMs: 0 },
		};

		// Reset cache metrics
		this.cache.resetMetrics();

		// Emit alert about reset
		this.emitAlert("metrics_reset", this.config.maxOperationsBeforeReset, 0, {
			previousMetrics,
		});

		this.log("Metrics reset", {
			previousOperationCount: previousMetrics.operationCount,
		});
	}

	/**
	 * Update alert configuration at runtime.
	 */
	updateAlertConfig(config: Partial<AlertConfig>): void {
		Object.assign(this.alertConfig, config);
		this.log("Alert configuration updated", config);
	}

	/**
	 * Update service configuration at runtime.
	 */
	updateConfig(config: Partial<ServiceConfig>): void {
		Object.assign(this.config, config);
		if (config.alerts) {
			this.updateAlertConfig(config.alerts);
		}
		this.log("Configuration updated", config);
	}

	// Lock to prevent race conditions during initialization
	private static initializationLock = false;

	/**
	 * Initialize the service singleton.
	 * Must be called once at app startup.
	 *
	 * @param queryClient - React Query client
	 * @param stores - Store references
	 * @param config - Optional configuration overrides
	 */
	static initialize(
		queryClient: QueryClient,
		stores: StoreRefs,
		config?: Partial<ServiceConfig>,
	): void {
		if (AddressSearchService.instance) {
			console.warn("[AddressSearchService] Already initialized");
			return;
		}
		if (AddressSearchService.initializationLock) {
			console.warn("[AddressSearchService] Initialization in progress");
			return;
		}

		AddressSearchService.initializationLock = true;
		try {
			AddressSearchService.instance = new AddressSearchService(
				queryClient,
				stores,
				config,
			);
			console.log("[AddressSearchService] Initialized", {
				enableStateValidation:
					AddressSearchService.instance.config.enableStateValidation,
				enableLogging: AddressSearchService.instance.config.enableLogging,
			});
		} finally {
			AddressSearchService.initializationLock = false;
		}
	}

	/**
	 * Atomically get or initialize the service.
	 * Prevents race conditions when multiple callers try to initialize simultaneously.
	 *
	 * @param queryClient - React Query client
	 * @param stores - Store references
	 * @param config - Optional configuration overrides
	 * @returns The singleton instance
	 */
	static getOrInitialize(
		queryClient: QueryClient,
		stores: StoreRefs,
		config?: Partial<ServiceConfig>,
	): AddressSearchService {
		if (!AddressSearchService.instance) {
			AddressSearchService.initialize(queryClient, stores, config);
		}
		return AddressSearchService.getInstance();
	}

	/**
	 * Get the singleton instance.
	 */
	static getInstance(): AddressSearchService {
		if (!AddressSearchService.instance) {
			throw createStateError("STATE_MISSING_DEPENDENCY", {
				reason:
					"AddressSearchService not initialized. Call initialize() or getOrInitialize() first.",
			});
		}
		return AddressSearchService.instance;
	}

	/**
	 * Check if the service has been initialized.
	 */
	static isInitialized(): boolean {
		return AddressSearchService.instance !== null;
	}

	/**
	 * Reset the singleton (for testing).
	 */
	static reset(): void {
		AddressSearchService.instance = null;
		AddressSearchService.initializationLock = false;
	}

	/**
	 * Record search results and update state/cache.
	 *
	 * This method:
	 * 1. Validates the query
	 * 2. Generates a consistent cache key
	 * 3. Caches the results
	 * 4. Updates internal state
	 * 5. Returns a SearchResult
	 *
	 * NOTE: This method does NOT call the API directly.
	 * The API call should be made by the caller, and this method
	 * is called with the results to update state and cache.
	 */
	recordSearchResults(
		query: string,
		suggestions: Suggestion[],
		context: SearchContext,
	): SearchResult {
		const endTiming = this.startTiming();

		try {
			// Validate query
			if (!query?.trim()) {
				this.emitTelemetry("error", { type: "invalid_query", query });
				throw createSearchError("SEARCH_INVALID_QUERY", { query });
			}

			// Generate consistent cache key
			const cacheKey = this.cache.generateSearchCacheKey(query);

			// Cache the suggestions (overwrite to ensure fresh results)
			this.cache.setSuggestions(cacheKey, suggestions, { overwrite: true });

			// Build search state
			const searchState: SearchState = {
				query: query.trim(),
				cacheKey,
				suggestions,
				source: context.source,
				intent: context.intent ?? "general",
				timestamp: Date.now(),
				resultCount: suggestions.length,
			};

			// Update internal state
			this.currentSearchState = searchState;

			// Sync to stores
			this.syncSearchToStores(searchState);

			// Emit telemetry
			this.emitTelemetry("search_recorded", {
				query: searchState.query,
				resultCount: searchState.resultCount,
				source: searchState.source,
				intent: searchState.intent,
			});

			const durationMs = endTiming();
			this.trackTiming("searches", durationMs);

			this.log("Search recorded", {
				query: searchState.query,
				resultCount: searchState.resultCount,
				durationMs,
			});

			return {
				success: true,
				searchState,
			};
		} catch (error) {
			const durationMs = endTiming();
			this.trackTiming("searches", durationMs);
			this.emitTelemetry("error", { type: "search_failed", query, durationMs });
			if (error instanceof AddressSearchError) {
				return { success: false, error };
			}
			return {
				success: false,
				error: createSearchError("SEARCH_FAILED", { query }, error as Error),
			};
		}
	}

	/**
	 * Sync search state to Zustand stores.
	 */
	private syncSearchToStores(searchState: SearchState): void {
		const { setActiveSearch, setAgentLastSearchQuery, setCurrentIntent } =
			this.stores.intentStore.getState();
		const { setApiResults } = this.stores.apiStore.getState();

		setActiveSearch({ query: searchState.query, source: searchState.source });
		setAgentLastSearchQuery(searchState.query);
		setCurrentIntent(searchState.intent);
		setApiResults({
			suggestions: [...searchState.suggestions],
			isLoading: false,
			error: null,
			source: searchState.source,
		});
	}

	/**
	 * Record a selection from the current search results.
	 *
	 * CRITICAL BUSINESS RULE: This method preserves the original cache
	 * so "show options again" always works.
	 */
	recordSelection(
		suggestion: Suggestion,
		context?: SelectionContext,
	): SelectionResult {
		const endTiming = this.startTiming();

		try {
			// Get the current search state to find the original cache
			const searchState =
				this.currentSearchState ?? this.reconstructSearchState();

			if (!searchState) {
				this.emitTelemetry("error", {
					type: "no_current_search",
					suggestion: suggestion.description,
				});
				throw createSelectionError("SELECTION_NO_CURRENT_SEARCH", {
					suggestion: suggestion.description,
				});
			}

			// Verify the suggestion exists in cache (defensive check)
			const cacheResult = this.cache.getSuggestions(searchState.cacheKey);
			const suggestionInCache = cacheResult.data?.find(
				(s) => s.placeId === suggestion.placeId,
			);

			// If not in cache, add it while preserving existing suggestions
			if (!suggestionInCache) {
				const existingSuggestions = cacheResult.data ?? [];
				this.cache.setSuggestions(
					searchState.cacheKey,
					[...existingSuggestions, suggestion],
					{ overwrite: false }, // Preserve existing suggestions
				);
			}

			// Build selection state
			const selectionState: SelectionState = {
				selectedSuggestion: suggestion,
				originalQuery: searchState.query,
				originalCacheKey: searchState.cacheKey,
				source: context?.isAgentSelection ? "agent" : searchState.source,
				intent: context?.preserveIntent ?? searchState.intent,
				timestamp: Date.now(),
				isValidated: false,
				isAcknowledged: false,
			};

			// Update internal state
			this.currentSelectionState = selectionState;

			// Sync to stores
			this.syncSelectionToStores(selectionState);

			// Reset "show options" mode when making a new selection
			this.stores.uiStore.getState().setShowingOptionsAfterConfirmation(false);

			// Emit telemetry
			this.emitTelemetry("selection_recorded", {
				placeId: suggestion.placeId,
				description: suggestion.description,
				source: selectionState.source,
				intent: selectionState.intent,
			});

			const durationMs = endTiming();
			this.trackTiming("selections", durationMs);

			this.log("Selection recorded", {
				description: suggestion.description,
				source: selectionState.source,
				durationMs,
			});

			return {
				success: true,
				selectionState,
			};
		} catch (error) {
			const durationMs = endTiming();
			this.trackTiming("selections", durationMs);
			this.emitTelemetry("error", {
				type: "selection_failed",
				placeId: suggestion.placeId,
				durationMs,
			});

			if (error instanceof AddressSearchError) {
				return { success: false, error };
			}

			// Use context builder for standardized error context
			return {
				success: false,
				error: createSelectionError(
					"SELECTION_NOT_FOUND",
					this.buildSelectionErrorContext(suggestion),
				),
			};
		}
	}

	/**
	 * Sync selection state to Zustand stores.
	 */
	private syncSelectionToStores(selectionState: SelectionState): void {
		const { setSelectedResult, setCurrentIntent, setActiveSearch } =
			this.stores.intentStore.getState();

		setSelectedResult(selectionState.selectedSuggestion);
		setCurrentIntent(selectionState.intent);
		setActiveSearch({
			query: selectionState.selectedSuggestion.description,
			source:
				selectionState.source === "agent" ? "voice" : selectionState.source,
		});
	}

	/**
	 * Try to reconstruct search state from store values.
	 * Used when the service state is lost but stores have data.
	 */
	private reconstructSearchState(): SearchState | null {
		const {
			agentLastSearchQuery,
			searchQuery,
			currentIntent,
			activeSearchSource,
		} = this.stores.intentStore.getState();

		const query = agentLastSearchQuery || searchQuery;
		if (!query) return null;

		try {
			const cacheKey = this.cache.generateSearchCacheKey(query);
			const cacheResult = this.cache.getSuggestions(cacheKey);

			if (!cacheResult.hit) return null;

			return {
				query,
				cacheKey,
				suggestions: cacheResult.data ?? [],
				source: activeSearchSource ?? "manual",
				intent: currentIntent ?? "general",
				timestamp: Date.now(),
				resultCount: cacheResult.data?.length ?? 0,
			};
		} catch {
			return null;
		}
	}

	/**
	 * Get options to show again for the current selection.
	 *
	 * CRITICAL BUSINESS RULE (Complete Options):
	 * This method MUST return ALL original suggestions from the search
	 * that produced the current selection, not just the selected one.
	 *
	 * @returns All suggestions from the original search, or empty array if unavailable
	 */
	getOptionsForCurrentSelection(): Suggestion[] {
		const config = this.getShowOptionsConfig();

		if (!config.canShow || !config.optionsCacheKey) {
			return [];
		}

		const cacheResult = this.cache.getSuggestions(config.optionsCacheKey);
		return cacheResult.data ?? [];
	}

	/**
	 * Check if "show options again" is available.
	 */
	canShowOptionsAgain(): boolean {
		return this.getShowOptionsConfig().canShow;
	}

	/**
	 * Get full configuration for "show options again".
	 */
	getShowOptionsConfig(): ShowOptionsConfig {
		const { selectedResult, agentLastSearchQuery } =
			this.stores.intentStore.getState();

		// Must have a confirmed selection
		if (!selectedResult) {
			return { canShow: false, optionsCount: 0 };
		}

		// Must have a recorded search query
		if (!agentLastSearchQuery) {
			return {
				canShow: false,
				optionsCount: 0,
				currentSelection: selectedResult,
			};
		}

		// Try to get cache using the recorded query
		try {
			const cacheKey = this.cache.generateSearchCacheKey(agentLastSearchQuery);
			const suggestionCount = this.cache.getSuggestionCount(cacheKey);

			return {
				canShow: suggestionCount > 0,
				optionsCacheKey: cacheKey,
				optionsCount: suggestionCount,
				currentSelection: selectedResult,
			};
		} catch {
			return {
				canShow: false,
				optionsCount: 0,
				currentSelection: selectedResult,
			};
		}
	}

	/**
	 * Activate "show options again" mode.
	 *
	 * @returns Result with options shown, or error if not available
	 */
	showOptionsAgain(): ShowOptionsResult {
		const endTiming = this.startTiming();
		const config = this.getShowOptionsConfig();

		if (!config.currentSelection) {
			const durationMs = endTiming();
			this.trackTiming("showOptions", durationMs);
			this.emitTelemetry("error", {
				type: "show_options_no_selection",
				durationMs,
			});
			return {
				success: false,
				error: createOptionsError(
					"OPTIONS_NO_SELECTION",
					this.buildOptionsErrorContext(config),
				),
			};
		}

		if (!config.optionsCacheKey) {
			const durationMs = endTiming();
			this.trackTiming("showOptions", durationMs);
			this.emitTelemetry("error", {
				type: "show_options_no_cache",
				durationMs,
			});
			return {
				success: false,
				error: createOptionsError(
					"OPTIONS_NO_CACHE",
					this.buildOptionsErrorContext(config),
				),
			};
		}

		if (config.optionsCount === 0) {
			const durationMs = endTiming();
			this.trackTiming("showOptions", durationMs);
			this.emitTelemetry("error", {
				type: "show_options_empty_cache",
				durationMs,
			});
			return {
				success: false,
				error: createOptionsError(
					"OPTIONS_EMPTY_CACHE",
					this.buildOptionsErrorContext(config),
				),
			};
		}

		// Activate show options mode
		this.stores.uiStore.getState().setShowingOptionsAfterConfirmation(true);

		const options = this.getOptionsForCurrentSelection();
		const durationMs = endTiming();
		this.trackTiming("showOptions", durationMs);

		// Emit telemetry
		this.emitTelemetry("show_options", {
			optionsCount: options.length,
			currentSelection: config.currentSelection.description,
			durationMs,
		});

		this.log("Showing options again", {
			optionsCount: options.length,
			durationMs,
		});

		return {
			success: true,
			options,
		};
	}

	/**
	 * Hide options and return to showing confirmed selection.
	 */
	hideOptions(): void {
		this.stores.uiStore.getState().setShowingOptionsAfterConfirmation(false);
	}

	/**
	 * Clear the current search and selection state.
	 */
	clearCurrentSearch(): void {
		// Clear internal state
		this.currentSearchState = null;
		this.currentSelectionState = null;

		// Reset show options mode
		this.stores.uiStore.getState().setShowingOptionsAfterConfirmation(false);

		// Note: We don't clear the cache here to preserve history
		// The cache will be overwritten by the next search
	}

	/**
	 * Get the current search state.
	 */
	getCurrentSearch(): SearchState | null {
		return this.currentSearchState ?? this.reconstructSearchState();
	}

	/**
	 * Get the current selection state.
	 */
	getCurrentSelection(): SelectionState | null {
		return this.currentSelectionState;
	}

	/**
	 * Get the search history (from store).
	 */
	getSearchHistory() {
		return this.stores.searchHistoryStore.getState().searchHistory;
	}

	/**
	 * Get a complete snapshot of the service state (for debugging).
	 */
	getStateSnapshot(): ServiceStateSnapshot {
		return {
			currentSearch: this.getCurrentSearch(),
			currentSelection: this.getCurrentSelection(),
			showOptionsConfig: this.getShowOptionsConfig(),
			isShowingOptions:
				this.stores.uiStore.getState().showingOptionsAfterConfirmation,
			timestamp: Date.now(),
		};
	}

	/**
	 * Validate that service state is in sync with store state.
	 * Useful for debugging state drift issues.
	 *
	 * Note: This is an expensive operation. Use config.enableStateValidation
	 * to control when it runs.
	 *
	 * @param force - Run validation even if disabled in config
	 * @returns Object with validation results and any drift details
	 */
	validateStateIntegrity(force = false): {
		isValid: boolean;
		selectionInSync: boolean;
		searchInSync: boolean;
		skipped?: boolean;
		details?: {
			serviceSelectionPlaceId?: string;
			storeSelectionPlaceId?: string;
			serviceSearchQuery?: string;
			storeSearchQuery?: string;
		};
	} {
		// Skip if validation is disabled and not forced
		if (!this.config.enableStateValidation && !force) {
			return {
				isValid: true,
				selectionInSync: true,
				searchInSync: true,
				skipped: true,
			};
		}

		const storeState = this.stores.intentStore.getState();
		const storeSelection = storeState.selectedResult;
		const storeSearchQuery =
			storeState.agentLastSearchQuery || storeState.searchQuery;

		const serviceSelection = this.currentSelectionState?.selectedSuggestion;
		const serviceSearchQuery = this.currentSearchState?.query;

		const selectionInSync =
			storeSelection?.placeId === serviceSelection?.placeId;
		const searchInSync =
			!serviceSearchQuery ||
			!storeSearchQuery ||
			serviceSearchQuery === storeSearchQuery;

		const isValid = selectionInSync && searchInSync;

		if (!isValid) {
			this.emitTelemetry("state_validation_failed", {
				selectionInSync,
				searchInSync,
				serviceSelectionPlaceId: serviceSelection?.placeId,
				storeSelectionPlaceId: storeSelection?.placeId,
				serviceSearchQuery,
				storeSearchQuery,
			});

			this.log("State integrity check failed", {
				selectionInSync,
				searchInSync,
			});
		}

		return {
			isValid,
			selectionInSync,
			searchInSync,
			details: isValid
				? undefined
				: {
						serviceSelectionPlaceId: serviceSelection?.placeId,
						storeSelectionPlaceId: storeSelection?.placeId,
						serviceSearchQuery,
						storeSearchQuery,
					},
		};
	}

	/**
	 * Resync service state from stores.
	 * Use when state integrity validation fails.
	 */
	resyncFromStores(): void {
		this.log("Resyncing state from stores");
		this.emitTelemetry("state_resync", {
			hadSearchState: !!this.currentSearchState,
			hadSelectionState: !!this.currentSelectionState,
		});

		// Reconstruct search state from stores
		this.currentSearchState = this.reconstructSearchState();

		// Reconstruct selection state if there's a selection in store
		const { selectedResult, agentLastSearchQuery, currentIntent } =
			this.stores.intentStore.getState();

		if (selectedResult && this.currentSearchState) {
			this.currentSelectionState = {
				selectedSuggestion: selectedResult,
				originalQuery: this.currentSearchState.query,
				originalCacheKey: this.currentSearchState.cacheKey,
				source: this.currentSearchState.source,
				intent: currentIntent ?? "general",
				timestamp: Date.now(),
				isValidated: false,
				isAcknowledged: false,
			};
		} else if (selectedResult && agentLastSearchQuery) {
			// Try to reconstruct from agentLastSearchQuery
			try {
				const cacheKey =
					this.cache.generateSearchCacheKey(agentLastSearchQuery);
				this.currentSelectionState = {
					selectedSuggestion: selectedResult,
					originalQuery: agentLastSearchQuery,
					originalCacheKey: cacheKey,
					source: "manual",
					intent: currentIntent ?? "general",
					timestamp: Date.now(),
					isValidated: false,
					isAcknowledged: false,
				};
			} catch {
				this.currentSelectionState = null;
			}
		} else {
			this.currentSelectionState = null;
		}
	}

	/**
	 * Get direct access to the cache manager.
	 * Use with caution - prefer service methods.
	 */
	getCache(): AddressCache {
		return this.cache;
	}
}
