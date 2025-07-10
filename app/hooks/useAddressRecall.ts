import { useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { useCallback, useState } from "react";
import { useAgentSync } from "~/hooks/useAgentSync";
import { useApiStore } from "~/stores/apiStore";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { useIntentStore } from "~/stores/intentStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
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

	const [isRecallMode, setIsRecallMode] = useState(false);
	const [preserveIntent, setPreserveIntent] = useState<LocationIntent | null>(null);

	const getPlaceSuggestionsAction = useAction(
		api.address.getPlaceSuggestions.getPlaceSuggestions,
	);

	const handleRecallPreviousSearch = useCallback(
		async (entry: SearchHistoryEntry) => {
			setActiveSearch({ query: entry.query, source: entry.context.mode });
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.query);
			setSelectedResult(null);
			setIsRecallMode(true);

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
		(entry: AddressSelectionEntry) => {
			setActiveSearch({
				query: entry.originalQuery,
				source: entry.context.mode as Mode,
			});
			setCurrentIntent(entry.context.intent as LocationIntent);
			setAgentLastSearchQuery(entry.originalQuery);
			setPreserveIntent(entry.context.intent as LocationIntent);
			setApiResults({
				suggestions: [entry.selectedAddress],
				isLoading: false,
				error: null,
				source: entry.context.mode as Mode,
			});
			setSelectedResult(entry.selectedAddress);
			queryClient.setQueryData(
				["addressSearch", entry.originalQuery],
				[entry.selectedAddress],
			);
			setIsRecallMode(true);
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

	const resetRecallMode = useCallback(() => {
		setIsRecallMode(false);
		setPreserveIntent(null);
	}, []);

	return {
		isRecallMode,
		preserveIntent,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		resetRecallMode,
		setPreserveIntent,
	};
}
