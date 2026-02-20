import { z } from "zod";

/**
 * Centralized tool configuration extracted from useAddressFinderClientTools.ts
 * This is the single source of truth for ElevenLabs agent tool definitions
 */

// =================== TOOL PARAMETER SCHEMAS ===================

export const searchAddressSchema = z.object({
	query: z.string().describe("The address or place to search for."),
});

export const selectSuggestionSchema = z.object({
	placeId: z
		.string()
		.describe(
			"Unique ID of the place to select from the current search results.",
		),
});

export const selectByOrdinalSchema = z.object({
	ordinal: z
		.string()
		.describe(
			"Ordinal selection like 'first', 'second', 'third', '1', '2', '3'.",
		),
});

export const getSuggestionsSchema = z.object({});

export const getCurrentStateSchema = z.object({});

export const getConfirmedSelectionSchema = z.object({});

export const clearSelectionSchema = z.object({});

export const confirmUserSelectionSchema = z.object({
	acknowledged: z
		.boolean()
		.optional()
		.describe("Whether to acknowledge the selection."),
});

export const requestManualInputSchema = z.object({
	reason: z.string().describe("Reason for requesting manual input mode."),
});

export const getHistorySchema = z.object({});

export const getPreviousSearchesSchema = z.object({});

export const setSelectionAcknowledgedSchema = z.object({
	acknowledged: z
		.boolean()
		.describe(
			"Set to true after confirming selection, false when starting new search.",
		),
});

export const showOptionsAgainSchema = z.object({});

export const transferToAgentSchema = z.object({
	agent_number: z
		.number()
		.describe(
			"Zero-indexed number of the target agent to transfer to (0 = first agent, 1 = second agent, etc.)",
		),
	reason: z
		.string()
		.optional()
		.describe("Optional explanation for why the transfer is being made"),
	transfer_message: z
		.string()
		.optional()
		.describe("Optional custom message to display during transfer"),
	delay: z
		.number()
		.optional()
		.describe("Optional delay in seconds before transfer (default: 0)"),
});


// =================== TOOL DEFINITIONS ===================

export const toolDefinitions = {
	searchAddress: {
		description: "Search for places by query using the backend service.",
		parametersSchema: searchAddressSchema,
	},
	selectSuggestion: {
		description: "Confirm the selection of a place by its unique placeId.",
		parametersSchema: selectSuggestionSchema,
	},
	selectByOrdinal: {
		description:
			"Select by ordinal like 'first', 'second', 'third', or numbers '1', '2', '3'.",
		parametersSchema: selectByOrdinalSchema,
	},
	getSuggestions: {
		description: "Get current address suggestions from unified source.",
		parametersSchema: getSuggestionsSchema,
	},
	getCurrentState: {
		description: "Get current system state and status for debugging.",
		parametersSchema: getCurrentStateSchema,
	},
	getConfirmedSelection: {
		description: "Get the currently confirmed address selection.",
		parametersSchema: getConfirmedSelectionSchema,
	},
	clearSelection: {
		description: "Clear current selection and search state.",
		parametersSchema: clearSelectionSchema,
	},
	confirmUserSelection: {
		description: "Acknowledge and confirm user's selection.",
		parametersSchema: confirmUserSelectionSchema,
	},
	requestManualInput: {
		description:
			"Request manual input while keeping conversation active (hybrid mode).",
		parametersSchema: requestManualInputSchema,
	},
	getHistory: {
		description: "Get interaction history for context and debugging.",
		parametersSchema: getHistorySchema,
	},
	getPreviousSearches: {
		description:
			"Get previous searches for agent recall (future: Convex integration).",
		parametersSchema: getPreviousSearchesSchema,
	},
	setSelectionAcknowledged: {
		description: "Set selection acknowledgment status for UI synchronization.",
		parametersSchema: setSelectionAcknowledgedSchema,
	},
	showOptionsAgain: {
		description:
			"Show the previous address options again after a selection has been confirmed. Toggles visibility between confirmed result and suggestion list.",
		parametersSchema: showOptionsAgainSchema,
	},
	transferToAgent: {
		description:
			"Transfer the conversation to a specialized agent for better assistance. Use when current agent capabilities are insufficient.",
		parametersSchema: transferToAgentSchema,
	},
} as const;

// =================== TYPE EXPORTS ===================

export type ToolName = keyof typeof toolDefinitions;

export type ToolParameters<T extends ToolName> = z.infer<
	(typeof toolDefinitions)[T]["parametersSchema"]
>;

// Helper type for tool implementations
export type ClientToolsImplementation = {
	[K in ToolName]: (params: ToolParameters<K>) => Promise<string>;
};
