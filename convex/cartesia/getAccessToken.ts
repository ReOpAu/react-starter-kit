import { v } from "convex/values";
import { action } from "../_generated/server";

export const getAccessToken = action({
	args: {},
	returns: v.union(
		v.object({
			success: v.literal(true),
			token: v.string(),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async () => {
		const apiKey = process.env.CARTESIA_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Cartesia API key not configured",
			};
		}

		try {
			const resp = await fetch("https://api.cartesia.ai/access-token", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Cartesia-Version": "2025-04-16",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					grants: { stt: true, tts: true, agent: true },
					expires_in: 300,
				}),
			});

			if (!resp.ok) {
				const errorText = await resp.text();
				console.error(
					"[getAccessToken] Cartesia API error:",
					errorText,
				);
				return {
					success: false as const,
					error: `HTTP ${resp.status}: ${errorText}`,
				};
			}

			const data = await resp.json();
			const token = (data as Record<string, string>).token;

			if (!token) {
				return {
					success: false as const,
					error: "No token in response",
				};
			}

			return { success: true as const, token };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error("[getAccessToken] Exception:", message);
			return { success: false as const, error: message };
		}
	},
});
