import fs from 'fs';
import path from 'path';
import { getElevenLabsConfig } from './env-loader.js';

/**
 * Download current ElevenLabs agent configuration
 * This is a one-time import to capture your existing agent setup
 */
async function downloadConfig() {
  try {
    console.log('🔍 Loading environment variables from .env.local...');
    const { apiKey, agentId } = getElevenLabsConfig();
    
    console.log(`📡 Fetching config for agent: ${agentId}`);
    
    const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
    const response = await fetch(url, {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText}\n${errorBody}`);
    }
    
    const config = await response.json();
    const outputPath = path.resolve(process.cwd(), 'agent_config_download.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Agent configuration downloaded successfully!');
    console.log(`📁 Saved to: ${outputPath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Copy the "prompt" value from the downloaded file');
    console.log('2. Create ai/master_prompt_base.txt with the prompt (remove ### AVAILABLE TOOLS ### section)');
    console.log('3. Run: tsx scripts/2-sync-agent.ts --dry-run');
    
  } catch (error) {
    console.error('❌ Failed to download config:', error);
    process.exit(1);
  }
}

downloadConfig();