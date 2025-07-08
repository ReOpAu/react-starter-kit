import { useState } from "react";
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
import { getIntentColor } from "~/utils/addressFinderUtils";
import type { AddressFinderBrainState } from "./AddressFinderBrain";

interface AddressFinderUIProps {
	brainState: AddressFinderBrainState;
}

export function AddressFinderUI({ brainState }: AddressFinderUIProps) {
	const {
		suggestions,
		isLoading,
		isError,
		error,
		selectedResult,
		searchQuery,
		currentIntent,
		isRecording,
		isVoiceActive,
		agentRequestedManual,
		isValidating,
		validationError,
		pendingRuralConfirmation,
		searchHistory,
		addressSelections,
		handleSelectResult,
		handleStartRecording,
		handleStopRecording,
		handleClear,
		handleAcceptRuralAddress,
		handleRecallPreviousSearch,
		handleRecallConfirmedSelection,
		handleManualTyping,
		shouldShowSuggestions,
		shouldShowManualForm,
		shouldShowSelectedResult,
		shouldShowValidationStatus,
		showLowConfidence,
		history,
	} = brainState;

	const [showPreviousSearches, setShowPreviousSearches] = useState(false);
	const [showConfirmedSelections, setShowConfirmedSelections] = useState(false);

	const handleSearchAgain = () => {
		handleClear("user");
	};

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			{/* Modal overlays */}
			{showConfirmedSelections && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
					<PreviousConfirmedSelectionsPanel
						onRecall={(entry) => {
							handleRecallConfirmedSelection(entry);
							setShowConfirmedSelections(false);
						}}
						onClose={() => setShowConfirmedSelections(false)}
					/>
				</div>
			)}
			{showPreviousSearches && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
					<PreviousSearchesPanel
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
									result={selectedResult!}
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
								🤖 Place Suggestions
								<Badge variant="outline" className="bg-blue-100 text-blue-800">
									{suggestions.length} results
								</Badge>
							</CardTitle>
							<p className="text-sm text-blue-600">
								Agent-generated suggestions during conversation
							</p>
						</CardHeader>
						<CardContent>
							<SuggestionsDisplay
								suggestions={suggestions}
								onSelect={handleSelectResult}
								isLoading={isLoading}
								isError={isError}
								error={error}
							/>
						</CardContent>
					</Card>
				)}

				{/* Low confidence result */}
				{shouldShowSuggestions && showLowConfidence && (
					<Card className="border-yellow-200 bg-yellow-50">
						<CardHeader>
							<CardTitle>Low Confidence Result</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="text-yellow-800">
								<p>
									I found one possible match, but I'm not confident it's
									correct:
								</p>
								<button
									type="button"
									onClick={() => handleSelectResult(suggestions[0])}
									className="font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer text-left"
								>
									{suggestions[0]?.description}
								</button>
								<p className="text-xs">
									(Confidence:{" "}
									{Math.round((suggestions[0]?.confidence ?? 0) * 100)}%)
								</p>
							</div>
							<div className="flex gap-2">
								<Button
									onClick={() => handleSelectResult(suggestions[0])}
									className="bg-green-600 hover:bg-green-700"
								>
									Confirm This Result
								</Button>
								<Button onClick={handleSearchAgain} variant="outline">
									Search Again
								</Button>
								<Button
									onClick={() => {
										// This would typically come from the brain state
										// For now, we'll handle it via the clear action
										handleClear("user");
									}}
									variant="outline"
								>
									Manual Input
								</Button>
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
