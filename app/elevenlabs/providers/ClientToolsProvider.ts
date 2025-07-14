/**
 * Universal Client Tools Provider
 * Centralized system for providing agent-specific client tools
 */

import { useMemo } from "react";
import { useAddressFinderClientTools } from "~/elevenlabs/hooks/useAddressFinderClientTools";
import { ELEVENLABS_AGENTS, type AgentKey, type ToolName } from "@shared/constants/agentConfig";
import type { Suggestion } from "~/stores/types";

// Type for the complete client tools object
export type ClientTools = ReturnType<typeof useAddressFinderClientTools>;

// Type for filtered client tools based on agent configuration
export type FilteredClientTools = Partial<ClientTools>;

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

  // Filter tools based on agent configuration
  const filteredTools = useMemo(() => {
    const filtered: FilteredClientTools = {};
    
    for (const toolName of assignedTools) {
      if (allClientTools[toolName]) {
        filtered[toolName] = allClientTools[toolName];
      } else if (process.env.NODE_ENV === 'development') {
        // Development-only debugging for tool mismatches
        console.warn(
          `[ClientToolsProvider] Tool "${toolName}" is assigned to agent "${agentKey}" but is not implemented in useAddressFinderClientTools.ts. It will be ignored.`
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
  return (Object.keys(ELEVENLABS_AGENTS) as AgentKey[]).filter(agentKey =>
    agentHasTool(agentKey, toolName)
  );
}

/**
 * Validate that all tools assigned to agents exist in the implementation
 */
export function validateToolAssignments(): {
  valid: boolean;
  errors: Record<AgentKey, string[]>;
} {
  const errors: Record<AgentKey, string[]> = {} as Record<AgentKey, string[]>;
  let allValid = true;

  // Get all available tool names from the implementation
  const mockClientTools = {} as ClientTools;
  const availableTools = Object.keys(mockClientTools) as ToolName[];

  for (const agentKey of Object.keys(ELEVENLABS_AGENTS) as AgentKey[]) {
    const agentErrors: string[] = [];
    const assignedTools = ELEVENLABS_AGENTS[agentKey].tools;

    for (const toolName of assignedTools) {
      if (!availableTools.includes(toolName)) {
        agentErrors.push(`Tool '${toolName}' is assigned but not implemented`);
      }
    }

    if (agentErrors.length > 0) {
      errors[agentKey] = agentErrors;
      allValid = false;
    }
  }

  return {
    valid: allValid,
    errors,
  };
}