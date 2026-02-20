import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type React from "react";
import { cn } from "~/lib/utils";
import type { HistoryItem } from "~/stores/types";

interface HistoryPanelProps {
	history: HistoryItem[];
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
	const [isOpen, setIsOpen] = useState(false);

	if (history.length === 0) {
		return null;
	}

	return (
		<div className="border border-gray-100 rounded-lg">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center justify-between w-full px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<span>Conversation History ({history.length})</span>
				<ChevronDown
					className={cn(
						"w-4 h-4 transition-transform duration-200",
						isOpen && "rotate-180",
					)}
				/>
			</button>
			{isOpen && (
				<div className="px-4 pb-4">
					<div className="space-y-1.5 max-h-40 overflow-y-auto">
						{history.map((entry, index) => (
							<div
								key={`${entry.timestamp}-${index}`}
								className="flex items-center justify-between py-1.5 text-sm"
							>
								<span className="text-gray-700">{entry.text}</span>
								<span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
									{new Date(entry.timestamp || Date.now()).toLocaleTimeString()}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
