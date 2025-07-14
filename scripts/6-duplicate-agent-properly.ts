import fs from "fs";
import path from "path";
import { getElevenLabsConfig } from "./env-loader.js";

/**
 * Properly duplicate the ElevenLabs agent using the correct API endpoint
 * This uses the /duplicate endpoint discovered in the documentation
 */
async function duplicateAgent() {
	try {
		console.log("🔍 Loading environment configuration...");
		const { apiKey, agentId } = getElevenLabsConfig();

		console.log(`📋 Original agent: ${agentId}`);
		console.log("📡 Duplicating agent using official API endpoint...");

		// Use the correct duplicate endpoint
		const response = await fetch(
			`https://api.elevenlabs.io/v1/convai/agents/${agentId}/duplicate`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"xi-api-key": apiKey,
				},
				body: JSON.stringify({
					name: "AddressFinder-Test",
				}),
			},
		);

		console.log(`📊 Response: ${response.status} ${response.statusText}`);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("❌ Agent duplication failed!");
			console.error("Response body:", errorText);
			throw new Error(`API Error: ${response.status}\\n${errorText}`);
		}

		const result = await response.json();
		const newAgentId = result.agent_id || result.id;

		if (!newAgentId) {
			console.error("❌ No agent ID returned in response");
			console.log("Response:", JSON.stringify(result, null, 2));
			throw new Error("No agent ID in response");
		}

		console.log("✅ Agent duplicated successfully!");
		console.log(`📋 New agent ID: ${newAgentId}`);

		// Update the agent constants file
		console.log("🔧 Updating agent constants...");
		const constantsPath = path.resolve(
			process.cwd(),
			"shared/constants/agentConfig.ts",
		);
		let constantsContent = fs.readFileSync(constantsPath, "utf-8");

		// Replace the empty ID with the new agent ID
		constantsContent = constantsContent.replace(
			/ADDRESS_FINDER_TEST: \{[\s\S]*?id: '',/,
			`ADDRESS_FINDER_TEST: {
    id: '${newAgentId}',`,
		);

		fs.writeFileSync(constantsPath, constantsContent);
		console.log("✅ Agent constants updated!");

		// Add environment variable to .env.local
		console.log("🔧 Updating .env.local...");
		const envPath = path.resolve(process.cwd(), ".env.local");
		let envContent = fs.readFileSync(envPath, "utf-8");

		// Add the new test agent ID if not already present
		if (!envContent.includes("VITE_ELEVENLABS_ADDRESS_AGENT_TEST_ID")) {
			envContent += `\\nVITE_ELEVENLABS_ADDRESS_AGENT_TEST_ID=${newAgentId}\\n`;
			fs.writeFileSync(envPath, envContent);
			console.log("✅ .env.local updated with test agent ID!");
		} else {
			console.log("⚠️ Test agent ID already exists in .env.local");
		}

		// Verify the new agent exists
		console.log("🔄 Verifying new agent...");
		const verifyResponse = await fetch(
			`https://api.elevenlabs.io/v1/convai/agents/${newAgentId}`,
			{
				headers: { "xi-api-key": apiKey },
			},
		);

		if (verifyResponse.ok) {
			const agentData = await verifyResponse.json();
			console.log(`✅ New agent verified: "${agentData.name}"`);
			console.log(`📊 Agent ID: ${newAgentId}`);
		} else {
			console.log(
				"⚠️ Could not verify new agent, but duplication reported success",
			);
		}

		console.log("\\n🎉 Agent duplication complete!");
		console.log("📋 Summary:");
		console.log(`   Original: ${agentId} (AddressFinder)`);
		console.log(`   New:      ${newAgentId} (AddressFinder-Test)`);

		console.log("\\n🚀 Next steps:");
		console.log("1. Test multi-agent configuration:");
		console.log("   npx tsx scripts/4-multi-agent-sync.ts --dry-run");
		console.log("2. Sync new tool to test agent only:");
		console.log(
			"   npx tsx scripts/4-multi-agent-sync.ts --agent=ADDRESS_FINDER_TEST",
		);
		console.log("3. Verify original agent unchanged:");
		console.log(
			"   npx tsx scripts/4-multi-agent-sync.ts --agent=ADDRESS_FINDER --dry-run",
		);
	} catch (error) {
		console.error("❌ Agent duplication failed:", error);
		process.exit(1);
	}
}

duplicateAgent();
