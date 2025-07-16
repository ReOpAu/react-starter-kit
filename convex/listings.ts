import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { createListingValidator, listingValidator, updateListingValidator } from "./schemas/listings/validator";
import { checkAuth } from "./utils/auth";
// Clean schema - no migration utilities needed

export const clearAllListings = mutation({
	args: {},
	handler: async (ctx) => {
		const listings = await ctx.db.query("listings").collect();
		for (const listing of listings) {
			await ctx.db.delete(listing._id);
		}
		return { success: true, cleared: listings.length };
	},
});

export const createListing = mutation({
	args: {
		listing: v.object(createListingValidator),
	},
	handler: async (ctx, { listing }) => {
		// Temporarily disable auth check for development
		// await checkAuth(ctx);
		
		// Add server-generated timestamps
		const now = Date.now();
		const listingWithTimestamps = {
			...listing,
			createdAt: listing.createdAt || now,
			updatedAt: now,
		};
		
		console.log("Creating listing:", listingWithTimestamps);
		const id = await ctx.db.insert("listings", listingWithTimestamps);
		console.log("Created listing with ID:", id);
		return id;
	},
});

export const getListing = query({
	args: { id: v.id("listings") },
	handler: async (ctx, { id }) => {
		return await ctx.db.get(id);
	},
});

export const updateListing = mutation({
	args: {
		id: v.id("listings"),
		updates: v.object(updateListingValidator),
	},
	handler: async (ctx, { id, updates }) => {
		// Temporarily disable auth check for development
		// await checkAuth(ctx);
		console.log("Updating listing with ID:", id);
		console.log("Updates:", updates);
		await ctx.db.patch(id, updates);
		const result = await ctx.db.get(id);
		console.log("Updated listing:", result);
		return result;
	},
});

export const deleteListing = mutation({
	args: { id: v.id("listings") },
	handler: async (ctx, { id }) => {
		await ctx.db.delete(id);
		return { success: true };
	},
});

export const listListings = query({
	args: {
		listingType: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
		state: v.optional(v.string()),
		suburb: v.optional(v.string()),
		page: v.optional(v.number()),
		pageSize: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ listingType, state, suburb, page = 1, pageSize = 12 },
	) => {
		let results;
		if (listingType) {
			results = await ctx.db
				.query("listings")
				.withIndex("by_type", (q2) => q2.eq("listingType", listingType))
				.collect();
		} else {
			results = await ctx.db.query("listings").collect();
		}

		// Debug: log filter inputs and total count
		console.log("Filter inputs:", {
			listingType,
			state,
			suburb,
			page,
			pageSize,
			totalListings: results.length,
		});

		if (state) {
			// Case insensitive state matching - direct field access
			const beforeStateFilter = results.length;
			results = results.filter(
				(l) => l.state.toLowerCase() === state.toLowerCase(),
			);
			console.log(`State filter: ${beforeStateFilter} -> ${results.length}`);
		}
		if (suburb) {
			// Normalize suburb for comparison: convert URL format (potts-point) to title case (Potts Point)
			const normalizedSuburb = suburb
				.replace(/-/g, " ")
				.split(" ")
				.map(
					(word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
				)
				.join(" ");
			const beforeSuburbFilter = results.length;
			console.log(`Suburb normalization: ${suburb} -> ${normalizedSuburb}`);
			console.log("Available suburbs:", [
				...new Set(results.map((l) => l.suburb)),
			]);
			// Case insensitive suburb matching - direct field access
			results = results.filter(
				(l) => l.suburb.toLowerCase() === normalizedSuburb.toLowerCase(),
			);
			console.log(`Suburb filter: ${beforeSuburbFilter} -> ${results.length}`);
		}

		// Calculate pagination
		const totalCount = results.length;
		const totalPages = Math.ceil(totalCount / pageSize);
		const startIndex = (page - 1) * pageSize;
		const endIndex = startIndex + pageSize;

		// Apply pagination
		const paginatedResults = results.slice(startIndex, endIndex);

		console.log(
			`Pagination: page ${page}/${totalPages}, showing ${paginatedResults.length}/${totalCount} results`,
		);

		return {
			listings: paginatedResults,
			pagination: {
				currentPage: page,
				totalPages,
				totalCount,
				pageSize,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1,
			},
		};
	},
});

// Debug query to see all listings with pagination
export const getAllListingsDebug = query({
	args: {
		page: v.optional(v.number()),
		pageSize: v.optional(v.number()),
	},
	handler: async (ctx, { page = 1, pageSize = 50 }) => {
		const allListings = await ctx.db.query("listings").collect();

		// Calculate pagination
		const totalCount = allListings.length;
		const totalPages = Math.ceil(totalCount / pageSize);
		const startIndex = (page - 1) * pageSize;
		const endIndex = startIndex + pageSize;

		// Apply pagination
		const paginatedListings = allListings.slice(startIndex, endIndex);

		return {
			listings: paginatedListings.map((l) => ({
				id: l._id,
				listingType: l.listingType,
				state: l.state,
				suburb: l.suburb,
			})),
			pagination: {
				currentPage: page,
				totalPages,
				totalCount,
				pageSize,
			},
		};
	},
});

// Save/unsave listing functionality
export const saveListing = mutation({
	args: {
		listingId: v.id("listings"),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, { listingId, notes }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		// Get user by auth identity
		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();

		if (!user) throw new Error("User not found");

		// Check if listing is already saved
		const existingSave = await ctx.db
			.query("savedListings")
			.withIndex("by_user_and_listing", (q) =>
				q.eq("userId", user._id).eq("listingId", listingId),
			)
			.unique();

		if (existingSave) {
			// Update existing save with new notes if provided
			if (notes !== undefined) {
				await ctx.db.patch(existingSave._id, { notes });
			}
			return { success: true, alreadySaved: true };
		}

		// Create new saved listing
		await ctx.db.insert("savedListings", {
			userId: user._id,
			listingId,
			savedAt: Date.now(),
			notes,
		});

		return { success: true, alreadySaved: false };
	},
});

export const unsaveListing = mutation({
	args: { listingId: v.id("listings") },
	handler: async (ctx, { listingId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		// Get user by auth identity
		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();

		if (!user) throw new Error("User not found");

		// Find the saved listing
		const savedListing = await ctx.db
			.query("savedListings")
			.withIndex("by_user_and_listing", (q) =>
				q.eq("userId", user._id).eq("listingId", listingId),
			)
			.unique();

		if (savedListing) {
			await ctx.db.delete(savedListing._id);
			return { success: true, wasRemoved: true };
		}

		return { success: true, wasRemoved: false };
	},
});

export const isListingSaved = query({
	args: { listingId: v.id("listings") },
	handler: async (ctx, { listingId }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return false;

		// Get user by auth identity
		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();

		if (!user) return false;

		// Check if listing is saved
		const savedListing = await ctx.db
			.query("savedListings")
			.withIndex("by_user_and_listing", (q) =>
				q.eq("userId", user._id).eq("listingId", listingId),
			)
			.unique();

		return savedListing !== null;
	},
});

// Get user's saved listings
export const getUserSavedListings = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return [];

		// Get user by auth identity
		const user = await ctx.db
			.query("users")
			.withIndex("by_token", (q) =>
				q.eq("tokenIdentifier", identity.tokenIdentifier),
			)
			.unique();

		if (!user) return [];

		// Get saved listings with listing details
		const savedListings = await ctx.db
			.query("savedListings")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.collect();

		// Fetch listing details for each saved listing
		const listingsWithDetails = await Promise.all(
			savedListings.map(async (saved) => {
				const listing = await ctx.db.get(saved.listingId);
				return {
					...saved,
					listing,
				};
			}),
		);

		return listingsWithDetails.filter((item) => item.listing !== null);
	},
});

// Get listing statistics for a specific state
export const getStateListingStats = query({
	args: { state: v.string() },
	handler: async (ctx, { state }) => {
		// Get all listings for the state (case insensitive)
		const allListings = await ctx.db.query("listings").collect();
		const stateListings = allListings.filter(
			(l) => l.state.toLowerCase() === state.toLowerCase(),
		);

		// Calculate stats
		const totalListings = stateListings.length;
		const buyerListings = stateListings.filter(
			(l) => l.listingType === "buyer",
		).length;
		const sellerListings = stateListings.filter(
			(l) => l.listingType === "seller",
		).length;

		return {
			totalListings,
			buyerListings,
			sellerListings,
		};
	},
});
