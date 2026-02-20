import { useIntentStore } from "~/stores/intentStore";
import type { Suggestion } from "~/stores/types";
import { useUIStore } from "~/stores/uiStore";
import { classifySelectedResult } from "~/utils/addressFinderUtils";
import { enrichSuggestion } from "./enrichmentUtils";
import type { ActionContext, ActionInternalState } from "./types";

/**
 * Factory function that creates selection action handlers.
 * Takes a context object and returns the selection actions.
 */
export function createSelectionActions(
	ctx: ActionContext,
	state: ActionInternalState,
) {
	/**
	 * Notify the agent about a selection via conversation message.
	 */
	const notifyAgentOfSelection = (
		description: string,
		intent: string | null,
		isRural = false,
	): void => {
		if (
			ctx.isRecording &&
			ctx.conversationRef.current?.status === "connected"
		) {
			const messagePrefix = isRural
				? "I have confirmed the rural address"
				: `I have selected`;
			const messageSuffix =
				intent === "address"
					? "from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed."
					: `. This is a ${intent}, not a full address. Please acknowledge this selection.`;

			const selectionMessage = `${messagePrefix} "${description}" ${messageSuffix}`;
			ctx.log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

			try {
				ctx.conversationRef.current?.sendUserMessage?.(selectionMessage);
				ctx.log("✅ Message sent to agent successfully");
				ctx.addHistory({
					type: "system",
					text: isRural
						? "Notified agent about rural address selection"
						: `Notified agent about ${intent === "address" ? "" : intent + " "}selection`,
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

	/**
	 * Store selection in history and sync to agent.
	 * Uses API-verified resultType when available, falls back to client prediction.
	 */
	const storeSelectionAndSync = (
		result: Suggestion,
		searchQuery: string,
	): void => {
		// Priority 1: Use API-verified resultType from Google Places API
		// Priority 2: Fall back to client-predicted intent
		const verifiedIntent = result.resultType;
		const predictedIntent = ctx.currentIntent ?? "general";

		if (verifiedIntent) {
			ctx.log(`✅ Using verified intent from API: "${verifiedIntent}"`);
		} else {
			ctx.log(
				`⚠️ Using predicted intent (no API resultType): "${predictedIntent}"`,
			);
		}

		const finalIntent = verifiedIntent ?? predictedIntent;

		ctx.log(
			`🔧 Storing selection - originalQuery: "${searchQuery}", selectedAddress.description: "${result.description}", intent: "${finalIntent}" (verified: ${!!verifiedIntent})`,
		);
		ctx.addAddressSelection({
			originalQuery: searchQuery,
			selectedAddress: result,
			context: {
				mode: ctx.isRecording ? "voice" : "manual",
				intent: finalIntent,
			},
		});
		ctx.setAgentLastSearchQuery(searchQuery);
		ctx.resetRecallMode();
		// Single consolidated sync at the end
		ctx.syncToAgent();
	};

	/**
	 * Update UI state after selection.
	 */
	const updateSelectionState = (result: Suggestion): void => {
		ctx.setSelectedResult(result);
		ctx.setActiveSearch({
			query: result.description,
			source: "manual",
		});
		ctx.setAgentRequestedManual(false);
		// Reset options display when making a new selection
		useUIStore.getState().setShowingOptionsAfterConfirmation(false);
		ctx.addHistory({
			type: "user",
			text: `Selected: "${result.description}"`,
		});
		ctx.clearSessionToken();
	};

	/**
	 * Handle validation errors with enhanced error messages.
	 */
	const handleValidationError = (error: unknown): void => {
		ctx.log("💥 VALIDATION ACTION FAILED:", error);
		console.error("Full error object:", error);

		let errorMessage = "An unknown error occurred";
		if (error instanceof Error) {
			if (error.message?.includes("require is not defined")) {
				errorMessage =
					"Server-side code execution error. Please check the server logs.";
			} else {
				errorMessage = error.message;
			}
		} else if (typeof error === "object" && error !== null && "data" in error) {
			const errorObj = error as {
				data?: { message?: string };
				message?: string;
			};
			if (errorObj.data?.message) {
				errorMessage = errorObj.data.message;
			} else if (errorObj.message) {
				errorMessage = errorObj.message;
			}
		}

		state.setValidationError(`Validation failed: ${errorMessage}`);
		ctx.addHistory({
			type: "system",
			text: `Validation action failed: ${errorMessage}`,
		});
	};

	/**
	 * Consolidated selection handler with enrichment and validation.
	 */
	const handleSelectResult = async (result: Suggestion): Promise<void> => {
		ctx.log("🎯 === CONSOLIDATED SELECTION FLOW START ===");

		// Step 1: Enrichment
		const enrichedResult = await enrichSuggestion(
			result,
			ctx.queryClient,
			ctx.getPlaceDetailsAction,
		);

		// Step 2: Add to suggestions cache for agent context
		// CRITICAL: Use agentLastSearchQuery to maintain cache consistency for "show options again"
		const { agentLastSearchQuery } = useIntentStore.getState();
		const currentSearchQuery =
			agentLastSearchQuery || ctx.searchQuery || enrichedResult.description;

		const currentSuggestions =
			ctx.queryClient.getQueryData<Suggestion[]>([
				"addressSearch",
				currentSearchQuery,
			]) || [];
		if (!currentSuggestions.find((s) => s.placeId === enrichedResult.placeId)) {
			const updatedSuggestions = [...currentSuggestions, enrichedResult];
			ctx.queryClient.setQueryData(
				["addressSearch", currentSearchQuery],
				updatedSuggestions,
			);
			ctx.log("🔧 Context sync: Added selection to agent's suggestions array");
		}

		// Step 3: Intent classification and validation
		const intent = classifySelectedResult(enrichedResult);
		ctx.log(`🎯 Initial classification from suggestion: ${intent}`);

		if (intent === "address") {
			ctx.log('🔬 Intent is "address", proceeding with full validation.');
			state.setValidationError(null);
			state.setIsValidating(true);

			try {
				// Check if Convex is available before calling the action
				if (!ctx.validateAddressAction) {
					throw new Error(
						"Address validation service is not available. Please ensure Convex dev server is running.",
					);
				}

				const validation = await ctx.validateAddressAction({
					address: enrichedResult.description,
				});

				ctx.log("🔬 VALIDATION RESULT:", validation);

				if (validation.success && validation.isValid) {
					// Further enrich with validation data if available
					const finalResult: Suggestion = {
						...enrichedResult,
						description:
							validation.result?.address.formattedAddress ??
							enrichedResult.description,
						placeId:
							validation.result?.geocode.placeId ?? enrichedResult.placeId,
						lat: validation.result?.geocode?.location?.latitude,
						lng: validation.result?.geocode?.location?.longitude,
					};
					const finalIntent = classifySelectedResult(finalResult);
					ctx.log(`🎯 Final intent after validation: ${finalIntent}`);
					ctx.setCurrentIntent(finalIntent);

					updateSelectionState(finalResult);
					notifyAgentOfSelection(finalResult.description, "address");
					storeSelectionAndSync(finalResult, currentSearchQuery);
				} else if (validation.success && validation.isRuralException) {
					// Rural exception: prompt user for confirmation
					state.setPendingRuralConfirmation({
						result: enrichedResult,
						validation,
					});
					state.setValidationError(null);
					ctx.addHistory({
						type: "system",
						text: `Rural address exception: ${validation.error}`,
					});
				} else {
					const errorMessage =
						validation.error || "The selected address could not be validated.";
					ctx.log(`❌ VALIDATION FAILED: ${errorMessage}`);
					state.setValidationError(errorMessage);
					ctx.addHistory({
						type: "system",
						text: `Validation failed: ${errorMessage}`,
					});
				}
			} catch (error) {
				handleValidationError(error);
			} finally {
				state.setIsValidating(false);
			}
		} else {
			// Non-address intents: proceed without validation
			ctx.log(`🎯 Intent is "${intent}", skipping full validation.`);

			// Preserve intent if this is a recall, otherwise update based on selection
			if (ctx.preserveIntent) {
				ctx.setCurrentIntent(ctx.preserveIntent);
				ctx.setPreserveIntent(null);
			} else {
				ctx.setCurrentIntent(intent);
			}

			updateSelectionState(enrichedResult);
			notifyAgentOfSelection(enrichedResult.description, intent);
			storeSelectionAndSync(enrichedResult, currentSearchQuery);
		}
		ctx.log("🎯 === CONSOLIDATED SELECTION FLOW END ===");
	};

	/**
	 * Legacy handleSelect for backward compatibility (will be removed).
	 */
	const handleSelect = async (result: Suggestion): Promise<void> => {
		ctx.log("🎯 === UNIFIED SELECTION FLOW START ===");
		ctx.log("🎯 Handling selection:", {
			description: result.description,
			placeId: result.placeId,
			types: result.types,
		});

		const intent = classifySelectedResult(result);
		ctx.log(`🎯 Initial classification from suggestion: ${intent}`);
		ctx.setCurrentIntent(intent);

		if (intent === "address") {
			ctx.log('🔬 Intent is "address", proceeding with full validation.');
			state.setValidationError(null);
			state.setIsValidating(true);

			try {
				if (!ctx.validateAddressAction) {
					throw new Error(
						"Address validation service is not available. Please ensure Convex dev server is running.",
					);
				}

				const validation = await ctx.validateAddressAction({
					address: result.description,
				});

				ctx.log("🔬 VALIDATION RESULT:", validation);

				if (validation.success && validation.isValid) {
					const enrichedResult: Suggestion = {
						...result,
						description:
							validation.result?.address.formattedAddress ?? result.description,
						placeId: validation.result?.geocode.placeId ?? result.placeId,
						lat: validation.result?.geocode?.location?.latitude,
						lng: validation.result?.geocode?.location?.longitude,
					};
					const finalIntent = classifySelectedResult(enrichedResult);
					ctx.log(`🎯 Final intent after enrichment: ${finalIntent}`);
					ctx.setCurrentIntent(finalIntent);

					updateSelectionState(enrichedResult);
					notifyAgentOfSelection(enrichedResult.description, "address");
				} else if (validation.success && validation.isRuralException) {
					// Rural exception: prompt user for confirmation
					state.setPendingRuralConfirmation({ result, validation });
					state.setValidationError(null);
					ctx.addHistory({
						type: "system",
						text: `Rural address exception: ${validation.error}`,
					});
				} else {
					const errorMessage =
						validation.error || "The selected address could not be validated.";
					ctx.log(`❌ VALIDATION FAILED: ${errorMessage}`);
					state.setValidationError(errorMessage);
					ctx.addHistory({
						type: "system",
						text: `Validation failed: ${errorMessage}`,
					});
				}
			} catch (error) {
				handleValidationError(error);
			} finally {
				state.setIsValidating(false);
			}
		} else {
			ctx.log(`🎯 Intent is "${intent}", skipping full validation.`);
			ctx.setSelectedResult(result);
			ctx.setActiveSearch({ query: result.description, source: "manual" });
			ctx.setAgentRequestedManual(false);
			useUIStore.getState().setShowingOptionsAfterConfirmation(false);
			ctx.addHistory({
				type: "user",
				text: `Selected: "${result.description}"`,
			});
			ctx.clearSessionToken();

			notifyAgentOfSelection(result.description, intent);
		}
		ctx.log("🎯 === UNIFIED SELECTION FLOW END ===");
	};

	return {
		handleSelectResult,
		handleSelect,
	};
}
