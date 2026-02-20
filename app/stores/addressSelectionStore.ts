import { create } from "zustand";
import type { LocationIntent, Suggestion } from "./types";

/**
 * Address Selection Store
 *
 * Purpose: Stores specific addresses that were selected and confirmed
 * Behavior: "Go back to this address" - direct restoration without API call
 *
 * Only stores confirmed selections, never searches. Clear separation from SearchHistoryStore.
 */

export interface AddressSelectionEntry {
	id: string;
	originalQuery: string;
	selectedAddress: Suggestion;
	timestamp: number;
	context: {
		mode: "manual" | "voice" | "auto";
		intent: LocationIntent;
	};
}

interface AddressSelectionStore {
	addressSelections: AddressSelectionEntry[];
	addAddressSelection: (
		entry: Omit<AddressSelectionEntry, "id" | "timestamp">,
	) => void;
	clearAddressSelections: () => void;
	getAddressSelections: () => AddressSelectionEntry[];
}

export const useAddressSelectionStore = create<AddressSelectionStore>(
	(set, get) => ({
		addressSelections: [],

		addAddressSelection: (entry) => {
			// Remove duplicate selections (by placeId or description)
			const updated = get().addressSelections.filter(
				(e) =>
					e.selectedAddress.placeId !== entry.selectedAddress.placeId &&
					e.selectedAddress.description !== entry.selectedAddress.description,
			);

			const newEntry: AddressSelectionEntry = {
				...entry,
				id: crypto.randomUUID(),
				timestamp: Date.now(),
			};

			// Add to front, keep max 15 entries
			const newSelections = [newEntry, ...updated].slice(0, 15);
			set({ addressSelections: newSelections });
		},

		clearAddressSelections: () => set({ addressSelections: [] }),
		getAddressSelections: () => get().addressSelections,
	}),
);
