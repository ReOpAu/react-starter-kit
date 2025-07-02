import { mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Add additional agent-facing mutations below, following the same pattern. 