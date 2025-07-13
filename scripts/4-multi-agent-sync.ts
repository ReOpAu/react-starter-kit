import fs from 'fs';
import path from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolDefinitions, type ToolName } from '../ai/tools.config.js';
import { getElevenLabsConfig } from './env-loader.js';
import { ELEVENLABS_AGENTS, type AgentKey } from '../shared/constants/agentConfig.js';

/**
 * Multi-agent configuration sync with tool-specific assignments
 * Allows different agents to have different sets of tools
 */

// Define which tools each agent should have
const AGENT_TOOL_ASSIGNMENTS: Record<AgentKey, ToolName[]> = {
  ADDRESS_FINDER: [
    'searchAddress',
    'selectSuggestion', 
    'selectByOrdinal',
    'getSuggestions',
    'getCurrentState',
    'getConfirmedSelection',
    'clearSelection',
    'confirmUserSelection',
    'requestManualInput',
    'getHistory',
    'getPreviousSearches',
    'setSelectionAcknowledged',
    'transferToAgent', // ✅ Transfer capability for orchestration
  ],
  ADDRESS_FINDER_TEST: [
    'searchAddress',
    'selectSuggestion',
    'selectByOrdinal', 
    'getSuggestions',
    'getCurrentState',
    'getConfirmedSelection',
    'clearSelection',
    'confirmUserSelection',
    'requestManualInput',
    'getHistory',
    'getPreviousSearches',
    'setSelectionAcknowledged',
    'getNearbyServices', // ✅ Enhanced services capability
    'transferToAgent', // ✅ Transfer capability for orchestration
  ],
};

async function syncAgentConfiguration(agentKey: AgentKey, dryRun = false) {
  try {
    const agentConfig = ELEVENLABS_AGENTS[agentKey];
    
    if (!agentConfig.id) {
      console.log(`⚠️ Agent ${agentKey} has no ID set. Skipping...`);
      return;
    }
    
    console.log(`\\n🔧 Syncing agent: ${agentConfig.name} (${agentConfig.id})`);
    
    const { apiKey } = getElevenLabsConfig();
    const assignedTools = AGENT_TOOL_ASSIGNMENTS[agentKey];
    
    console.log(`📋 Tools for this agent: ${assignedTools.length} tools`);
    console.log(`   ${assignedTools.join(', ')}`);
    
    // Generate API-compatible tool definitions for this specific agent
    const apiTools = assignedTools.map(toolName => {
      const toolDef = toolDefinitions[toolName];
      const schema = zodToJsonSchema(toolDef.parametersSchema, { $refStrategy: 'none' });
      const schemaObj = schema as any; // Type assertion for schema properties
      return {
        type: "function",
        function: {
          name: toolName,
          description: toolDef.description,
          parameters: {
            type: "object",
            properties: schemaObj.properties || {},
            required: schemaObj.required || []
          }
        }
      };
    });
    
    // Generate the tools section for the prompt
    let toolsPrompt = "#### **AVAILABLE TOOLS:**\n";
    apiTools.forEach(tool => {
      toolsPrompt += `*   \`${tool.function.name}\`: ${tool.function.description}\n`;
    });
    
    // Assemble the final prompt
    const basePromptPath = path.resolve(process.cwd(), 'ai', 'master_prompt_base.txt');
    
    if (!fs.existsSync(basePromptPath)) {
      throw new Error(`Base prompt file not found: ${basePromptPath}`);
    }
    
    const basePrompt = fs.readFileSync(basePromptPath, 'utf-8');
    
    // Modify prompt for specific agents
    let finalPrompt = basePrompt;
    if (agentKey === 'ADDRESS_FINDER_TEST') {
      finalPrompt = finalPrompt.replace(
        'You are an intelligent address finder assistant.',
        'You are an intelligent address finder assistant with enhanced nearby services capabilities.'
      );
    }
    
    // Add transfer guidance for all agents
    const transferGuidance = `

#### **AGENT TRANSFER CAPABILITIES**

You can transfer conversations to specialized agents when needed:

**Available Agents:**
- Agent 0 (AddressFinder): Standard address finder with validation
- Agent 1 (AddressFinder-Test): Enhanced with nearby services capabilities

**When to Transfer:**
- User needs nearby services (restaurants, shops, etc.) → Transfer to Agent 1  
- Current capabilities are insufficient for user's request
- User explicitly requests different type of assistance

**Transfer Tool Usage:**
\`transferToAgent(agent_number, reason, transfer_message, delay)\`
- agent_number: 0 or 1 (zero-indexed)
- reason: Brief explanation for transfer
- transfer_message: Optional custom message to user
- delay: Optional delay in seconds

**Example Transfer:**
If user asks "Are there any restaurants near this address?", use:
\`transferToAgent(1, "User needs nearby services information", "Connecting you to our enhanced services agent", 2)\`
`;

    finalPrompt += transferGuidance;
    
    finalPrompt += `\n\n${toolsPrompt}`;
    
    // Prepare the payload
    const payload = {
      prompt: {
        prompt: finalPrompt,
        llm: "gemini-2.0-flash-001",
        temperature: 0,
        max_tokens: -1,
        tools: apiTools
      }
    };
    
    const payloadJson = JSON.stringify(payload, null, 2);
    
    if (dryRun) {
      console.log('--- DRY RUN for', agentConfig.name, '---');
      console.log('📊 Payload Preview:');
      console.log('- Tools count:', apiTools.length);
      console.log('- Prompt length:', finalPrompt.length, 'characters');
      console.log('- Agent-specific tools:', assignedTools.filter(t => !AGENT_TOOL_ASSIGNMENTS.ADDRESS_FINDER.includes(t)));
      console.log('\n📄 Tool list for this agent:');
      apiTools.forEach(tool => console.log(`  - ${tool.function.name}: ${tool.function.description}`));
      return;
    }
    
    console.log(`📡 Syncing to ElevenLabs...`);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentConfig.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: payloadJson,
    });
    
    console.log(`📊 Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Sync failed for ${agentConfig.name}!`);
      if (response.status === 422) {
        console.error('💡 Unprocessable Entity - Check tool configuration format and required fields');
      }
      console.error('Response body:', errorText);
      throw new Error(`API Error: ${response.status}\n${errorText}`);
    }
    
    console.log(`✅ ${agentConfig.name} synced successfully!`);
    console.log(`📋 Updated: ${finalPrompt.length} chars, ${apiTools.length} tools`);
    
  } catch (error) {
    console.error(`❌ Sync failed for ${agentKey}:`, error);
    throw error;
  }
}

async function syncAllAgents(dryRun = false) {
  console.log('🚀 Multi-Agent Configuration Sync');
  console.log(`📋 Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE SYNC'}`);
  
  const agentKeys = Object.keys(ELEVENLABS_AGENTS) as AgentKey[];
  console.log(`🎯 Agents to sync: ${agentKeys.join(', ')}`);
  
  for (const agentKey of agentKeys) {
    try {
      await syncAgentConfiguration(agentKey, dryRun);
    } catch (error) {
      console.error(`Failed to sync ${agentKey}, continuing with others...`);
    }
  }
  
  if (!dryRun) {
    console.log('\n🎉 Multi-agent sync complete!');
    console.log('📋 Summary:');
    agentKeys.forEach(key => {
      const config = ELEVENLABS_AGENTS[key];
      const toolCount = AGENT_TOOL_ASSIGNMENTS[key].length;
      console.log(`   - ${config.name}: ${toolCount} tools`);
    });
  }
}

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');
const specificAgent = process.argv.find(arg => arg.startsWith('--agent='))?.split('=')[1] as AgentKey | undefined;

if (specificAgent) {
  console.log(`🎯 Syncing specific agent: ${specificAgent}`);
  syncAgentConfiguration(specificAgent, isDryRun);
} else {
  syncAllAgents(isDryRun);
}