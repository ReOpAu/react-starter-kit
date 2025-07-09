import type React from "react";
import { Badge } from "~/components/ui/badge";
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
				<div className="space-y-3">
					{suggestions.map((suggestion, index) => {
						const confidence = suggestion.confidence ?? 0.5;
						const isHighConfidence = confidence >= 0.8;
						const isMediumConfidence = confidence >= 0.6;

						return (
							<div
								key={suggestion.placeId}
								className={`relative border rounded-lg transition-all hover:shadow-md ${
									isHighConfidence
										? "border-green-200 bg-green-50"
										: isMediumConfidence
											? "border-blue-200 bg-blue-50"
											: "border-yellow-200 bg-yellow-50"
								}`}
							>
								<Button
									variant="ghost"
									className="w-full h-auto p-4 justify-start text-left hover:bg-transparent"
									onClick={() => onSelect(suggestion)}
								>
									<div className="flex-1 space-y-2">
										{/* Main result with ranking */}
										<div className="flex items-start gap-3">
											<Badge
												variant="outline"
												className="text-xs px-2 py-1 bg-white"
											>
												#{index + 1}
											</Badge>
											<div className="flex-1">
												<p className="font-medium text-gray-900 leading-tight">
													{suggestion.displayText || suggestion.description}
												</p>
												{/* Result type and confidence */}
												<div className="flex items-center gap-2 mt-1">
													<Badge variant="secondary" className="text-xs">
														{suggestion.resultType || "General"}
													</Badge>
													<Badge
														variant="outline"
														className={`text-xs ${
															isHighConfidence
																? "border-green-500 text-green-700"
																: isMediumConfidence
																	? "border-blue-500 text-blue-700"
																	: "border-yellow-500 text-yellow-700"
														}`}
													>
														{Math.round(confidence * 100)}% match
													</Badge>
												</div>
											</div>
										</div>

										{/* Additional metadata */}
										{suggestion.types && suggestion.types.length > 0 && (
											<div className="text-xs text-gray-600 ml-10">
												<span className="font-medium">Categories:</span>{" "}
												{suggestion.types.slice(0, 3).join(", ")}
												{suggestion.types.length > 3 &&
													` +${suggestion.types.length - 3} more`}
											</div>
										)}
									</div>

									{/* Confidence indicator */}
									<div className="flex flex-col items-center ml-2">
										<div
											className={`w-3 h-3 rounded-full ${
												isHighConfidence
													? "bg-green-500"
													: isMediumConfidence
														? "bg-blue-500"
														: "bg-yellow-500"
											}`}
										/>
										<span className="text-xs text-gray-500 mt-1">
											{isHighConfidence
												? "High"
												: isMediumConfidence
													? "Good"
													: "Fair"}
										</span>
									</div>
								</Button>
							</div>
						);
					})}
				</div>

				{/* Helpful footer */}
				<div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
					<p className="flex items-center gap-1">
						<span>💡</span>
						<strong>Tip:</strong> Results are ranked by relevance and
						confidence. Higher-ranked results are typically more accurate.
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export default SuggestionsDisplay;
