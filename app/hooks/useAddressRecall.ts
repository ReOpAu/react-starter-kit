import { useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback } from "react";
import { useAgentSync } from "~/hooks/useAgentSync";
import { useApiStore } from "~/stores/apiStore";
import type { ConfirmedSelectionEntry } from "~/stores/confirmedSelectionsStore";
import { useIntentStore } from "~/stores/intentStore";
import type { SearchMemoryEntry } from "~/stores/searchMemoryStore";
import type { LocationIntent, Mode } from "~/stores/types";

export function useAddressRecall() {
	const queryClient = useQueryClient();
	const { syncToAgent } = useAgentSync();
	const { setApiResults } = useApiStore();
	const {
		setActiveSearch,
		setCurrentIntent,
		setAgentLastSearchQuery,
		setSelectedResult,
	} = useIntentStore();

	const getPlaceSuggestionsAction = useAction(
		api.address.getPlaceSuggestions.getPlaceSuggestions,
	);

	const handleRecallPreviousSearch = useCallback(
		async (entry: SearchMemoryEntry) => {
			setActiveSearch({ query: entry.query, source: entry.context.mode });
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.query);
			setSelectedResult(null);

			// Trigger a new search API call for the recalled query
			const newResults = await getPlaceSuggestionsAction({
				query: entry.query,
				intent: entry.context.intent as
					| "general"
					| "suburb"
					| "street"
					| "address"
					| undefined,
				isAutocomplete: false,
				sessionToken: undefined,
			});

			setApiResults({
				suggestions: newResults.success ? newResults.suggestions : [],
				isLoading: false,
				error: newResults.success ? null : newResults.error,
				source: entry.context.mode,
			});

			queryClient.setQueryData(
				["addressSearch", entry.query],
				newResults.success ? newResults.suggestions : [],
			);

			syncToAgent();
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			syncToAgent,
			queryClient,
			getPlaceSuggestionsAction,
		],
	);

	const handleRecallConfirmedSelection = useCallback(
		(entry: ConfirmedSelectionEntry) => {
			setActiveSearch({
				query: entry.query,
				source: entry.context.mode as Mode,
			});
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.query);
			setApiResults({
				suggestions: [entry.selectedResult],
				isLoading: false,
				error: null,
				source: entry.context.mode as Mode,
			});
			setSelectedResult(entry.selectedResult);
			queryClient.setQueryData(
				["addressSearch", entry.query],
				[entry.selectedResult],
			);
			syncToAgent();
		},
		[
			setActiveSearch,
			setCurrentIntent,
			setAgentLastSearchQuery,
			setApiResults,
			setSelectedResult,
			syncToAgent,
			queryClient,
		],
	);

	return {
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
	};
}
