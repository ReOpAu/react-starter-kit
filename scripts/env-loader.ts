import fs from "fs";
import path from "path";

/**
 * Custom environment loader that reads .env.local directly using Node.js fs
 * This eliminates the need for the dotenv package dependency
 */
export function loadEnvLocal(): Record<string, string> {
	const envPath = path.resolve(process.cwd(), ".env.local");

	if (!fs.existsSync(envPath)) {
		throw new Error(`.env.local file not found at: ${envPath}`);
	}

	const envContent = fs.readFileSync(envPath, "utf-8");
	const envVars: Record<string, string> = {};

	// Parse .env.local content line by line
	envContent.split("\n").forEach((line) => {
		// Skip empty lines and comments
		line = line.trim();
		if (!line || line.startsWith("#")) return;

		// Parse KEY=VALUE format
		const match = line.match(/^([^=]+)=(.*)$/);
		if (match) {
			const key = match[1].trim();
			let value = match[2].trim();

			// Remove quotes if present
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}

			envVars[key] = value;
		}
	});

	return envVars;
}

/**
 * Load and validate required ElevenLabs environment variables
 */
export function getElevenLabsConfig() {
	const env = loadEnvLocal();

	const apiKey = env.ELEVENLABS_API_KEY || env.VITE_ELEVENLABS_API_KEY;
	const agentId =
		env.ELEVENLABS_AGENT_ID || env.VITE_ELEVENLABS_ADDRESS_AGENT_ID;

	if (!apiKey) {
		throw new Error(
			"Missing ELEVENLABS_API_KEY or VITE_ELEVENLABS_API_KEY in .env.local",
		);
	}

	if (!agentId) {
		throw new Error(
			"Missing ELEVENLABS_AGENT_ID or VITE_ELEVENLABS_ADDRESS_AGENT_ID in .env.local",
		);
	}

	return { apiKey, agentId };
}
