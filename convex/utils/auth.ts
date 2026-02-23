import type { ActionCtx, MutationCtx } from "../_generated/server";

export async function checkAuth(ctx: MutationCtx | ActionCtx) {
	if (process.env.DISABLE_AUTH_FOR_MUTATIONS === "true") {
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
