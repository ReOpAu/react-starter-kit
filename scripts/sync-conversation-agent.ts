#!/usr/bin/env tsx

/**
 * Sync Conversation Agent Configuration
 * Dedicated script for syncing the conversation agent with its specific prompt and tools
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { loadEnvLocal } from './env-loader';
import { ELEVENLABS_AGENTS, AGENT_TOOL_MATRIX } from '@shared/constants/agentConfig';
import { toolDefinitions } from '../ai/tools.config';

// Load environment variables
const env = loadEnvLocal();

const CONVERSATION_AGENT_ID = ELEVENLABS_AGENTS.CONVERSATION_ASSISTANT.id;
const ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment');
  process.exit(1);
}

async function syncConversationAgent(dryRun: boolean = false) {
  try {
    console.log('🤖 Syncing Conversation Agent Configuration...');
    console.log(`📋 Agent ID: ${CONVERSATION_AGENT_ID}`);
    
    // Read the conversation-specific prompt
    const promptPath = join(process.cwd(), 'ai', 'conversation_agent', 'master_prompt.txt');
    const basePrompt = readFileSync(promptPath, 'utf-8');
    
    // Get tools assigned to conversation agent
    const assignedTools = AGENT_TOOL_MATRIX.CONVERSATION_ASSISTANT;
    console.log(`🔧 Assigned tools: ${assignedTools.length}`);
    
    // Generate tool definitions for this agent
    const agentTools = assignedTools.map(toolName => {
      const toolDef = toolDefinitions[toolName];
      if (!toolDef) {
        throw new Error(`Tool definition not found: ${toolName}`);
      }
      
      return {
        type: "function" as const,
        function: {
          name: toolName,
          description: toolDef.description,
          parameters: {
            type: "object" as const,
            properties: Object.fromEntries(
              Object.entries(toolDef.parametersSchema._def.shape || {}).map(([key, schema]: [string, any]) => [
                key,
                {
                  type: schema._def.typeName === "ZodString" ? "string" : 
                        schema._def.typeName === "ZodNumber" ? "number" :
                        schema._def.typeName === "ZodBoolean" ? "boolean" : "string",
                  description: schema.description || `${key} parameter`,
                }
              ])
            ),
            required: Object.keys(toolDef.parametersSchema._def.shape || {}),
          }
        }
      };
    });
    
    // Build the complete prompt with tool documentation
    const toolsSection = `

## Available Client Tools

${assignedTools.map(toolName => {
  const toolDef = toolDefinitions[toolName];
  return `### ${toolName}
${toolDef.description}
Parameters: ${JSON.stringify(toolDef.parametersSchema._def.shape || {}, null, 2)}`;
}).join('\n\n')}`;

    const finalPrompt = basePrompt + toolsSection;
    
    console.log(`📄 Final prompt length: ${finalPrompt.length} characters`);
    console.log(`🔧 Generated ${agentTools.length} tool definitions`);
    
    if (dryRun) {
      console.log('\n📋 DRY RUN - Would sync:');
      console.log(`- Prompt: ${finalPrompt.length} chars`);
      console.log(`- Tools: ${agentTools.length} definitions`);
      console.log(`- Agent: ${CONVERSATION_AGENT_ID}`);
      return;
    }
    
    // Prepare the update payload
    const updatePayload = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: finalPrompt
          }
        },
        tools: agentTools
      }
    };
    
    // Sync to ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${CONVERSATION_AGENT_ID}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Conversation agent configuration synced successfully!');
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📋 Updated: ${finalPrompt.length} characters, ${agentTools.length} tools`);
    console.log(`🎯 Agent: ${result.agent_id || CONVERSATION_AGENT_ID}`);
    
  } catch (error) {
    console.error('❌ Failed to sync conversation agent:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the sync
syncConversationAgent(dryRun);