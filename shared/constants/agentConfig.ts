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