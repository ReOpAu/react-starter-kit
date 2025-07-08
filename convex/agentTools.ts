import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * AGENT-ONLY MUTATION TEMPLATE
 *
 * This mutation is intended to be called by the ElevenLabs agent via clientTools.
 * Only expose minimal, whitelisted actions here. Do not allow arbitrary updates.
 *
 * Cross-reference: Register this mutation in the ElevenLabs clientTools object.
 */
export const agentAddTodoItem = mutation({
	args: { item: v.string() },
	returns: v.object({ success: v.boolean(), message: v.string() }),
	handler: async (ctx, args) => {
		// TODO: Implement agent-facing mutation logic here.
		// Example: Insert a todo item as the agent (requires 'todos' table in schema)
		// await ctx.db.insert("todos", {
		//   text: args.item,
		//   completed: false,
		//   author: "AI Agent",
		// });
		return { success: false, message: `Not implemented: ${args.item}` };
	},
});

/**
 * AGENT-ONLY QUERY: Get previous searches for conversational recall.
 *
 * Returns the last 7 previous searches (stubbed for now; see TODO).
 *
 * Register in ElevenLabs clientTools and document intent.
 */
export const agentGetPreviousSearches = query({
	args: {},
	returns: v.array(
		v.object({
			query: v.string(),
			resultsCount: v.number(),
			timestamp: v.number(),
			confirmed: v.boolean(),
		}),
	),
	handler: async (ctx, args) => {
		// TODO: Integrate with Convex long-term memory if/when implemented.
		// For now, return an empty array (UI/session memory is in Zustand).
		return [];
	},
});

// Add additional agent-facing mutations below, following the same pattern.
