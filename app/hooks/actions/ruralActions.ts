import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import type { ActionContext, RuralConfirmationState } from "./types";

/**
 * Factory function that creates rural confirmation action handlers.
 * Takes a context object and returns the rural actions.
 */
export function createRuralActions(
	ctx: ActionContext,
	state: RuralConfirmationState,
) {
	/**
	 * Handler to accept rural address after user confirmation.
	 */
	const handleAcceptRuralAddress = (): void => {
		if (!state.pendingRuralConfirmation) {
			ctx.log("⚠️ No pending rural confirmation to accept");
			return;
		}

		const { result, validation } = state.pendingRuralConfirmation;
		const enrichedResult: Suggestion = {
			...result,
			description: validation.formattedAddress || result.description,
			placeId: validation.placeId || result.placeId,
			types: [...(result.types || []), "user_confirmed_rural"],
		};

		ctx.setSelectedResult(enrichedResult);
		ctx.setActiveSearch({ query: enrichedResult.description, source: "manual" });
		ctx.setAgentRequestedManual(false);
		// Reset options display when making a new selection
		useUIStore.getState().setShowingOptionsAfterConfirmation(false);
		ctx.addHistory({
			type: "user",
			text: `User confirmed rural address: "${enrichedResult.description}"`,
		});
		ctx.clearSessionToken();
		state.setPendingRuralConfirmation(null);

		// Notify agent about rural address selection
		if (ctx.isRecording && ctx.conversationRef.current?.status === "connected") {
			const selectionMessage = `I have confirmed the rural address "${enrichedResult.description}". Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
			ctx.log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);
			try {
				ctx.conversationRef.current?.sendUserMessage?.(selectionMessage);
				ctx.log("✅ Message sent to agent successfully");
				ctx.addHistory({
					type: "system",
					text: "Notified agent about rural address selection",
				});
			} catch (error) {
				ctx.log("❌ Failed to send message to agent:", error);
				ctx.addHistory({
					type: "system",
					text: `Failed to notify agent: ${error}`,
				});
			}
		}
	};

	return {
		handleAcceptRuralAddress,
	};
}
