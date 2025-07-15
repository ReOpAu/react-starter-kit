import { AddressFinderBrain } from "~/components/address-finder/AddressFinderBrain";
// import { AddressFinderDebug } from "~/components/address-finder/AddressFinderDebug";
import { AddressFinderUI } from "~/components/address-finder/AddressFinderUI";
import { PublicLayout } from "~/components/layout/PublicLayout";

export default function AddressFinder() {
	return (
		<PublicLayout>
			<AddressFinderBrain>
				{(handlers) => (
					<>
						<AddressFinderUI
							handleSelectResult={handlers.handleSelectResult}
							handleStartRecording={handlers.handleStartRecording}
							handleStopRecording={handlers.handleStopRecording}
							handleClear={handlers.handleClear}
							handleAcceptRuralAddress={handlers.handleAcceptRuralAddress}
							handleRecallPreviousSearch={handlers.handleRecallPreviousSearch}
							handleRecallConfirmedSelection={handlers.handleRecallConfirmedSelection}
							handleManualTyping={handlers.handleManualTyping}
							shouldShowSuggestions={handlers.shouldShowSuggestions}
							shouldShowManualForm={handlers.shouldShowManualForm}
							shouldShowSelectedResult={handlers.shouldShowSelectedResult}
							shouldShowValidationStatus={handlers.shouldShowValidationStatus}
							showLowConfidence={handlers.showLowConfidence}
							showingOptionsAfterConfirmation={handlers.showingOptionsAfterConfirmation}
							autoCorrection={handlers.autoCorrection}
							isValidating={handlers.isValidating}
							validationError={handlers.validationError}
							pendingRuralConfirmation={handlers.pendingRuralConfirmation}
						/>
						{/* <AddressFinderDebug
							handleRequestAgentState={handlers.handleRequestAgentState}
							handleClear={handlers.handleClear}
							agentStateForDebug={handlers.agentStateForDebug}
							sessionToken={handlers.sessionToken}
							conversationStatus={handlers.conversationStatus}
						/> */}
					</>
				)}
			</AddressFinderBrain>
		</PublicLayout>
	);
}
