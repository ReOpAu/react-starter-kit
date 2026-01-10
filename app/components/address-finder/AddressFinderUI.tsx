import { useRef, useState } from "react";
import {
	HistoryPanel,
	ManualSearchForm,
	SelectedResultCard,
	SuggestionsDisplay,
	VoiceInputController,
} from "~/components/address-finder";
import { PreviousConfirmedSelectionsPanel } from "~/components/address-finder/PreviousConfirmedSelectionsPanel";
import { PreviousSearchesPanel } from "~/components/address-finder/PreviousSearchesPanel";
import SuburbBoundaryMap from "~/components/address-finder/SuburbBoundaryMap";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import type { AddressSelectionEntry } from "~/stores/addressSelectionStore";
import type { SearchHistoryEntry } from "~/stores/searchHistoryStore";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";
import { getIntentColor } from "~/utils/addressFinderUtils";

interface AddressFinderUIProps {
	// Handlers from the brain component
	handleSelectResult: (result: Suggestion) => void;
	handleStartRecording: () => void;
	handleStopRecording: () => void;
	handleClear: (source: "user" | "agent") => void;
	handleAcceptRuralAddress: () => void;
	handleRecallPreviousSearch: (entry: SearchHistoryEntry) => void;
	handleRecallConfirmedSelection: (entry: AddressSelectionEntry) => void;
	handleManualTyping: (query: string) => void;
	handleHideOptions: () => void;

	// State from brain (no direct store imports)
	state: {
		suggestions: Suggestion[];
		isLoading: boolean;
		searchQuery: string;
		selectedResult: Suggestion | null;
		currentIntent: LocationIntent;
		isRecording: boolean;
		isVoiceActive: boolean;
		agentRequestedManual: boolean;
		history: HistoryItem[];
		searchHistory: SearchHistoryEntry[];
		addressSelections: AddressSelectionEntry[];
	};

	// Computed state
	shouldShowSuggestions: boolean;
	shouldShowManualForm: boolean;
	shouldShowSelectedResult: boolean;
	shouldShowValidationStatus: boolean;
	showLowConfidence: boolean;
	showingOptionsAfterConfirmation: boolean;
	autoCorrection: any;

	// Validation state
	isValidating: boolean;
	validationError: string | null;
	pendingRuralConfirmation: any;
}

export function AddressFinderUI({
	handleSelectResult,
	handleStartRecording,
	handleStopRecording,
	handleClear,
	handleAcceptRuralAddress,
	handleRecallPreviousSearch,
	handleRecallConfirmedSelection,
	handleManualTyping,
	handleHideOptions,
	state,
	shouldShowSuggestions,
	shouldShowManualForm,
	shouldShowSelectedResult,
	shouldShowValidationStatus,
	showLowConfidence,
	showingOptionsAfterConfirmation,
	autoCorrection,
	isValidating,
	validationError,
	pendingRuralConfirmation,
}: AddressFinderUIProps) {
	// Destructure state from props (no direct store imports)
	const {
		suggestions,
		isLoading,
		searchQuery,
		selectedResult,
		currentIntent,
		isRecording,
		isVoiceActive,
		agentRequestedManual,
		history,
		searchHistory,
		addressSelections,
	} = state;

	// Debug: Log when currentIntent changes in UI
	const prevIntentRef = useRef(currentIntent);
	if (prevIntentRef.current !== currentIntent) {
		console.log(
			"🎯 UI Badge Update: currentIntent changed from",
			prevIntentRef.current,
			"to",
			currentIntent,
		);
		prevIntentRef.current = currentIntent;
	}

	const [showPreviousSearches, setShowPreviousSearches] = useState(false);
	const [showConfirmedSelections, setShowConfirmedSelections] = useState(false);

	const handleSearchAgain = () => {
		handleClear("user");
	};

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			{/* Modal overlays */}
			{showConfirmedSelections && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<PreviousConfirmedSelectionsPanel
						addressSelections={addressSelections}
						onRecall={(entry) => {
							handleRecallConfirmedSelection(entry);
							setShowConfirmedSelections(false);
						}}
						onClose={() => setShowConfirmedSelections(false)}
					/>
				</div>
			)}
			{showPreviousSearches && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<PreviousSearchesPanel
						searchHistory={searchHistory}
						onRecall={(entry) => {
							handleRecallPreviousSearch(entry);
							setShowPreviousSearches(false);
						}}
						onClose={() => setShowPreviousSearches(false)}
					/>
				</div>
			)}

			<div className="space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">Intelligent Address Finder v3</h1>
					<p className="text-sm text-gray-600">
						Voice-enabled address search with AI assistance
					</p>
				</div>

				{/* Status bar */}
				<div className="flex items-center gap-2">
					<Badge
						variant="outline"
						className={getIntentColor(currentIntent || "general")}
					>
						Intent: {currentIntent || "general"}
					</Badge>
					{isRecording && (
						<Badge
							variant="secondary"
							className="animate-pulse bg-red-100 text-red-800"
						>
							🎤 Conversation Active
							{agentRequestedManual && " + Manual Input"}
						</Badge>
					)}
					<Button
						size="sm"
						variant="outline"
						onClick={() => setShowPreviousSearches(true)}
						disabled={searchHistory.length === 0}
						className="relative"
					>
						Previous Searches
						<span className="ml-2">
							<Badge variant="secondary" className="px-2 py-0.5 text-xs">
								{searchHistory.length}
							</Badge>
						</span>
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setShowConfirmedSelections(true)}
						disabled={addressSelections.length === 0}
						className="relative"
					>
						Previous Selections
						<span className="ml-2">
							<Badge variant="secondary" className="px-2 py-0.5 text-xs">
								{addressSelections.length}
							</Badge>
						</span>
					</Button>
				</div>

				{/* Rural address confirmation */}
				{pendingRuralConfirmation && (
					<Card className="border-yellow-300 bg-yellow-50">
						<CardHeader>
							<CardTitle>Rural Address Exception</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="mb-2">
								<strong>
									This address could not be confirmed at the property level, but
									appears to be a rural address.
								</strong>
								<br />
								<span>
									If you are sure this is correct, you may accept it anyway.
								</span>
								<div className="mt-2 text-sm text-gray-700">
									<div>
										<strong>Address:</strong>{" "}
										{pendingRuralConfirmation.validation.formattedAddress ||
											pendingRuralConfirmation.result.description}
									</div>
									<div>
										<strong>Validation granularity:</strong>{" "}
										{pendingRuralConfirmation.validation.validationGranularity}
									</div>
								</div>
							</div>
							<div className="flex gap-2">
								<Button onClick={handleAcceptRuralAddress}>
									Accept Anyway
								</Button>
								<Button variant="outline" onClick={() => handleClear("user")}>
									Cancel
								</Button>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Main card */}
				<Card>
					<CardHeader>
						<CardTitle>Address Lookup</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<VoiceInputController
							isRecording={isRecording}
							isVoiceActive={isVoiceActive}
							startRecording={handleStartRecording}
							stopRecording={handleStopRecording}
						/>
						<Separator />

						{shouldShowManualForm ? (
							<div className="space-y-4">
								{agentRequestedManual && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
										<div className="flex items-start gap-3">
											<div className="text-blue-600 text-lg">🤖 → 📝</div>
											<div>
												<p className="text-sm font-medium text-blue-800 mb-1">
													{isRecording
														? "Hybrid Mode Active"
														: "AI Agent requested manual input"}
												</p>
												<p className="text-xs text-blue-600">
													{isRecording
														? "You can now type addresses while continuing the voice conversation."
														: "The AI suggested typing your address manually for better accuracy."}
												</p>
											</div>
										</div>
									</div>
								)}

								<ManualSearchForm
									onSelect={handleSelectResult}
									disabled={isValidating}
									onTyping={handleManualTyping}
								/>
							</div>
						) : (
							<div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
								<p className="text-sm text-gray-600 mb-2">
									🤖 Voice conversation is active
								</p>
								<p className="text-xs text-gray-500">
									The AI will manage place suggestions through conversation. It
									can enable manual input if needed.
								</p>
							</div>
						)}

						{shouldShowValidationStatus && (
							<Card className="border-yellow-200 bg-yellow-50/50">
								<CardContent className="p-4">
									{isValidating && (
										<p className="font-semibold animate-pulse">
											Validating selected address...
										</p>
									)}
									{validationError && (
										<p className="text-red-600 font-semibold">
											Validation Error: {validationError}
										</p>
									)}
								</CardContent>
							</Card>
						)}

						{shouldShowSelectedResult && (
							<>
								<SelectedResultCard
									result={selectedResult}
									onClear={() => handleClear("user")}
									lat={selectedResult?.lat}
									lng={selectedResult?.lng}
								/>
								{/* Suburb boundary map */}
								{selectedResult &&
									Array.isArray(selectedResult.types) &&
									(selectedResult.types.includes("locality") ||
										selectedResult.types.includes("suburb")) &&
									selectedResult.placeId && (
										<div className="mt-4">
											<SuburbBoundaryMap
												suburbName={selectedResult.description}
												placeId={selectedResult.placeId}
												mapId="a26a63faa4c27b9388a5618d"
											/>
										</div>
									)}
							</>
						)}
					</CardContent>
				</Card>

				{/* Suggestions display */}
				{shouldShowSuggestions && !showLowConfidence && (
					<Card className="border-blue-200 bg-blue-50">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								{showingOptionsAfterConfirmation
									? "📋 Address Options"
									: "🤖 Place Suggestions"}
								<Badge variant="outline" className="bg-blue-100 text-blue-800">
									{suggestions.length} results
								</Badge>
							</CardTitle>
							<p className="text-sm text-blue-600">
								{showingOptionsAfterConfirmation
									? "Previous address options displayed again - you can select a different option"
									: "Agent-generated suggestions during conversation"}
							</p>
							{showingOptionsAfterConfirmation && (
								<Button
									size="sm"
									variant="outline"
									onClick={handleHideOptions}
									className="mt-2"
								>
									Hide Options
								</Button>
							)}
						</CardHeader>
						<CardContent>
							<SuggestionsDisplay
								suggestions={suggestions}
								onSelect={handleSelectResult}
								isLoading={isLoading}
								isError={false}
								error={null}
							/>
						</CardContent>
					</Card>
				)}

				{/* Enhanced Low Confidence Result with Intelligent Analysis */}
				{shouldShowSuggestions && showLowConfidence && (
					<Card
						className={
							autoCorrection?.suburbChanged
								? "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50"
								: "border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50"
						}
					>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								{autoCorrection?.suburbChanged ? (
									<>
										<span className="text-2xl">🔄</span>
										<span>Address Corrected</span>
										<Badge
											variant="outline"
											className="bg-blue-100 text-blue-800"
										>
											Suburb Fixed
										</Badge>
									</>
								) : (
									<>
										<span className="text-2xl">🤔</span>
										<span>Uncertain Match Found</span>
										<Badge
											variant="outline"
											className="bg-yellow-100 text-yellow-800"
										>
											{Math.round((suggestions[0]?.confidence ?? 0) * 100)}%
											confidence
										</Badge>
									</>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							{/* Input vs Result Comparison */}
							<div
								className={`bg-white p-4 rounded-lg border ${
									autoCorrection?.suburbChanged
										? "border-blue-200"
										: "border-yellow-200"
								}`}
							>
								{autoCorrection?.suburbChanged ? (
									<div className="space-y-3">
										<div className="flex items-center gap-2 mb-3">
											<span className="text-lg">🏘️</span>
											<h3 className="font-semibold text-blue-800">
												Suburb Correction Detected
											</h3>
										</div>
										<div className="grid md:grid-cols-2 gap-4">
											<div>
												<p className="text-sm font-semibold text-gray-700 mb-1">
													🎤 You said:
												</p>
												<p className="text-gray-900 font-medium bg-gray-50 p-2 rounded">
													"{searchQuery}"
												</p>
												<p className="text-xs text-red-600 mt-1">
													→ Suburb:{" "}
													<strong>{autoCorrection.originalSuburb}</strong>
												</p>
											</div>
											<div>
												<p className="text-sm font-semibold text-gray-700 mb-1">
													✅ Corrected address:
												</p>
												<button
													type="button"
													onClick={() => handleSelectResult(suggestions[0])}
													className="w-full text-left font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded border border-blue-200 transition-colors"
												>
													{suggestions[0]?.description}
												</button>
												<p className="text-xs text-green-600 mt-1">
													→ Suburb:{" "}
													<strong>{autoCorrection.correctedSuburb}</strong>
												</p>
											</div>
										</div>
										<div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
											<p className="text-sm text-blue-800">
												<strong>🏠 Good news!</strong> I found the correct
												address.
												<strong> {autoCorrection.originalSuburb}</strong> was
												corrected to
												<strong> {autoCorrection.correctedSuburb}</strong> - the
												actual suburb where this address is located.
											</p>
										</div>
									</div>
								) : (
									<div className="grid md:grid-cols-2 gap-4">
										<div>
											<p className="text-sm font-semibold text-gray-700 mb-1">
												🎤 What I heard/received:
											</p>
											<p className="text-gray-900 font-medium bg-gray-50 p-2 rounded">
												"{searchQuery}"
											</p>
										</div>
										<div>
											<p className="text-sm font-semibold text-gray-700 mb-1">
												🎯 Best match found:
											</p>
											<button
												type="button"
												onClick={() => handleSelectResult(suggestions[0])}
												className="w-full text-left font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 p-2 rounded border border-blue-200 transition-colors"
											>
												{suggestions[0]?.description}
											</button>
										</div>
									</div>
								)}
							</div>

							{/* Intelligent Analysis Section */}
							<div className="space-y-3">
								<h4 className="font-semibold text-gray-800 flex items-center gap-2">
									<span>🧠</span>
									Why I'm uncertain:
								</h4>

								<div className="grid gap-2 text-sm">
									{/* Intent Mismatch Analysis */}
									{currentIntent &&
										currentIntent !== suggestions[0]?.resultType && (
											<div className="flex items-start gap-2 bg-yellow-100 p-3 rounded-lg">
												<span className="text-yellow-600">⚠️</span>
												<div>
													<strong>Intent mismatch:</strong> You searched for a{" "}
													<strong>{currentIntent}</strong>, but this appears to
													be a <strong>{suggestions[0]?.resultType}</strong>.
												</div>
											</div>
										)}

									{/* Low Query Similarity */}
									{searchQuery &&
										suggestions[0]?.description &&
										!suggestions[0].description
											.toLowerCase()
											.includes(searchQuery.toLowerCase().substring(0, 3)) && (
											<div className="flex items-start gap-2 bg-blue-100 p-3 rounded-lg">
												<span className="text-blue-600">🔍</span>
												<div>
													<strong>Different wording:</strong> Your search terms
													don't closely match this result.
												</div>
											</div>
										)}

									{/* Voice Input Specific Help */}
									{isRecording && (
										<div className="flex items-start gap-2 bg-purple-100 p-3 rounded-lg">
											<span className="text-purple-600">🎤</span>
											<div>
												<strong>Voice transcription:</strong> Speech recognition
												might have misunderstood your input.
											</div>
										</div>
									)}

									{/* Establishment vs Geographic */}
									{suggestions[0]?.types?.some((type) =>
										[
											"restaurant",
											"store",
											"hospital",
											"school",
											"point_of_interest",
										].includes(type),
									) &&
										currentIntent !== "general" && (
											<div className="flex items-start gap-2 bg-orange-100 p-3 rounded-lg">
												<span className="text-orange-600">🏢</span>
												<div>
													<strong>Business vs location:</strong> This appears to
													be a business/establishment rather than a geographic
													location.
												</div>
											</div>
										)}
								</div>
							</div>

							{/* Enhanced Suggestion Details */}
							<div className="bg-gray-50 p-4 rounded-lg">
								<h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
									<span>📋</span>
									Match Details:
								</h4>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
									<div>
										<span className="font-semibold">Type:</span>
										<br />
										<Badge variant="secondary" className="text-xs">
											{suggestions[0]?.resultType || "Unknown"}
										</Badge>
									</div>
									<div>
										<span className="font-semibold">Confidence:</span>
										<br />
										<span
											className={`font-bold ${
												(suggestions[0]?.confidence ?? 0) > 0.8
													? "text-green-600"
													: (suggestions[0]?.confidence ?? 0) > 0.6
														? "text-yellow-600"
														: "text-red-600"
											}`}
										>
											{Math.round((suggestions[0]?.confidence ?? 0) * 100)}%
										</span>
									</div>
									{suggestions[0]?.types && (
										<div className="col-span-2">
											<span className="font-semibold">Categories:</span>
											<br />
											<span className="text-gray-600">
												{suggestions[0].types.slice(0, 3).join(", ")}
												{suggestions[0].types.length > 3 && "..."}
											</span>
										</div>
									)}
								</div>
							</div>

							{/* Smart Action Buttons */}
							<div className="space-y-3">
								<div className="flex flex-wrap gap-2">
									{autoCorrection?.suburbChanged ? (
										<>
											<Button
												onClick={() => handleSelectResult(suggestions[0])}
												className="bg-blue-600 hover:bg-blue-700 flex-1 min-w-32"
											>
												✅ Accept Correction
											</Button>
											<Button
												onClick={handleSearchAgain}
												variant="outline"
												className="flex-1 min-w-32"
											>
												🔄 Search Again
											</Button>
										</>
									) : (
										<>
											<Button
												onClick={() => handleSelectResult(suggestions[0])}
												className="bg-green-600 hover:bg-green-700 flex-1 min-w-32"
											>
												✅ Yes, Use This
											</Button>
											<Button
												onClick={handleSearchAgain}
												variant="outline"
												className="flex-1 min-w-32"
											>
												🔄 Try Again
											</Button>
										</>
									)}
								</div>

								{/* Context-Aware Suggestions */}
								<div className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
									<p className="font-semibold mb-1">💡 Suggestions:</p>
									{isRecording ? (
										<p>
											• Try speaking more clearly or use the manual input below
										</p>
									) : (
										<p>
											• Try being more specific (e.g., include suburb, street
											number, or state)
										</p>
									)}
									{currentIntent !== "general" &&
										suggestions[0]?.resultType !== currentIntent && (
											<p>
												• Search for "{suggestions[0]?.resultType}" instead of "
												{currentIntent}"
											</p>
										)}
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* History panel */}
				<HistoryPanel history={history} />
			</div>
		</div>
	);
}
