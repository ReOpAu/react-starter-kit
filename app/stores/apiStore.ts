import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Suggestion } from "~/stores/types";

interface ApiState {
	apiResults: {
		suggestions: Suggestion[];
		isLoading: boolean;
		error: string | null;
		source: "manual" | "voice" | null;
		timestamp: number;
	};
	agentLastSearchQuery: string | null;

	setApiResults: (results: Partial<ApiState["apiResults"]>) => void;
	setAgentLastSearchQuery: (query: string | null) => void;

	// Action to reset API state
	resetApiState: () => void;
}

const initialApiState = {
	apiResults: {
		suggestions: [],
		isLoading: false,
		error: null,
		source: null,
		timestamp: 0,
	},
	agentLastSearchQuery: null,
};

export const useApiStore = create<ApiState>()(
	devtools(
		(set) => ({
			...initialApiState,
			setApiResults: (results) =>
				set((state) => ({
					apiResults: {
						...state.apiResults,
						...results,
						timestamp: Date.now(),
					},
				})),
			setAgentLastSearchQuery: (query: string | null) =>
				set({ agentLastSearchQuery: query }),
			resetApiState: () => set(initialApiState),
		}),
		{ name: "ApiStore" },
	),
);
