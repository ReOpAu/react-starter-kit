/**
 * ElevenLabs Agent Configuration Types
 * Type definitions for agent management and configuration
 */

/**
 * Agent configuration structure
 */
export interface AgentConfig {
	id: string;
	name: string;
	description: string;
	envVar: string;
	transferIndex: number;
	specializations: string[];
}

/**
 * Agent registry type (matches ELEVENLABS_AGENTS structure)
 */
export interface AgentRegistry {
	ADDRESS_FINDER: AgentConfig;
	ADDRESS_FINDER_TEST: AgentConfig;
}

/**
 * Agent keys union type
 */
export type AgentKey = keyof AgentRegistry;

/**
 * Transfer target information
 */
export interface TransferTarget {
	transferIndex: number;
	name: string;
	description: string;
	specializations: string[];
}

/**
 * Agent specializations enum for type safety
 */
export enum AgentSpecialization {
	ADDRESS_SEARCH = "address_search",
	PLACE_VALIDATION = "place_validation",
	LOCATION_SERVICES = "location_services",
	NEARBY_SERVICES = "nearby_services",
	ENHANCED_LOCATION = "enhanced_location",
}

/**
 * ElevenLabs API tool definition structure
 */
export interface ElevenLabsToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: {
			type: "object";
			properties: Record<string, any>;
			required: string[];
		};
	};
}

/**
 * Agent sync payload structure
 */
export interface AgentSyncPayload {
	prompt: {
		prompt: string;
		llm: string;
		temperature: number;
		max_tokens: number;
		tools: ElevenLabsToolDefinition[];
	};
}

/**
 * Sync response from ElevenLabs API
 */
export interface SyncResponse {
	success: boolean;
	status: number;
	message?: string;
	error?: string;
}
