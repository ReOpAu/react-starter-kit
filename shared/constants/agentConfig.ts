/**
 * ElevenLabs Agent Configuration Constants
 * Centralized management of agent IDs and configurations
 */

export const ELEVENLABS_AGENTS = {
  // Production address finder agent  
  ADDRESS_FINDER: {
    id: 'agent_01jydc3p56er8tn495y66hybmn',
    name: 'AddressFinder',
    description: 'Production address finder with 12 client tools',
    envVar: 'VITE_ELEVENLABS_ADDRESS_AGENT_ID',
    transferIndex: 0, // For agent-to-agent transfers
    specializations: ['address_search', 'place_validation', 'location_services'],
  },
  
  // Test/development agent (to be created)
  ADDRESS_FINDER_TEST: {
    id: 'agent_01jzvft1wjfr49ghzgswxcrhwr',
    name: 'AddressFinder-Test', 
    description: 'Test agent with additional getNearbyServices tool',
    envVar: 'VITE_ELEVENLABS_ADDRESS_AGENT_TEST_ID',
    transferIndex: 1, // For agent-to-agent transfers
    specializations: ['address_search', 'place_validation', 'nearby_services', 'enhanced_location'],
  },
} as const;

export type AgentKey = keyof typeof ELEVENLABS_AGENTS;

export function getAgentConfig(agentKey: AgentKey) {
  return ELEVENLABS_AGENTS[agentKey];
}

export function getAllAgentIds(): string[] {
  return Object.values(ELEVENLABS_AGENTS)
    .map(agent => agent.id);
}

/**
 * Get agent configuration by transfer index (for agent-to-agent transfers)
 */
export function getAgentByTransferIndex(transferIndex: number): typeof ELEVENLABS_AGENTS[AgentKey] | null {
  const agents = Object.values(ELEVENLABS_AGENTS);
  return agents.find(agent => agent.transferIndex === transferIndex) || null;
}

/**
 * Get available transfer targets for a given agent
 */
export function getAvailableTransferTargets(currentAgentKey: AgentKey): Array<{
  transferIndex: number;
  name: string;
  description: string;
  specializations: readonly string[];
}> {
  return Object.entries(ELEVENLABS_AGENTS)
    .filter(([key]) => key !== currentAgentKey)
    .map(([_, agent]) => ({
      transferIndex: agent.transferIndex,
      name: agent.name,
      description: agent.description,
      specializations: agent.specializations,
    }));
}

/**
 * Determine best agent for transfer based on specializations
 */
export function recommendTransferAgent(requiredSpecialization: 'address_search' | 'place_validation' | 'location_services' | 'nearby_services' | 'enhanced_location'): typeof ELEVENLABS_AGENTS[AgentKey] | null {
  const agents = Object.values(ELEVENLABS_AGENTS);
  return agents.find(agent => agent.specializations.includes(requiredSpecialization as any)) || null;
}

/**
 * Runtime validation for agent configuration
 */
export function validateAgentConfig(agentKey: AgentKey): { valid: boolean; errors: string[] } {
  const agent = ELEVENLABS_AGENTS[agentKey];
  const errors: string[] = [];

  // Validate agent ID format
  if (!agent.id || !agent.id.startsWith('agent_')) {
    errors.push(`Invalid agent ID format: ${agent.id}`);
  }

  // Validate environment variable exists
  if (!agent.envVar) {
    errors.push(`Missing environment variable name for agent: ${agentKey}`);
  }

  // Validate transfer index uniqueness
  const allAgents = Object.values(ELEVENLABS_AGENTS);
  const duplicateIndex = allAgents.filter(a => a.transferIndex === agent.transferIndex);
  if (duplicateIndex.length > 1) {
    errors.push(`Duplicate transfer index ${agent.transferIndex} found`);
  }

  // Validate specializations
  if (!agent.specializations || agent.specializations.length < 1) {
    errors.push(`Agent ${agentKey} has no specializations defined`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate all agent configurations
 */
export function validateAllAgentConfigs(): { valid: boolean; errors: Record<AgentKey, string[]> } {
  const errors: Record<AgentKey, string[]> = {} as Record<AgentKey, string[]>;
  let allValid = true;

  for (const agentKey of Object.keys(ELEVENLABS_AGENTS) as AgentKey[]) {
    const validation = validateAgentConfig(agentKey);
    if (!validation.valid) {
      errors[agentKey] = validation.errors;
      allValid = false;
    }
  }

  return {
    valid: allValid,
    errors
  };
}

/**
 * Runtime validation for transfer requests
 */
export function validateTransferRequest(fromAgent: AgentKey, transferIndex: number): { 
  valid: boolean; 
  error?: string; 
  targetAgent?: typeof ELEVENLABS_AGENTS[AgentKey] 
} {
  // Check if target agent exists
  const targetAgent = getAgentByTransferIndex(transferIndex);
  if (!targetAgent) {
    return {
      valid: false,
      error: `No agent found with transfer index ${transferIndex}`
    };
  }

  // Check if trying to transfer to self
  const sourceAgent = ELEVENLABS_AGENTS[fromAgent];
  if (sourceAgent.transferIndex === transferIndex) {
    return {
      valid: false,
      error: `Cannot transfer to self (agent ${transferIndex})`
    };
  }

  return {
    valid: true,
    targetAgent
  };
}