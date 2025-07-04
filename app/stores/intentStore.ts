import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { LocationIntent, Suggestion, Mode } from "~/stores/types";

interface IntentState {
	searchQuery: string;
	selectedResult: Suggestion | null;
	currentIntent: LocationIntent;
	isSmartValidationEnabled: boolean;
	activeSearchSource: Mode | null;
	agentLastSearchQuery: string | null;

	setActiveSearch: (payload: {
		query: string;
		source: Mode;
	}) => void;
	setSelectedResult: (result: Suggestion | null) => void;
	setCurrentIntent: (intent: LocationIntent) => void;
	setIsSmartValidationEnabled: (enabled: boolean) => void;
	setAgentLastSearchQuery: (query: string | null) => void;

	// Action to reset intent state
	resetIntentState: () => void;
}

const initialIntentState = {
	searchQuery: "",
	selectedResult: null,
	currentIntent: "general" as LocationIntent,
	isSmartValidationEnabled: true,
	activeSearchSource: null,
	agentLastSearchQuery: null,
};

export const useIntentStore = create<IntentState>()(
	devtools(
		(set) => ({
			...initialIntentState,
			setActiveSearch: (payload: {
				query: string;
				source: Mode;
			}) => {
				if (!payload.query) {
					set({ searchQuery: "", activeSearchSource: null });
				} else {
					set({
						searchQuery: payload.query,
						activeSearchSource: payload.source,
					});
				}
			},
			setSelectedResult: (result: Suggestion | null) =>
				set({ selectedResult: result }),
			setCurrentIntent: (intent: LocationIntent) =>
				set({ currentIntent: intent }),
			setIsSmartValidationEnabled: (enabled: boolean) =>
				set({ isSmartValidationEnabled: enabled }),
			setAgentLastSearchQuery: (query: string | null) =>
				set({ agentLastSearchQuery: query }),
			resetIntentState: () => set(initialIntentState),
		}),
		{ name: "IntentStore" },
	),
);
