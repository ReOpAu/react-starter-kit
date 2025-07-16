import type { ActionCtx, MutationCtx } from "../_generated/server";

export async function checkAuth(ctx: MutationCtx | ActionCtx) {
	// Debug environment variables
	console.log(
		"DISABLE_AUTH_FOR_MUTATIONS:",
		process.env.DISABLE_AUTH_FOR_MUTATIONS,
	);
	console.log("All env vars:", Object.keys(process.env));

	// Allow bypassing auth in development if a specific flag is set
	if (process.env.DISABLE_AUTH_FOR_MUTATIONS === "true") {
		console.warn(
			"Auth check is disabled for mutations. This should only be used in development.",
		);
		return {
			identity: null,
			user: null,
		};
	}

	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Not authenticated");
	}

	return { identity };
}
