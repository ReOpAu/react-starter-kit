import { z } from 'zod';

/**
 * Centralized tool configuration extracted from useAddressFinderClientTools.ts
 * This is the single source of truth for ElevenLabs agent tool definitions
 */

// =================== TOOL PARAMETER SCHEMAS ===================

export const searchAddressSchema = z.object({
  query: z.string().describe("The address or place to search for."),
});

export const selectSuggestionSchema = z.object({
  placeId: z.string().describe("Unique ID of the place to select from the current search results."),
});

export const selectByOrdinalSchema = z.object({
  ordinal: z.string().describe("Ordinal selection like 'first', 'second', 'third', '1', '2', '3'."),
});

export const getSuggestionsSchema = z.object({});

export const getCurrentStateSchema = z.object({});

export const getConfirmedSelectionSchema = z.object({});

export const clearSelectionSchema = z.object({});

export const confirmUserSelectionSchema = z.object({
  acknowledged: z.boolean().optional().describe("Whether to acknowledge the selection."),
});

export const requestManualInputSchema = z.object({
  reason: z.string().describe("Reason for requesting manual input mode."),
});

export const getHistorySchema = z.object({});

export const getPreviousSearchesSchema = z.object({});

export const setSelectionAcknowledgedSchema = z.object({
  acknowledged: z.boolean().describe("Set to true after confirming selection, false when starting new search."),
});

export const getNearbyServicesSchema = z.object({
  address: z.string().describe("The address or location to search around."),
  serviceType: z.string().optional().describe("Type of service to search for (e.g., 'restaurant', 'pharmacy', 'gas_station'). Leave empty for all services."),
  radius: z.number().optional().describe("Search radius in meters (default: 1000m)."),
});

export const transferToAgentSchema = z.object({
  agent_number: z.number().describe("Zero-indexed number of the target agent to transfer to (0 = first agent, 1 = second agent, etc.)"),
  reason: z.string().optional().describe("Optional explanation for why the transfer is being made"),
  transfer_message: z.string().optional().describe("Optional custom message to display during transfer"),
  delay: z.number().optional().describe("Optional delay in seconds before transfer (default: 0)"),
});

// =================== LEGACY TOOL SCHEMAS ===================
// For backward compatibility with existing agent configurations

export const addressSearchSchema = z.object({
  address: z.string().describe("The address, suburb, or street name to search for"),
});

export const confirmPlaceSchema = z.object({
  address: z.string().describe("The full place description from previous AddressSearch"),
});

export const getUIStateSchema = z.object({});

export const clearResultsSchema = z.object({});

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
    description: "Select by ordinal like 'first', 'second', 'third', or numbers '1', '2', '3'.",
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
    description: "Request manual input while keeping conversation active (hybrid mode).",
    parametersSchema: requestManualInputSchema,
  },
  getHistory: {
    description: "Get interaction history for context and debugging.",
    parametersSchema: getHistorySchema,
  },
  getPreviousSearches: {
    description: "Get previous searches for agent recall (future: Convex integration).",
    parametersSchema: getPreviousSearchesSchema,
  },
  setSelectionAcknowledged: {
    description: "Set selection acknowledgment status for UI synchronization.",
    parametersSchema: setSelectionAcknowledgedSchema,
  },
  getNearbyServices: {
    description: "Find nearby services and points of interest around a specific address or location.",
    parametersSchema: getNearbyServicesSchema,
  },
  transferToAgent: {
    description: "Transfer the conversation to a specialized agent for better assistance. Use when current agent capabilities are insufficient.",
    parametersSchema: transferToAgentSchema,
  },
  // Legacy tool definitions for backward compatibility
  AddressSearch: {
    description: "Search for Australian addresses, suburbs, or streets. Returns place data for confirmation.",
    parametersSchema: addressSearchSchema,
  },
  ConfirmPlace: {
    description: "Display one or more place suggestions in the UI so the user can confirm or select the correct one.",
    parametersSchema: confirmPlaceSchema,
  },
  GetUIState: {
    description: "Get current UI state including mode and available results.",
    parametersSchema: getUIStateSchema,
  },
  ClearResults: {
    description: "Clear current search results and reset the interface.",
    parametersSchema: clearResultsSchema,
  },
} as const;

// =================== TYPE EXPORTS ===================

export type ToolName = keyof typeof toolDefinitions;

export type ToolParameters<T extends ToolName> = z.infer<
  typeof toolDefinitions[T]['parametersSchema']
>;

// Helper type for tool implementations
export type ClientToolsImplementation = {
  [K in ToolName]: (params: ToolParameters<K>) => Promise<string>;
};