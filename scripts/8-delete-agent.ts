import { getElevenLabsConfig } from './env-loader.js';

/**
 * Delete an ElevenLabs agent
 * Demonstrates full API compliance with agent deletion endpoint
 */

async function deleteAgent(agentId: string, confirm: boolean = false): Promise<void> {
  try {
    console.log('🔍 Loading environment configuration...');
    const { apiKey } = getElevenLabsConfig();
    
    if (!confirm) {
      console.log('⚠️ This will permanently delete the agent!');
      console.log(`📋 Agent ID: ${agentId}`);
      console.log('💡 Add --confirm to proceed with deletion');
      return;
    }
    
    console.log(`🗑️ Deleting agent: ${agentId}`);
    
    // First, get agent details for confirmation
    console.log('📡 Fetching agent details...');
    const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const agentData = await getResponse.json();
      console.log(`📋 Agent found: "${agentData.name || 'Unnamed'}"`);
      console.log(`📅 Created: ${agentData.created_at_unix_secs ? new Date(agentData.created_at_unix_secs * 1000).toISOString() : 'Unknown'}`);
    } else {
      console.log('⚠️ Could not fetch agent details, proceeding with deletion...');
    }
    
    // Proceed with deletion
    console.log('🚨 Proceeding with deletion...');
    
    const deleteResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Response: ${deleteResponse.status} ${deleteResponse.statusText}`);
    
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      if (deleteResponse.status === 422) {
        console.error('💡 Unprocessable Entity - Agent may have dependencies or restrictions');
      } else if (deleteResponse.status === 404) {
        console.error('💡 Agent not found - may already be deleted');
      }
      console.error('Response body:', errorText);
      throw new Error(`API Error: ${deleteResponse.status}\n${errorText}`);
    }
    
    console.log('✅ Agent deleted successfully!');
    console.log(`📋 Deleted agent ID: ${agentId}`);
    
    // Verify deletion by trying to fetch the agent
    console.log('🔄 Verifying deletion...');
    const verifyResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey }
    });
    
    if (verifyResponse.status === 404) {
      console.log('✅ Deletion verified - agent no longer exists');
    } else {
      console.log('⚠️ Agent may still exist - manual verification recommended');
    }
    
  } catch (error) {
    console.error('❌ Failed to delete agent:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const agentId = args.find(arg => !arg.startsWith('--'));
const confirm = args.includes('--confirm');

if (!agentId) {
  console.error('❌ Agent ID is required!');
  console.log('💡 Usage: npx tsx scripts/8-delete-agent.ts <agent_id> [--confirm]');
  console.log('⚠️ Use --confirm to actually delete the agent');
  process.exit(1);
}

console.log('🗑️ ElevenLabs Agent Deletion');
console.log(`📋 Target agent: ${agentId}`);
console.log(`⚠️ Confirmation: ${confirm ? 'YES - WILL DELETE' : 'NO - DRY RUN'}`);
console.log('');

deleteAgent(agentId, confirm);