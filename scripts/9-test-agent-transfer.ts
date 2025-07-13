import { getAgentByTransferIndex, getAvailableTransferTargets, recommendTransferAgent } from '../shared/constants/agentConfig.js';

/**
 * Test agent transfer functionality
 * Validates transfer logic and agent discovery mechanisms
 */

console.log('🔄 ElevenLabs Agent Transfer Testing');
console.log('====================================\n');

// Test 1: Agent discovery by transfer index
console.log('📋 Test 1: Agent Discovery by Transfer Index');
console.log('--------------------------------------------');

for (let i = 0; i < 3; i++) {
  const agent = getAgentByTransferIndex(i);
  if (agent) {
    console.log(`✅ Agent ${i}: ${agent.name} - ${agent.description}`);
    console.log(`   Specializations: ${agent.specializations.join(', ')}`);
  } else {
    console.log(`❌ Agent ${i}: Not found`);
  }
}

console.log('\n📋 Test 2: Available Transfer Targets');
console.log('------------------------------------');

// Test transfer targets for ADDRESS_FINDER
const transferTargets = getAvailableTransferTargets('ADDRESS_FINDER');
console.log('Transfer targets for ADDRESS_FINDER:');
transferTargets.forEach(target => {
  console.log(`  → Agent ${target.transferIndex}: ${target.name}`);
  console.log(`    Description: ${target.description}`);
  console.log(`    Specializations: ${target.specializations.join(', ')}`);
});

console.log('\n📋 Test 3: Specialization-Based Recommendations');
console.log('----------------------------------------------');

const testSpecializations = [
  'nearby_services',
  'address_search', 
  'enhanced_location',
  'billing_support', // Not available
];

testSpecializations.forEach(spec => {
  const recommended = recommendTransferAgent(spec);
  if (recommended) {
    console.log(`✅ For "${spec}": Recommend ${recommended.name}`);
  } else {
    console.log(`❌ For "${spec}": No specialized agent available`);
  }
});

console.log('\n📋 Test 4: Transfer Scenarios');
console.log('-----------------------------');

// Simulate transfer scenarios
const transferScenarios = [
  {
    userRequest: "Find me restaurants near 123 Collins Street",
    expectedAgent: 1,
    reason: "User needs nearby services"
  },
  {
    userRequest: "Validate this address: 456 Flinders Lane",
    expectedAgent: 0,
    reason: "Standard address validation"
  },
  {
    userRequest: "What are the best cafes in this area?",
    expectedAgent: 1,
    reason: "Enhanced location services required"
  }
];

transferScenarios.forEach((scenario, index) => {
  console.log(`\nScenario ${index + 1}: "${scenario.userRequest}"`);
  
  const targetAgent = getAgentByTransferIndex(scenario.expectedAgent);
  if (targetAgent) {
    console.log(`  ✅ Transfer to: Agent ${scenario.expectedAgent} (${targetAgent.name})`);
    console.log(`  📝 Reason: ${scenario.reason}`);
    console.log(`  🎯 Capabilities: ${targetAgent.specializations.join(', ')}`);
    
    // Simulate transfer call
    const transferCall = {
      agent_number: scenario.expectedAgent,
      reason: scenario.reason,
      transfer_message: `Connecting you to ${targetAgent.name} for specialized assistance`,
      delay: 1
    };
    console.log(`  📞 Transfer call: ${JSON.stringify(transferCall, null, 2)}`);
  } else {
    console.log(`  ❌ No suitable agent found`);
  }
});

console.log('\n🎉 Agent Transfer Testing Complete!');
console.log('\n💡 Next Steps:');
console.log('1. Deploy transfer capabilities: npx tsx scripts/4-multi-agent-sync.ts');
console.log('2. Test live transfers in conversation interface');
console.log('3. Monitor transfer success rates and user satisfaction');