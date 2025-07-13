/**
 * ElevenLabs Client Tools Type Definitions
 * Centralized type safety for all client tool implementations
 */

import type { Suggestion } from "~/stores/types";

/**
 * Base interface for all ElevenLabs client tools
 */
export type ClientTool = (...args: any[]) => Promise<string>;

/**
 * Client tools registry interface
 */
export interface ClientToolsRegistry {
	searchAddress: (params: { query: string }) => Promise<string>;
	getSuggestions: () => Promise<string>;
	selectSuggestion: (params: { placeId: string } | string) => Promise<string>;
	selectByOrdinal: (params: { ordinal: string }) => Promise<string>;
	getCurrentState: () => Promise<string>;
	getConfirmedSelection: () => Promise<string>;
	clearSelection: () => Promise<string>;
	confirmUserSelection: (params?: unknown) => Promise<string>;
	requestManualInput: (params: { reason: string }) => Promise<string>;
	getHistory: () => Promise<string>;
	getPreviousSearches: () => Promise<string>;
	setSelectionAcknowledged: (params: {
		acknowledged: boolean;
	}) => Promise<string>;
	getNearbyServices: (params: {
		address: string;
		radius?: number;
	}) => Promise<string>;
	transferToAgent: (params: {
		agent_number: number;
		reason?: string;
		transfer_message?: string;
		delay?: number;
	}) => Promise<string>;
}

/**
 * Tool response status types
 */
export type ToolResponseStatus =
	| "success"
	| "error"
	| "validated"
	| "validation_failed"
	| "confirmed"
	| "not_found"
	| "cleared"
	| "acknowledged"
	| "no_selection"
	| "hybrid_mode_activated"
	| "transfer_initiated";

/**
 * Standard tool response structure
 */
export interface ToolResponse {
	status: ToolResponseStatus;
	message?: string;
	error?: string;
	suggestions?: Suggestion[];
	selection?: Suggestion;
	intent?: string;
	timestamp?: number;
	[key: string]: any;
}

/**
 * Agent transfer response structure
 */
export interface TransferResponse extends ToolResponse {
	status: "transfer_initiated";
	target_agent: {
		index: number;
		name: string;
		description: string;
		specializations: string[];
	};
	reason: string;
	transfer_message: string;
	timestamp: number;
}
