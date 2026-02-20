import { AlertCircle } from "lucide-react";
import type React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Suggestion } from "~/stores/types";

interface SuggestionsDisplayProps {
	suggestions?: Suggestion[];
	isLoading: boolean;
	isError: boolean;
	error: Error | null;
	onSelect: (suggestion: Suggestion) => void;
}

const SuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
	suggestions,
	isLoading,
	isError,
	error,
	onSelect,
}) => {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-6">
				<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
				<span className="ml-2 text-sm text-muted-foreground">Searching...</span>
			</div>
		);
	}

	if (isError) {
		return (
			<Card className="border-red-100">
				<CardContent className="pt-4">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 text-red-500" />
						<p className="text-sm text-red-600">
							{error?.message || "An unknown error occurred"}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!suggestions || suggestions.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			{suggestions.map((suggestion, index) => {
				const confidence = suggestion.confidence ?? 0.5;
				const isHighConfidence = confidence >= 0.8;
				const isMediumConfidence = confidence >= 0.6;

				return (
					<Button
						key={suggestion.placeId}
						variant="ghost"
						className="w-full h-auto p-4 justify-start text-left border border-gray-100 rounded-lg hover:bg-accent/50 hover:border-gray-200 transition-all"
						onClick={() => onSelect(suggestion)}
					>
						<div className="flex items-center gap-3 w-full">
							{/* Ranking number */}
							<span className="text-xs text-muted-foreground tabular-nums min-w-5">
								{index + 1}
							</span>

							{/* Content */}
							<div className="flex-1 min-w-0">
								<p className="text-sm text-gray-900 leading-tight truncate">
									{suggestion.displayText || suggestion.description}
								</p>
								<div className="flex items-center gap-2 mt-1">
									<span className="text-xs text-muted-foreground">
										{suggestion.resultType || "General"}
									</span>
									<span className="text-xs text-muted-foreground">
										{Math.round(confidence * 100)}% match
									</span>
								</div>
							</div>

							{/* Confidence dot */}
							<div
								className={`w-2 h-2 rounded-full flex-shrink-0 ${
									isHighConfidence
										? "bg-green-500"
										: isMediumConfidence
											? "bg-blue-500"
											: "bg-yellow-500"
								}`}
							/>
						</div>
					</Button>
				);
			})}

			<p className="text-xs text-muted-foreground pt-2 px-1">
				Results ranked by relevance. Select the best match.
			</p>
		</div>
	);
};

export default SuggestionsDisplay;
