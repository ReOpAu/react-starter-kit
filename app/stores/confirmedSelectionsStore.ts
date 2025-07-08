import { create } from "zustand";
import type { Suggestion } from "./types";

export type ConfirmedSelectionEntry = {
	id: string;
	query: string;
	timestamp: number;
	selectedResult: Suggestion;
	context: {
		mode: "manual" | "voice" | "agent";
		intent?: string;
		[key: string]: unknown;
	};
};

type ConfirmedSelectionsState = {
	selections: ConfirmedSelectionEntry[];
	addConfirmedSelection: (
		entry: Omit<ConfirmedSelectionEntry, "id" | "timestamp">,
	) => void;
};

export const useConfirmedSelectionsStore = create<ConfirmedSelectionsState>(
	(set) => ({
		selections: [],
		addConfirmedSelection: (entry) =>
			set((state) => ({
				selections: [
					{
						...entry,
						id: crypto.randomUUID(),
						timestamp: Date.now(),
					},
					...state.selections,
				],
			})),
	}),
);
