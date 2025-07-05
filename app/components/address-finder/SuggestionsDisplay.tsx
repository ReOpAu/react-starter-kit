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
			<div className="flex items-center justify-center py-4">
				<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
				<span className="ml-2">Searching...</span>
			</div>
		);
	}

	if (isError) {
		return (
			<Card className="bg-red-50 border-red-200">
				<CardContent className="pt-4">
					<div className="flex items-center gap-2">
						<span className="text-2xl">❌</span>
						<p className="text-red-700">
							{error?.message || "An unknown error occurred"}
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!suggestions || suggestions.length === 0) {
		return null; // Or a "No results" message
	}

	return (
		<Card>
			<CardContent className="pt-4">
				<ol className="space-y-2 list-decimal">
					{suggestions.map((suggestion) => (
						<li key={suggestion.placeId}>
							<Button
								variant="ghost"
								className="block text-left h-auto px-2"
								onClick={() => onSelect(suggestion)}
							>
								{suggestion.description}
							</Button>
						</li>
					))}
				</ol>
			</CardContent>
		</Card>
	);
};

export default SuggestionsDisplay;
