import type React from "react";
import { useIntentStore } from "~/stores/intentStore";
import { useSearchHistoryStore } from "~/stores/searchHistoryStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import { Button } from "../ui/button";

// Previous Searches memory now stores any search with >1 result (not just confirmed). See: docs/ADDRESS_FINDER_V3_DOCUMENTATION.md, docs/UNIFIED_ADDRESS_SYSTEM.md

interface PreviousSearchesPanelProps {
	onRecall: (entry: SearchHistoryEntry) => void;
	onClose?: () => void;
}

export const PreviousSearchesPanel: React.FC<PreviousSearchesPanelProps> = ({
	onRecall,
	onClose,
}) => {
	const searchHistory = useSearchHistoryStore((s) => s.searchHistory);
	const previousSearches = searchHistory; // Show all searches with multiple results
	const { searchQuery } = useIntentStore();

	if (previousSearches.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">
				No previous searches this session.
			</div>
		);
	}

	return (
		<div className="bg-white border rounded-lg shadow p-4 max-w-md mx-auto">
			<div className="flex justify-between items-center mb-2">
				<h2 className="text-lg font-semibold">Previous Searches</h2>
				{onClose && (
					<Button size="sm" variant="ghost" onClick={onClose}>
						Close
					</Button>
				)}
			</div>
			<ul className="space-y-2">
				{previousSearches.map((entry, idx) => (
					<li
						key={entry.id}
						className="flex items-center justify-between border-b pb-2 last:border-b-0"
					>
						<div>
							<div className="font-medium">
								{idx + 1}. {entry.query}
							</div>
							<div className="text-xs text-gray-500">
								{new Date(entry.timestamp).toLocaleTimeString()} &middot;{" "}
								{entry.resultCount} result{entry.resultCount !== 1 ? "s" : ""}
							</div>
						</div>
						<Button size="sm" onClick={() => onRecall(entry)}>
							Recall
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
};
