import { create } from "zustand";
import type { LocationIntent } from "./types";

/**
 * Search History Store
 *
 * Purpose: Stores search queries that returned multiple results (≥2 results)
 * Behavior: "Search this again" - triggers new API call when recalled
 *
 * Only stores searches, never selections. Clear separation from AddressSelectionStore.
 */

export interface SearchHistoryEntry {
	id: string;
	query: string;
	resultCount: number;
	timestamp: number;
	context: {
		mode: "manual" | "voice";
		intent: LocationIntent;
	};
}

interface SearchHistoryStore {
	searchHistory: SearchHistoryEntry[];
	addSearchToHistory: (
		entry: Omit<SearchHistoryEntry, "id" | "timestamp">,
	) => void;
	clearSearchHistory: () => void;
	getSearchHistory: () => SearchHistoryEntry[];
}

export const useSearchHistoryStore = create<SearchHistoryStore>((set, get) => ({
	searchHistory: [],

	addSearchToHistory: (entry) => {
		// Only add if resultCount >= 2 (multiple results)
		if (entry.resultCount < 2) {
			return;
		}

		// Remove duplicate queries
		const updated = get().searchHistory.filter((e) => e.query !== entry.query);

		const newEntry: SearchHistoryEntry = {
			...entry,
			id: crypto.randomUUID(),
			timestamp: Date.now(),
		};

		if (typeof window !== "undefined") {
			console.log("[SearchHistory] Adding search:", {
				query: newEntry.query,
				resultCount: newEntry.resultCount,
				mode: newEntry.context.mode,
				intent: newEntry.context.intent,
			});
		}

		// Add to front, keep max 10 entries
		const newHistory = [newEntry, ...updated].slice(0, 10);
		set({ searchHistory: newHistory });
	},

	clearSearchHistory: () => set({ searchHistory: [] }),
	getSearchHistory: () => get().searchHistory,
}));
