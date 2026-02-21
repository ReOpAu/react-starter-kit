/**
 * Convex state bridge for Cartesia Line agent.
 *
 * Since Cartesia's Line SDK doesn't support custom WebSocket events from
 * loopback tools, we use Convex as a real-time state bridge:
 *   Python tool → Convex mutation → Convex subscription → Browser
 *
 * Each session has a single document that gets overwritten with each update.
 * The browser subscribes to this document and processes updates.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Push a state update from the Python agent.
 * Called via HTTP mutation API from tools.py.
 */
export const pushUpdate = mutation({
	args: {
		sessionId: v.string(),
		updateType: v.string(),
		data: v.string(), // JSON-encoded payload
	},
	handler: async (ctx, args) => {
		// Find existing session doc
		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				updateType: args.updateType,
				data: args.data,
				updatedAt: now,
				version: existing.version + 1,
			});
		} else {
			await ctx.db.insert("cartesiaSessions", {
				sessionId: args.sessionId,
				updateType: args.updateType,
				data: args.data,
				updatedAt: now,
				version: 1,
			});
		}
	},
});

/**
 * Subscribe to state updates for a session.
 * The browser uses this to reactively pick up changes from the agent.
 */
export const getLatestUpdate = query({
	args: {
		sessionId: v.string(),
	},
	returns: v.union(
		v.object({
			updateType: v.string(),
			data: v.string(),
			version: v.number(),
			updatedAt: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const session = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!session) return null;

		return {
			updateType: session.updateType,
			data: session.data,
			version: session.version,
			updatedAt: session.updatedAt,
		};
	},
});

/**
 * Clean up a session when the call ends.
 */
export const clearSession = mutation({
	args: {
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("cartesiaSessions")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (existing) {
			await ctx.db.delete(existing._id);
		}
	},
});
