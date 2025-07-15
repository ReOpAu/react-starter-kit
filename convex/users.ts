import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const findUserByToken = query({
	args: { tokenIdentifier: v.string() },
	handler: async (ctx, args) => {
		// Get the user's identity from the auth context
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			return null;
		}

		// Check if we've already stored this identity before
		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
			.unique();

		if (user !== null) {
			return user;
		}

		return null;
	},
});

export const listAllUsers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("users").collect();
	},
});

export const deleteUser = mutation({
	args: { id: v.id("users") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
		return { success: true };
	},
});

export const upsertUser = mutation({
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			return null;
		}

		// Check if user exists
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
			.unique();

		if (existingUser) {
			// Update if needed
			if (
				existingUser.name !== identity.name ||
				existingUser.email !== identity.email
			) {
				await ctx.db.patch(existingUser._id, {
					name: identity.name,
					email: identity.email,
				});
			}
			return existingUser;
		}

		// Create new user
		const userId = await ctx.db.insert("users", {
			name: identity.name,
			email: identity.email,
			tokenIdentifier: identity.subject,
		});

		return await ctx.db.get(userId);
	},
});
