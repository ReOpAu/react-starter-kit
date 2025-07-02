import type { useConversation } from "@elevenlabs/react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { type RefObject, useCallback, useState } from "react";
import { useIntentStore } from "~/stores/intentStore";
import type { HistoryItem, LocationIntent, Suggestion } from "~/stores/types";
import { classifySelectedResult } from "~/utils/addressFinderUtils";
import { useReliableSync } from "./useReliableSync";

type UseActionHandlerDependencies = {
	log: (...args: any[]) => void;
	setCurrentIntent: (intent: LocationIntent) => void;
	setSelectedResult: (result: Suggestion | null) => void;
	setActiveSearch: (payload: {
		query: string;
		source: "manual" | "voice";
	}) => void;
	setAgentRequestedManual: (requested: boolean) => void;
	addHistory: (item: HistoryItem) => void;
	getSessionToken: () => string;
	clearSessionToken: () => void;
	isRecording: boolean;
	conversationRef: RefObject<ReturnType<typeof useConversation> | null>;
	queryClient: QueryClient;
	clearSelectionAndSearch: () => void;
};

export function useActionHandler({
	log,
	setCurrentIntent,
	setSelectedResult,
	setActiveSearch,
	setAgentRequestedManual,
	addHistory,
	getSessionToken,
	clearSessionToken,
	isRecording,
	conversationRef,
	queryClient,
	clearSelectionAndSearch,
}: UseActionHandlerDependencies) {
	const [isValidating, setIsValidating] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);
	const [pendingRuralConfirmation, setPendingRuralConfirmation] =
		useState<null | { result: Suggestion; validation: any }>(null);
	const validateAddressAction = useAction(api.location.validateAddress);
	const { performReliableSync } = useReliableSync();

	const handleSelect = useCallback(
		async (result: Suggestion) => {
			log("🎯 === UNIFIED SELECTION FLOW START ===");
			log("🎯 Handling selection:", {
				description: result.description,
				placeId: result.placeId,
				types: result.types,
			});

			const intent = classifySelectedResult(result);
			log(`🎯 Initial classification from suggestion: ${intent}`);
			setCurrentIntent(intent);

			if (intent === "address") {
				log('🔬 Intent is "address", proceeding with full validation.');
				setValidationError(null);
				setIsValidating(true);

				try {
					const validation = await validateAddressAction({
						address: result.description,
					});

					log("🔬 VALIDATION RESULT:", validation);

					if (validation.success && validation.isValid) {
						const enrichedResult: Suggestion = {
							...result,
							description: validation.result.address.formattedAddress,
							placeId: validation.result.geocode.placeId,
							lat: validation.result.geocode?.location?.latitude,
							lng: validation.result.geocode?.location?.longitude,
							// You can add more enriched data here if your Suggestion type supports it
						};
						const finalIntent = classifySelectedResult(enrichedResult);
						log(`🎯 Final intent after enrichment: ${finalIntent}`);
						setCurrentIntent(finalIntent);

						setSelectedResult(enrichedResult);
						setActiveSearch({
							query: enrichedResult.description,
							source: "manual",
						});
						setAgentRequestedManual(false);
						addHistory({
							type: "user",
							text: `Selected: "${enrichedResult.description}"`,
						});

						clearSessionToken();

						if (
							isRecording &&
							conversationRef.current?.status === "connected"
						) {
							const selectionMessage = `I have selected "${enrichedResult.description}" from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
							log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

							try {
								conversationRef.current?.sendUserMessage?.(selectionMessage);
								log("✅ Message sent to agent successfully");
								addHistory({
									type: "system",
									text: "Notified agent about selection",
								});
							} catch (error) {
								log("❌ Failed to send message to agent:", error);
								addHistory({
									type: "system",
									text: `Failed to notify agent: ${error}`,
								});
							}
						}
					} else if (
						validation.success &&
						"isRuralException" in validation &&
						validation.isRuralException
					) {
						// Rural exception: prompt user for confirmation
						setPendingRuralConfirmation({ result, validation });
						setValidationError(null);
						addHistory({
							type: "system",
							text: `Rural address exception: ${validation.error}`,
						});
					} else {
						const errorMessage =
							validation.error ||
							"The selected address could not be validated.";
						log(`❌ VALIDATION FAILED: ${errorMessage}`);
						setValidationError(errorMessage);
						addHistory({
							type: "system",
							text: `Validation failed: ${errorMessage}`,
						});
					}
				} catch (error: any) {
					log("💥 VALIDATION ACTION FAILED:", error);
					const errorMessage =
						error.data?.message || error.message || "An unknown error occurred";
					setValidationError(`Validation failed: ${errorMessage}`);
					addHistory({
						type: "system",
						text: `Validation action failed: ${errorMessage}`,
					});
				} finally {
					setIsValidating(false);
				}
			} else {
				log(`🎯 Intent is "${intent}", skipping full validation.`);
				setSelectedResult(result);
				setActiveSearch({ query: result.description, source: "manual" });
				setAgentRequestedManual(false);
				addHistory({ type: "user", text: `Selected: "${result.description}"` });
				clearSessionToken();

				if (isRecording && conversationRef.current?.status === "connected") {
					const selectionMessage = `I have selected "${result.description}". This is a ${intent}, not a full address. Please acknowledge this selection.`;
					log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);

					try {
						conversationRef.current?.sendUserMessage?.(selectionMessage);
						log("✅ Message sent to agent successfully");
						addHistory({
							type: "system",
							text: `Notified agent about ${intent} selection`,
						});
					} catch (error) {
						log("❌ Failed to send message to agent:", error);
						addHistory({
							type: "system",
							text: `Failed to notify agent: ${error}`,
						});
					}
				}
			}
			log("🎯 === UNIFIED SELECTION FLOW END ===");
		},
		[
			log,
			setCurrentIntent,
			setSelectedResult,
			setActiveSearch,
			setAgentRequestedManual,
			addHistory,
			clearSessionToken,
			isRecording,
			conversationRef,
			validateAddressAction,
		],
	);

	const handleClear = useCallback(
		(context: "user" | "agent" = "user") => {
			log(`🗑️ === UNIFIED CLEAR FLOW START (context: ${context}) ===`);
			const { searchQuery } = useIntentStore.getState();

			if (searchQuery) {
				queryClient.removeQueries({
					queryKey: ["addressSearch", searchQuery],
					exact: true,
				});
				log("🔧 Cleared React Query cache for:", searchQuery);
			}

			clearSelectionAndSearch();
			addHistory({ type: context, text: "State cleared." });
			log("✅ ALL STATE CLEARED");

			// Explicitly notify the agent if a conversation is active
			if (isRecording && conversationRef.current?.status === "connected") {
				const clearMessage =
					"I have cleared my previous selection and am ready to continue.";
				log("🗨️ SENDING CLEAR MESSAGE TO AGENT:", clearMessage);
				try {
					conversationRef.current?.sendUserMessage?.(clearMessage);
					log("✅ Clear message sent to agent successfully");
					addHistory({
						type: "system",
						text: "Notified agent about state clear",
					});
				} catch (error) {
					log("❌ Failed to send clear message to agent:", error);
					addHistory({
						type: "system",
						text: `Failed to notify agent of clear: ${error}`,
					});
				}
			}

			performReliableSync("clear").catch((error) => {
				log("❌ Sync failed after clear:", error);
			});
			log("🔄 SYNC WITH AGENT INITIATED");

			log("🗑️ === UNIFIED CLEAR FLOW END ===");
		},
		[
			log,
			queryClient,
			clearSelectionAndSearch,
			addHistory,
			performReliableSync,
			isRecording,
			conversationRef,
		],
	);

	// Handler to accept rural address after user confirmation
	const handleAcceptRuralAddress = useCallback(() => {
		if (pendingRuralConfirmation) {
			const { result, validation } = pendingRuralConfirmation;
			const enrichedResult: Suggestion = {
				...result,
				description: validation.formattedAddress || result.description,
				placeId: validation.placeId || result.placeId,
				types: [...(result.types || []), "user_confirmed_rural"],
			};
			setSelectedResult(enrichedResult);
			setActiveSearch({ query: enrichedResult.description, source: "manual" });
			setAgentRequestedManual(false);
			addHistory({
				type: "user",
				text: `User confirmed rural address: "${enrichedResult.description}"`,
			});
			clearSessionToken();
			setPendingRuralConfirmation(null);
			// Optionally: notify agent as with normal selection
			if (isRecording && conversationRef.current?.status === "connected") {
				const selectionMessage = `I have confirmed the rural address "${enrichedResult.description}". Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
				log("🗨️ SENDING MESSAGE TO AGENT:", selectionMessage);
				try {
					conversationRef.current?.sendUserMessage?.(selectionMessage);
					log("✅ Message sent to agent successfully");
					addHistory({
						type: "system",
						text: "Notified agent about rural address selection",
					});
				} catch (error) {
					log("❌ Failed to send message to agent:", error);
					addHistory({
						type: "system",
						text: `Failed to notify agent: ${error}`,
					});
				}
			}
		}
	}, [
		pendingRuralConfirmation,
		setSelectedResult,
		setActiveSearch,
		setAgentRequestedManual,
		addHistory,
		clearSessionToken,
		isRecording,
		conversationRef,
		log,
	]);

	return {
		handleSelect,
		isValidating,
		validationError,
		handleClear,
		pendingRuralConfirmation,
		handleAcceptRuralAddress,
	};
}
