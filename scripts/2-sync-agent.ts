import fs from "fs";
import path from "path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { toolDefinitions } from "../ai/tools.config.js";
import { getElevenLabsConfig } from "./env-loader.js";

/**
 * Sync local configuration to ElevenLabs agent
 * This script reads your local config and updates the agent in the cloud
 */
async function syncAgent(dryRun = false) {
	try {
		console.log("🔍 Loading environment and configuration...");
		const { apiKey, agentId } = getElevenLabsConfig();

		// Generate API-compatible tool definitions from our centralized config
		console.log("🔧 Generating tool definitions...");
		const apiTools = Object.entries(toolDefinitions).map(([name, def]) => {
			const schema = zodToJsonSchema(def.parametersSchema, {
				$refStrategy: "none",
			});
			const schemaObj = schema as any; // Type assertion for schema properties
			return {
				type: "function",
				function: {
					name,
					description: def.description,
					parameters: {
						type: "object",
						properties: schemaObj.properties || {},
						required: schemaObj.required || [],
					},
				},
			};
		});

		console.log(`📋 Generated ${apiTools.length} tool definitions`);

		// Generate the tools section for the prompt
		let toolsPrompt = "#### **AVAILABLE TOOLS:**\n";
		apiTools.forEach((tool) => {
			toolsPrompt += `*   \`${tool.function.name}\`: ${tool.function.description}\n`;
		});

		// Assemble the final prompt
		const basePromptPath = path.resolve(
			process.cwd(),
			"ai",
			"master_prompt_base.txt",
		);

		if (!fs.existsSync(basePromptPath)) {
			throw new Error(`Base prompt file not found: ${basePromptPath}`);
		}

		const basePrompt = fs.readFileSync(basePromptPath, "utf-8");
		const finalPrompt = `${basePrompt}\n\n${toolsPrompt}`;

		// Prepare the payload (note: using tool_ids format for current API)
		const payload = {
			prompt: {
				prompt: finalPrompt,
				llm: "gemini-2.0-flash-001",
				temperature: 0,
				max_tokens: -1,
				// Note: We'll need to create/map tool_ids, for now using tools format
				tools: apiTools,
			},
		};

		const payloadJson = JSON.stringify(payload, null, 2);

		if (dryRun) {
			console.log("\n--- DRY RUN: This payload would be sent to the API ---\n");
			console.log("📊 Payload Preview:");
			console.log("- Tools count:", apiTools.length);
			console.log("- Prompt length:", finalPrompt.length, "characters");
			console.log("- Base prompt file:", basePromptPath);
			console.log(
				"\n🔧 Tool names:",
				apiTools.map((t) => t.function.name).join(", "),
			);
			console.log("\n📄 First 500 characters of final prompt:");
			console.log(finalPrompt.substring(0, 500) + "...");
			console.log("\n✅ Dry run complete. Use without --dry-run to sync live.");
			return;
		}

		console.log(`\n📡 Syncing agent ${agentId}...`);
		console.log(
			"🎯 Target URL:",
			`https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
		);

		const response = await fetch(
			`https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
			{
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"xi-api-key": apiKey,
				},
				body: payloadJson,
			},
		);

		console.log(
			`📊 Response status: ${response.status} ${response.statusText}`,
		);

		const result = await response.text();

		if (!response.ok) {
			console.error("❌ Sync failed!");
			if (response.status === 422) {
				console.error(
					"💡 Unprocessable Entity - Check tool configuration format and required fields",
				);
			}
			console.error("Response body:", result);
			throw new Error(`API Error: ${response.status}\n${result}`);
		}

		console.log("✅ Agent configuration synced successfully!");
		console.log("📋 Updated:");
		console.log(`   - Prompt: ${finalPrompt.length} characters`);
		console.log(`   - Tools: ${apiTools.length} definitions`);
		console.log(`   - Agent: ${agentId}`);

		console.log(
			"\n🎉 Sync complete! Your agent is now using the centralized configuration.",
		);
	} catch (error) {
		console.error("❌ Sync failed:", error);
		process.exit(1);
	}
}

// Parse command line arguments
const isDryRun = process.argv.includes("--dry-run");

console.log("🚀 ElevenLabs Agent Configuration Sync");
console.log(`📋 Mode: ${isDryRun ? "DRY RUN (preview only)" : "LIVE SYNC"}`);
console.log("");

syncAgent(isDryRun);
