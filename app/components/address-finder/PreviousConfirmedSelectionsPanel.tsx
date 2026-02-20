import { X } from "lucide-react";
import type React from "react";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import { Button } from "../ui/button";

interface PreviousConfirmedSelectionsPanelProps {
	addressSelections: AddressSelectionEntry[];
	onRecall: (entry: AddressSelectionEntry) => void;
	onClose?: () => void;
}

export const PreviousConfirmedSelectionsPanel: React.FC<
	PreviousConfirmedSelectionsPanelProps
> = ({ addressSelections, onRecall, onClose }) => {
	const selections = addressSelections;

	if (selections.length === 0) {
		return (
			<div className="p-6 text-center text-muted-foreground text-sm">
				No confirmed selections this session.
			</div>
		);
	}

	return (
		<div className="p-5">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-base font-medium">Previous Selections</h2>
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
				{selections.map((entry, idx) => (
					<li
						key={entry.id}
						className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0"
					>
						<div>
							<div className="text-sm text-gray-900">
								{entry.selectedAddress?.displayText ||
									entry.selectedAddress?.description}
							</div>
							<div className="text-xs text-muted-foreground mt-0.5">
								{new Date(entry.timestamp).toLocaleTimeString()} &middot; from "
								{entry.originalQuery}"
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
