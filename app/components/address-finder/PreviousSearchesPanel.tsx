import { X } from "lucide-react";
import type React from "react";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import { Button } from "../ui/button";

// Previous Searches memory now stores any search with >1 result (not just confirmed). See: docs/ADDRESS_FINDER_V3_DOCUMENTATION.md, docs/UNIFIED_ADDRESS_SYSTEM.md

interface PreviousSearchesPanelProps {
	searchHistory: SearchHistoryEntry[];
	onRecall: (entry: SearchHistoryEntry) => void;
	onClose?: () => void;
}

export const PreviousSearchesPanel: React.FC<PreviousSearchesPanelProps> = ({
	searchHistory,
	onRecall,
	onClose,
}) => {
	const previousSearches = searchHistory; // Show all searches with multiple results

	if (previousSearches.length === 0) {
		return (
			<div className="p-6 text-center text-muted-foreground text-sm">
				No previous searches this session.
			</div>
		);
	}

	return (
		<div className="p-5">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-base font-medium">Previous Searches</h2>
				{onClose && (
					<Button
						size="sm"
						variant="ghost"
						onClick={onClose}
						className="text-muted-foreground h-8 w-8 p-0"
					>
						<X className="w-4 h-4" />
					</Button>
				)}
			</div>
			<ul className="space-y-1">
				{previousSearches.map((entry, idx) => (
					<li
						key={entry.id}
						className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0"
					>
						<div>
							<div className="text-sm text-gray-900">{entry.query}</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								{new Date(entry.timestamp).toLocaleTimeString()} &middot;{" "}
								{entry.resultCount} result{entry.resultCount !== 1 ? "s" : ""}
							</div>
						</div>
						<Button
							size="sm"
							variant="ghost"
							className="text-xs h-7"
							onClick={() => onRecall(entry)}
						>
							Recall
						</Button>
					</li>
				))}
			</ul>
		</div>
	);
};
