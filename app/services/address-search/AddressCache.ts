import type { QueryClient } from "@tanstack/react-query";
import type { Suggestion } from "~/stores/types";
import { createCacheError } from "./errors";
import type {
	CacheKey,
	CacheOptions,
	CacheResult,
	EnrichmentCacheKey,
} from "./types";

/**
 * Cache performance metrics for monitoring and analytics.
 */
export interface CacheMetrics {
	hits: number;
	misses: number;
	hitRate: number;
	writes: number;
	preservations: number;
	lastAccess: number;
}

/**
 * Centralized cache management for address search.
 *
 * CRITICAL: This class is the SINGLE SOURCE OF TRUTH for:
 * 1. Cache key generation (normalization)
 * 2. Cache read/write operations
 * 3. Cache key consistency enforcement
 *
 * Business Rules Enforced:
 * - CACHE_PRESERVATION: Selection never destroys original search results
 * - CACHE_CONSISTENCY: Cache keys are always normalized the same way
 */
export class AddressCache {
	private readonly queryClient: QueryClient;

	// Performance metrics tracking
	private metrics: Omit<CacheMetrics, "hitRate"> = {
		hits: 0,
		misses: 0,
		writes: 0,
		preservations: 0,
		lastAccess: 0,
	};

	constructor(queryClient: QueryClient) {
		this.queryClient = queryClient;
	}

	/**
	 * Get cache performance metrics.
	 */
	getMetrics(): CacheMetrics {
		const total = this.metrics.hits + this.metrics.misses;
		return {
			...this.metrics,
			hitRate: total > 0 ? this.metrics.hits / total : 0,
		};
	}

	/**
	 * Reset performance metrics (useful for testing).
	 */
	resetMetrics(): void {
		this.metrics = {
			hits: 0,
			misses: 0,
			writes: 0,
			preservations: 0,
			lastAccess: 0,
		};
	}

	/**
	 * Generate a normalized cache key for address search results.
	 *
	 * CRITICAL: This is the ONLY place where cache keys should be generated.
	 * All other code should call this method to ensure consistency.
	 *
	 * @param query - The search query
	 * @returns Normalized cache key
	 */
	generateSearchCacheKey(query: string): CacheKey {
		const normalized = query.trim();
		if (!normalized) {
			throw createCacheError("CACHE_KEY_MISMATCH", {
				reason: "Empty query cannot be used as cache key",
				originalQuery: query,
			});
		}
		return `addressSearch:${normalized}` as CacheKey;
	}

	/**
	 * Generate a cache key for place details enrichment.
	 */
	generateEnrichmentCacheKey(placeId: string): EnrichmentCacheKey {
		if (!placeId?.trim()) {
			throw createCacheError("CACHE_KEY_MISMATCH", {
				reason: "Empty placeId cannot be used as enrichment cache key",
			});
		}
		return `placeDetails:${placeId}` as EnrichmentCacheKey;
	}

	/**
	 * Extract the query string from a cache key.
	 */
	extractQueryFromCacheKey(cacheKey: CacheKey): string {
		return cacheKey.replace("addressSearch:", "");
	}

	/**
	 * Convert internal cache key format to React Query key array.
	 */
	private toQueryKey(cacheKey: CacheKey): [string, string] {
		const query = this.extractQueryFromCacheKey(cacheKey);
		return ["addressSearch", query];
	}

	private toEnrichmentQueryKey(cacheKey: EnrichmentCacheKey): [string, string] {
		const placeId = cacheKey.replace("placeDetails:", "");
		return ["placeDetails", placeId];
	}

	/**
	 * Get suggestions from cache.
	 *
	 * @param cacheKey - Normalized cache key
	 * @returns Cache result with suggestions if found
	 */
	getSuggestions(cacheKey: CacheKey): CacheResult<Suggestion[]> {
		const queryKey = this.toQueryKey(cacheKey);
		const data = this.queryClient.getQueryData<Suggestion[]>(queryKey);
		const hit = data !== undefined && data.length > 0;

		// Track metrics
		this.metrics.lastAccess = Date.now();
		if (hit) {
			this.metrics.hits++;
		} else {
			this.metrics.misses++;
		}

		return {
			hit,
			data,
			cacheKey,
		};
	}

	/**
	 * Get suggestions using raw query (generates cache key internally).
	 *
	 * @param query - Raw search query
	 * @returns Cache result with suggestions if found
	 */
	getSuggestionsForQuery(query: string): CacheResult<Suggestion[]> {
		const cacheKey = this.generateSearchCacheKey(query);
		return this.getSuggestions(cacheKey);
	}

	/**
	 * Set suggestions in cache.
	 *
	 * BUSINESS RULE (Cache Preservation):
	 * If options.overwrite is false and cache already exists with more items,
	 * the existing cache is preserved.
	 *
	 * @param cacheKey - Normalized cache key
	 * @param suggestions - Suggestions to cache
	 * @param options - Cache options
	 */
	setSuggestions(
		cacheKey: CacheKey,
		suggestions: Suggestion[],
		options?: CacheOptions,
	): void {
		const queryKey = this.toQueryKey(cacheKey);

		// Check for cache preservation rule
		if (!options?.overwrite) {
			const existing = this.queryClient.getQueryData<Suggestion[]>(queryKey);
			if (existing && existing.length > suggestions.length) {
				// Preserve existing cache with more suggestions
				this.metrics.preservations++;
				console.log(
					`[AddressCache] Preserving existing cache with ${existing.length} items (new: ${suggestions.length})`,
				);
				return;
			}
		}

		this.metrics.writes++;
		this.queryClient.setQueryData(queryKey, suggestions);
	}

	/**
	 * Set suggestions using raw query.
	 */
	setSuggestionsForQuery(
		query: string,
		suggestions: Suggestion[],
		options?: CacheOptions,
	): CacheKey {
		const cacheKey = this.generateSearchCacheKey(query);
		this.setSuggestions(cacheKey, suggestions, options);
		return cacheKey;
	}

	/**
	 * Remove suggestions from cache.
	 */
	removeSuggestions(cacheKey: CacheKey): void {
		const queryKey = this.toQueryKey(cacheKey);
		this.queryClient.removeQueries({ queryKey, exact: true });
	}

	/**
	 * Get enriched place details from cache.
	 */
	getPlaceDetails<T>(placeId: string): CacheResult<T> {
		const cacheKey = this.generateEnrichmentCacheKey(placeId);
		const queryKey = this.toEnrichmentQueryKey(cacheKey);
		const data = this.queryClient.getQueryData<T>(queryKey);

		return {
			hit: data !== undefined,
			data,
			cacheKey,
		};
	}

	/**
	 * Set enriched place details in cache.
	 */
	setPlaceDetails<T>(placeId: string, details: T): void {
		const cacheKey = this.generateEnrichmentCacheKey(placeId);
		const queryKey = this.toEnrichmentQueryKey(cacheKey);
		this.queryClient.setQueryData(queryKey, details);
	}

	/**
	 * Check if suggestions exist in cache for a given key.
	 */
	hasSuggestions(cacheKey: CacheKey): boolean {
		const result = this.getSuggestions(cacheKey);
		return result.hit && (result.data?.length ?? 0) > 0;
	}

	/**
	 * Get the count of cached suggestions for a key.
	 */
	getSuggestionCount(cacheKey: CacheKey): number {
		const result = this.getSuggestions(cacheKey);
		return result.data?.length ?? 0;
	}

	/**
	 * Validate that a cache key matches what would be generated for a query.
	 * Used to detect cache key mismatches.
	 */
	validateCacheKey(cacheKey: CacheKey, expectedQuery: string): boolean {
		try {
			const expected = this.generateSearchCacheKey(expectedQuery);
			return cacheKey === expected;
		} catch {
			return false;
		}
	}

	/**
	 * Get all cache keys matching a pattern (for debugging).
	 */
	getActiveCacheKeys(): CacheKey[] {
		const queries = this.queryClient.getQueryCache().getAll();
		return queries
			.filter((q) => q.queryKey[0] === "addressSearch")
			.map((q) => `addressSearch:${q.queryKey[1]}` as CacheKey);
	}
}
