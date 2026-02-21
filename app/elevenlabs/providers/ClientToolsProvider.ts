/**
 * Universal Client Tools Provider
 * Centralized system for providing agent-specific client tools
 */

import {
	type AgentKey,
	CLIENT_TOOLS,
	ELEVENLABS_AGENTS,
	type ToolName,
} from "@shared/constants/agentConfig";
import { useEffect, useMemo, useRef } from "react";
import { useAddressFinderClientTools } from "~/elevenlabs/hooks/useAddressFinderClientTools";
import type { Suggestion } from "~/stores/types";

// Type for the complete client tools object
export type ClientTools = ReturnType<typeof useAddressFinderClientTools>;

// Type for filtered client tools based on agent configuration
export type FilteredClientTools = Partial<ClientTools>;

// Track whether runtime validation has already run (once per session)
let _runtimeValidationRan = false;

/**
 * Universal hook to get client tools for any agent
 * Automatically filters tools based on agent configuration
 */
export function useUniversalClientTools(
	agentKey: AgentKey,
	getSessionToken: () => string,
	clearSessionToken: () => void,
	onSelectResult?: (suggestion: Suggestion) => Promise<unknown>,
): FilteredClientTools {
	// Get the full set of client tools
	const allClientTools = useAddressFinderClientTools(
		getSessionToken,
		clearSessionToken,
		onSelectResult,
	);

	// Get the tools assigned to this specific agent
	const agentConfig = ELEVENLABS_AGENTS[agentKey];
	const assignedTools = agentConfig.tools;

	// Run runtime validation once in development when tools are first available
	const hasValidated = useRef(false);
	useEffect(() => {
		if (
			process.env.NODE_ENV === "development" &&
			!hasValidated.current &&
			!_runtimeValidationRan
		) {
			hasValidated.current = true;
			_runtimeValidationRan = true;
			const result = validateToolAssignmentsRuntime(allClientTools);
			if (!result.valid) {
				for (const [agent, warnings] of Object.entries(result.warnings)) {
					for (const warning of warnings) {
						console.warn(`[ClientToolsProvider] ${agent}: ${warning}`);
					}
				}
			}
		}
	}, [allClientTools]);

	// Filter tools based on agent configuration
	const filteredTools = useMemo(() => {
		const filtered: FilteredClientTools = {};

		for (const toolName of assignedTools) {
			if (toolName in allClientTools) {
				(filtered as any)[toolName] = (allClientTools as any)[toolName];
			} else if (process.env.NODE_ENV === "development") {
				// Development-only debugging for tool mismatches
				console.warn(
					`[ClientToolsProvider] Tool "${toolName}" is assigned to agent "${agentKey}" but is not implemented in useAddressFinderClientTools.ts. It will be ignored.`,
				);
			}
		}

		return filtered;
	}, [allClientTools, assignedTools, agentKey]);

	return filteredTools;
}

/**
 * Helper to get tool assignments for an agent
 */
export function getAgentTools(agentKey: AgentKey): readonly ToolName[] {
	return ELEVENLABS_AGENTS[agentKey].tools;
}

/**
 * Helper to check if an agent has a specific tool
 */
export function agentHasTool(agentKey: AgentKey, toolName: ToolName): boolean {
	return ELEVENLABS_AGENTS[agentKey].tools.includes(toolName);
}

/**
 * Get agents that have a specific tool
 */
export function getAgentsWithTool(toolName: ToolName): AgentKey[] {
	return (Object.keys(ELEVENLABS_AGENTS) as AgentKey[]).filter((agentKey) =>
		agentHasTool(agentKey, toolName),
	);
}

/**
 * Static validation: checks AGENT_TOOL_MATRIX entries against CLIENT_TOOLS
 * (derived from toolDefinitions in ai/tools.config.ts).
 *
 * This can run at import time since it only depends on static constants.
 * It catches tools listed in the matrix that do not exist in toolDefinitions,
 * and tools defined in toolDefinitions that no agent uses.
 */
export function validateToolAssignments(): {
	valid: boolean;
	errors: Record<string, string[]>;
	unusedTools: string[];
} {
	const errors: Record<string, string[]> = {};
	let allValid = true;

	// CLIENT_TOOLS is derived from Object.keys(toolDefinitions) — the authoritative list
	const definedToolNames = new Set<string>(CLIENT_TOOLS);

	// Track which defined tools are actually assigned to at least one agent
	const usedTools = new Set<string>();

	for (const agentKey of Object.keys(ELEVENLABS_AGENTS) as AgentKey[]) {
		const agentErrors: string[] = [];
		const assignedTools = ELEVENLABS_AGENTS[agentKey].tools;

		for (const toolName of assignedTools) {
			usedTools.add(toolName);
			if (!definedToolNames.has(toolName)) {
				agentErrors.push(
					`Tool "${toolName}" is in AGENT_TOOL_MATRIX but not defined in toolDefinitions (ai/tools.config.ts)`,
				);
			}
		}

		if (agentErrors.length > 0) {
			errors[agentKey] = agentErrors;
			allValid = false;
		}
	}

	// Find tools defined in toolDefinitions but not assigned to any agent
	const unusedTools: string[] = [];
	for (const toolName of definedToolNames) {
		if (!usedTools.has(toolName)) {
			unusedTools.push(toolName);
		}
	}

	if (unusedTools.length > 0) {
		allValid = false;
	}

	return {
		valid: allValid,
		errors,
		unusedTools,
	};
}

/**
 * Runtime validation: checks actual tool implementations against the agent matrix.
 *
 * Must be called with a real ClientTools object (from useAddressFinderClientTools)
 * so it can inspect which tools are actually implemented as functions.
 *
 * This catches:
 * - Tools in AGENT_TOOL_MATRIX that have no implementation (ghost tools)
 * - Tools implemented in code but not assigned to any agent in the matrix
 *
 * Defensive: logs warnings but never throws.
 */
export function validateToolAssignmentsRuntime(implementedTools: ClientTools): {
	valid: boolean;
	warnings: Record<string, string[]>;
} {
	const warnings: Record<string, string[]> = {};
	let allValid = true;

	try {
		// Get the actual implemented tool names from the real object
		const implementedToolNames = new Set<string>(
			Object.keys(implementedTools).filter(
				(key) =>
					typeof (implementedTools as Record<string, unknown>)[key] ===
					"function",
			),
		);

		// Check each agent's assigned tools against implementations
		for (const agentKey of Object.keys(ELEVENLABS_AGENTS) as AgentKey[]) {
			const agentWarnings: string[] = [];
			const assignedTools = ELEVENLABS_AGENTS[agentKey].tools;

			for (const toolName of assignedTools) {
				if (!implementedToolNames.has(toolName)) {
					agentWarnings.push(
						`Tool "${toolName}" is assigned in AGENT_TOOL_MATRIX but has no implementation in useAddressFinderClientTools. It will be silently dropped.`,
					);
				}
			}

			if (agentWarnings.length > 0) {
				warnings[agentKey] = agentWarnings;
				allValid = false;
			}
		}

		// Check for implemented tools not in any agent's matrix
		const allAssignedTools = new Set<string>();
		for (const agentKey of Object.keys(ELEVENLABS_AGENTS) as AgentKey[]) {
			for (const toolName of ELEVENLABS_AGENTS[agentKey].tools) {
				allAssignedTools.add(toolName);
			}
		}

		const orphanedTools: string[] = [];
		for (const toolName of implementedToolNames) {
			if (!allAssignedTools.has(toolName)) {
				orphanedTools.push(toolName);
			}
		}

		if (orphanedTools.length > 0) {
			warnings._orphaned = orphanedTools.map(
				(name) =>
					`Tool "${name}" is implemented in useAddressFinderClientTools but not assigned to any agent in AGENT_TOOL_MATRIX. It will never be used.`,
			);
			allValid = false;
		}
	} catch (error) {
		// Defensive: never crash the app due to validation
		console.error(
			"[ClientToolsProvider] Tool validation encountered an error:",
			error,
		);
		return {
			valid: false,
			warnings: {
				_error: ["Validation failed unexpectedly. See console for details."],
			},
		};
	}

	return {
		valid: allValid,
		warnings,
	};
}
