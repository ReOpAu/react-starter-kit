import fs from "fs";
import path from "path";
import { getElevenLabsConfig } from "./env-loader.js";

/**
 * Create a duplicate ElevenLabs agent for testing
 * This creates a new agent based on the current configuration
 */
async function createDuplicateAgent() {
	try {
		console.log("🔍 Loading environment and current config...");
		const { apiKey } = getElevenLabsConfig();

		// Read the downloaded config
		const configPath = path.resolve(
			process.cwd(),
			"agent_config_download.json",
		);
		if (!fs.existsSync(configPath)) {
			console.error(
				"❌ No agent config found. Run: npx tsx scripts/1-download-config.ts",
			);
			process.exit(1);
		}

		const currentConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
		console.log(
			`📋 Base config loaded: ${currentConfig.name} (${currentConfig.agent_id})`,
		);

		// Create duplicate configuration
		const duplicateConfig = {
			name: "AddressFinder-Test",
			conversation_config: currentConfig.conversation_config,
			// Remove agent_id so ElevenLabs creates a new one
		};

		// Modify first message to indicate test agent
		if (duplicateConfig.conversation_config?.agent?.first_message) {
			duplicateConfig.conversation_config.agent.first_message =
				"[TEST AGENT] What address are you looking for? I have additional nearby services capabilities.";
		}

		console.log("📡 Trying different agent creation endpoints...");

		// Try different possible endpoints for agent creation
		const endpoints = [
			"https://api.elevenlabs.io/v1/convai/agents",
			"https://api.elevenlabs.io/v1/agents",
			"https://api.elevenlabs.io/v1/conversational-ai/agents",
		];

		let response: Response | null = null;
		let successEndpoint = "";

		for (const endpoint of endpoints) {
			console.log(`🔄 Trying endpoint: ${endpoint}`);
			try {
				response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"xi-api-key": apiKey,
					},
					body: JSON.stringify(duplicateConfig),
				});

				console.log(`📊 Response: ${response.status} ${response.statusText}`);

				if (response.ok) {
					successEndpoint = endpoint;
					break;
				} else if (response.status !== 404 && response.status !== 405) {
					// If it's not "not found" or "method not allowed", this might be the right endpoint with a different issue
					const errorText = await response.text();
					console.log(`❌ Error on ${endpoint}:`, errorText);
				}
			} catch (error) {
				console.log(`❌ Network error on ${endpoint}:`, error);
			}
		}

		if (!response || !response.ok) {
			console.log(
				"⚠️ Agent creation via API not working. Manual creation required.",
			);
			console.log(
				"📋 Please manually create agent with this config and update the constants:",
			);
			console.log(JSON.stringify(duplicateConfig, null, 2));
			console.log("\\n🔧 Manual steps:");
			console.log("1. Go to ElevenLabs dashboard");
			console.log("2. Create new agent with name: AddressFinder-Test");
			console.log(
				"3. Copy the agent ID and update shared/constants/agentConfig.ts",
			);
			console.log("4. Continue with Phase 2");
			return;
		}

		console.log(
			`📊 Response status: ${response.status} ${response.statusText}`,
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("❌ Agent creation failed!");
			console.error("Response body:", errorText);
			throw new Error(`API Error: ${response.status}\\n${errorText}`);
		}

		const newAgent = await response.json();

		console.log("✅ New agent created successfully!");
		console.log(`📋 Agent Details:`);
		console.log(`   - Name: ${newAgent.name}`);
		console.log(`   - ID: ${newAgent.agent_id}`);

		// Save new agent config
		const newAgentPath = path.resolve(process.cwd(), "agent_test_config.json");
		fs.writeFileSync(newAgentPath, JSON.stringify(newAgent, null, 2));
		console.log(`📁 New agent config saved to: ${newAgentPath}`);

		// Update the agent constants file
		console.log("🔧 Updating agent constants...");
		const constantsPath = path.resolve(
			process.cwd(),
			"shared/constants/agentConfig.ts",
		);
		let constantsContent = fs.readFileSync(constantsPath, "utf-8");

		// Replace the empty ID with the new agent ID
		constantsContent = constantsContent.replace(
			/ADDRESS_FINDER_TEST: \\{[\\s\\S]*?id: '',/,
			`ADDRESS_FINDER_TEST: {
    id: '${newAgent.agent_id}',`,
		);

		fs.writeFileSync(constantsPath, constantsContent);
		console.log("✅ Agent constants updated!");

		console.log("\\n🎉 Next steps:");
		console.log("1. Add new agent ID to .env.local:");
		console.log(
			`   VITE_ELEVENLABS_ADDRESS_AGENT_TEST_ID="${newAgent.agent_id}"`,
		);
		console.log("2. Continue with Phase 2: Add new tool definition");
	} catch (error) {
		console.error("❌ Agent creation failed:", error);
		process.exit(1);
	}
}

createDuplicateAgent();
