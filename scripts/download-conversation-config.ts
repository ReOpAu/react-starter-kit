#!/usr/bin/env tsx

import { writeFileSync } from "fs";
import { ELEVENLABS_AGENTS } from "../shared/constants/agentConfig";
import { loadEnvLocal } from "./env-loader";

async function downloadConversationConfig() {
	try {
		const env = loadEnvLocal();
		const CONVERSATION_AGENT_ID = ELEVENLABS_AGENTS.CONVERSATION_ASSISTANT.id;

		console.log(
			"🤖 Downloading config for CONVERSATION_ASSISTANT:",
			CONVERSATION_AGENT_ID,
		);

		const response = await fetch(
			`https://api.elevenlabs.io/v1/convai/agents/${CONVERSATION_AGENT_ID}`,
			{
				headers: {
					"xi-api-key": env.ELEVENLABS_API_KEY,
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`API error: ${response.status} ${response.statusText}\n${errorText}`,
			);
		}

		const config = await response.json();
		const outputPath = "./conversation_agent_config.json";

		writeFileSync(outputPath, JSON.stringify(config, null, 2));

		console.log("✅ Conversation agent config downloaded!");
		console.log("📁 Saved to:", outputPath);

		// Extract and display the current prompt
		const currentPrompt =
			config.conversation_config?.agent?.prompt?.prompt || "No prompt found";
		console.log("\n📄 Current prompt preview:");
		console.log("=".repeat(50));
		console.log(
			currentPrompt.substring(0, 500) +
				(currentPrompt.length > 500 ? "..." : ""),
		);
		console.log("=".repeat(50));
	} catch (error) {
		console.error("❌ Failed to download conversation agent config:", error);
		process.exit(1);
	}
}

downloadConversationConfig();
