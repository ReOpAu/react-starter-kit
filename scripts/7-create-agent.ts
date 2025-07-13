import { getElevenLabsConfig } from './env-loader.js';

/**
 * Create a new ElevenLabs agent from scratch
 * Demonstrates full API compliance with agent creation endpoint
 */

interface ConversationConfig {
  asr: {
    quality: "high" | "standard";
    provider: "elevenlabs" | "deepgram";
    user_input_audio_format: "pcm_16000" | "mp3";
    keywords: string[];
  };
  turn: {
    turn_timeout: number;
    silence_end_call_timeout: number;
    mode: "turn" | "continuous";
  };
  tts: {
    model_id: "eleven_flash_v2" | "eleven_turbo_v2";
    voice_id: string;
    agent_output_audio_format: "pcm_16000" | "mp3";
    optimize_streaming_latency: 1 | 2 | 3 | 4;
    stability: number;
    speed: number;
    similarity_boost: number;
  };
  conversation: {
    text_only: boolean;
    max_duration_seconds: number;
    client_events: string[];
  };
  agent: {
    language: string;
    dynamic_variables?: {
      dynamic_variable_placeholders: Record<string, string>;
    };
  };
}

interface CreateAgentRequest {
  conversation_config: ConversationConfig;
  platform_settings?: any;
  name?: string;
  tags?: string[];
}

interface CreateAgentResponse {
  agent_id: string;
}

async function createAgent(
  name: string, 
  basePrompt: string,
  voiceId: string = "HDA9tsk27wYi3uq0fPcK" // Default voice
): Promise<string> {
  try {
    console.log('🔍 Loading environment configuration...');
    const { apiKey } = getElevenLabsConfig();
    
    console.log(`🚀 Creating new agent: "${name}"`);
    
    // Build conversation configuration according to API spec
    const conversationConfig: ConversationConfig = {
      asr: {
        quality: "high",
        provider: "elevenlabs",
        user_input_audio_format: "pcm_16000",
        keywords: []
      },
      turn: {
        turn_timeout: 7,
        silence_end_call_timeout: 20,
        mode: "turn"
      },
      tts: {
        model_id: "eleven_flash_v2",
        voice_id: voiceId,
        agent_output_audio_format: "pcm_16000",
        optimize_streaming_latency: 3,
        stability: 0.5,
        speed: 1,
        similarity_boost: 0.8
      },
      conversation: {
        text_only: false,
        max_duration_seconds: 300,
        client_events: [
          "audio",
          "interruption", 
          "user_transcript",
          "agent_response",
          "agent_response_correction"
        ]
      },
      agent: {
        language: "en",
        dynamic_variables: {
          dynamic_variable_placeholders: {
            currentIntent: "general",
            isRecording: "false",
            hasResults: "false"
          }
        }
      }
    };
    
    const payload: CreateAgentRequest = {
      conversation_config: conversationConfig,
      name,
      tags: ["api-created", "address-finder"]
    };
    
    console.log('📡 Creating agent via API...');
    console.log(`🎯 Configuration preview:`);
    console.log(`   - Name: ${name}`);
    console.log(`   - Voice: ${voiceId}`);
    console.log(`   - Language: ${conversationConfig.agent.language}`);
    console.log(`   - TTS Model: ${conversationConfig.tts.model_id}`);
    
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    
    console.log(`📊 Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 422) {
        console.error('💡 Unprocessable Entity - Check conversation configuration format');
      }
      console.error('Response body:', errorText);
      throw new Error(`API Error: ${response.status}\n${errorText}`);
    }
    
    const result: CreateAgentResponse = await response.json();
    const newAgentId = result.agent_id;
    
    console.log('✅ Agent created successfully!');
    console.log(`📋 New agent ID: ${newAgentId}`);
    
    // Now update the agent with the custom prompt if provided
    if (basePrompt) {
      console.log('🔧 Setting custom prompt...');
      
      const updatePayload = {
        prompt: {
          prompt: basePrompt,
          llm: "gemini-2.0-flash-001",
          temperature: 0,
          max_tokens: -1,
          tools: [] // Empty for now, tools can be added later
        }
      };
      
      const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${newAgentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(updatePayload),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('⚠️ Agent created but prompt update failed:', errorText);
      } else {
        console.log('✅ Custom prompt applied successfully!');
      }
    }
    
    console.log('\n🎉 Agent creation complete!');
    console.log('📋 Summary:');
    console.log(`   - Name: ${name}`);
    console.log(`   - ID: ${newAgentId}`);
    console.log(`   - Voice: ${voiceId}`);
    console.log(`   - Custom prompt: ${basePrompt ? 'Yes' : 'No'}`);
    
    return newAgentId;
    
  } catch (error) {
    console.error('❌ Failed to create agent:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const agentName = args.find(arg => arg.startsWith('--name='))?.split('=')[1];
const voiceId = args.find(arg => arg.startsWith('--voice='))?.split('=')[1];
const promptFile = args.find(arg => arg.startsWith('--prompt='))?.split('=')[1];

if (!agentName) {
  console.error('❌ Agent name is required!');
  console.log('💡 Usage: npx tsx scripts/7-create-agent.ts --name="My Agent" [--voice=voice_id] [--prompt=path/to/prompt.txt]');
  process.exit(1);
}

// Load custom prompt if specified
let customPrompt = '';
if (promptFile) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const promptPath = path.resolve(process.cwd(), promptFile);
    customPrompt = fs.readFileSync(promptPath, 'utf-8');
    console.log(`📄 Loaded custom prompt from: ${promptPath}`);
  } catch (error) {
    console.error(`⚠️ Could not load prompt file: ${promptFile}`);
    console.error('Continuing with default prompt...');
  }
}

console.log('🚀 ElevenLabs Agent Creation');
console.log(`📋 Creating agent: "${agentName}"`);
if (voiceId) console.log(`🎤 Voice ID: ${voiceId}`);
if (customPrompt) console.log(`📄 Custom prompt: ${customPrompt.length} characters`);
console.log('');

createAgent(agentName, customPrompt, voiceId);