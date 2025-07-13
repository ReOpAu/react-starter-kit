import { getElevenLabsConfig } from './env-loader.js';

/**
 * List all agents with pagination support
 * Demonstrates full API compliance with official ElevenLabs documentation
 */

interface ListAgentsOptions {
  cursor?: string;
  pageSize?: number; // 1-100, default 30
  search?: string;
}

interface AgentInfo {
  agent_id: string;
  name: string;
  tags: string[];
  created_at_unix_secs: number;
  access_info: {
    is_creator: boolean;
    creator_name: string;
    creator_email: string;
    role: string;
  };
}

interface ListAgentsResponse {
  agents: AgentInfo[];
  has_more: boolean;
  next_cursor?: string;
}

async function listAgents(options: ListAgentsOptions = {}): Promise<ListAgentsResponse> {
  try {
    console.log('🔍 Loading environment configuration...');
    const { apiKey } = getElevenLabsConfig();
    
    // Build query parameters according to API spec
    const queryParams = new URLSearchParams();
    
    if (options.cursor) {
      queryParams.append('cursor', options.cursor);
    }
    
    if (options.pageSize) {
      if (options.pageSize < 1 || options.pageSize > 100) {
        throw new Error('page_size must be between 1 and 100');
      }
      queryParams.append('page_size', options.pageSize.toString());
    }
    
    if (options.search) {
      queryParams.append('search', options.search);
    }
    
    const url = `https://api.elevenlabs.io/v1/convai/agents?${queryParams.toString()}`;
    console.log(`📡 Fetching agents: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 422) {
        console.error('💡 Unprocessable Entity - Check query parameters');
      }
      console.error('Response body:', errorText);
      throw new Error(`API Error: ${response.status}\n${errorText}`);
    }
    
    const result: ListAgentsResponse = await response.json();
    
    console.log('✅ Agents retrieved successfully!');
    console.log(`📋 Found ${result.agents.length} agents`);
    console.log(`📄 Has more: ${result.has_more}`);
    if (result.next_cursor) {
      console.log(`🔗 Next cursor: ${result.next_cursor}`);
    }
    
    // Display agent information
    console.log('\n📋 Agent List:');
    result.agents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (${agent.agent_id})`);
      console.log(`   Created: ${new Date(agent.created_at_unix_secs * 1000).toISOString()}`);
      console.log(`   Creator: ${agent.access_info.creator_name} (${agent.access_info.role})`);
      console.log(`   Tags: ${agent.tags.join(', ') || 'none'}`);
      console.log('');
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to list agents:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ListAgentsOptions = {};

args.forEach(arg => {
  if (arg.startsWith('--cursor=')) {
    options.cursor = arg.split('=')[1];
  } else if (arg.startsWith('--page-size=')) {
    options.pageSize = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--search=')) {
    options.search = arg.split('=')[1];
  }
});

console.log('📋 ElevenLabs Agent List');
console.log('Query options:', JSON.stringify(options, null, 2));
console.log('');

// Usage examples in comments
console.log('💡 Usage examples:');
console.log('   npx tsx scripts/3-list-agents.ts');
console.log('   npx tsx scripts/3-list-agents.ts --page-size=10');
console.log('   npx tsx scripts/3-list-agents.ts --search="AddressFinder"');
console.log('   npx tsx scripts/3-list-agents.ts --cursor="cursor_value"');
console.log('');

listAgents(options);