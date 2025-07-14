import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Mode, Suggestion } from "~/stores/types";

interface ApiState {
	apiResults: {
		suggestions: Suggestion[];
		isLoading: boolean;
		error: string | null;
		source: Mode | null;
		timestamp: number;
	};

	setApiResults: (results: Partial<ApiState["apiResults"]>) => void;

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
			resetApiState: () => set(initialApiState),
		}),
		{ name: "ApiStore" },
	),
);
