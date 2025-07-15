import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const clearAllListings = mutation({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    for (const listing of listings) {
      await ctx.db.delete(listing._id);
    }
    return { success: true, cleared: listings.length };
  }
});

export const createListing = mutation({
  args: {
    listing: v.object({
      listingType: v.union(v.literal("buyer"), v.literal("seller")),
      subtype: v.union(v.literal("street"), v.literal("suburb")),
      userId: v.id("users"),
      geohash: v.string(),
      buildingType: v.string(),
      price: v.optional(v.object({ min: v.number(), max: v.number() })),
      pricePreference: v.optional(v.object({ min: v.number(), max: v.number() })),
      propertyDetails: v.object({
        bedrooms: v.number(),
        bathrooms: v.number(),
        parkingSpaces: v.number(),
        landArea: v.optional(v.number()),
        floorArea: v.optional(v.number()),
      }),
      mustHaveFeatures: v.optional(v.array(v.string())),
      niceToHaveFeatures: v.optional(v.array(v.string())),
      features: v.optional(v.array(v.string())),
      headline: v.string(),
      description: v.string(),
      images: v.optional(v.array(v.string())),
      suburb: v.string(),
      state: v.string(),
      postcode: v.string(),
      street: v.optional(v.string()),
      latitude: v.number(),
      longitude: v.number(),
      isPremium: v.optional(v.boolean()),
      sample: v.optional(v.boolean()),
      expiresAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
  },
  handler: async (ctx, { listing }) => {
    const id = await ctx.db.insert("listings", listing);
    return id;
  }
});

export const getListing = query({
  args: { id: v.id("listings") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  }
});

export const updateListing = mutation({
  args: {
    id: v.id("listings"),
    updates: v.object({
      listingType: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
      subtype: v.optional(v.union(v.literal("street"), v.literal("suburb"))),
      geohash: v.optional(v.string()),
      buildingType: v.optional(v.string()),
      price: v.optional(v.object({ min: v.number(), max: v.number() })),
      pricePreference: v.optional(v.object({ min: v.number(), max: v.number() })),
      propertyDetails: v.optional(v.object({
        bedrooms: v.number(),
        bathrooms: v.number(),
        parkingSpaces: v.number(),
        landArea: v.optional(v.number()),
        floorArea: v.optional(v.number()),
      })),
      mustHaveFeatures: v.optional(v.array(v.string())),
      niceToHaveFeatures: v.optional(v.array(v.string())),
      features: v.optional(v.array(v.string())),
      headline: v.optional(v.string()),
      description: v.optional(v.string()),
      images: v.optional(v.array(v.string())),
      suburb: v.optional(v.string()),
      state: v.optional(v.string()),
      postcode: v.optional(v.string()),
      street: v.optional(v.string()),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      isPremium: v.optional(v.boolean()),
      sample: v.optional(v.boolean()),
      expiresAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    })
  },
  handler: async (ctx, { id, updates }) => {
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  }
});

export const deleteListing = mutation({
  args: { id: v.id("listings") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
    return { success: true };
  }
});

export const listListings = query({
  args: {
    listingType: v.optional(v.union(v.literal("buyer"), v.literal("seller"))),
    state: v.optional(v.string()),
    suburb: v.optional(v.string()),
  },
  handler: async (ctx, { listingType, state, suburb }) => {
    let results;
    if (listingType) {
      results = await ctx.db
        .query("listings")
        .withIndex("by_listingType", q2 => q2.eq("listingType", listingType))
        .collect();
    } else {
      results = await ctx.db.query("listings").collect();
    }
    
    // Debug: log filter inputs and total count
    console.log("Filter inputs:", { listingType, state, suburb, totalListings: results.length });
    
    if (state) {
      // Case insensitive state matching
      const beforeStateFilter = results.length;
      results = results.filter(l => l.state.toLowerCase() === state.toLowerCase());
      console.log(`State filter: ${beforeStateFilter} -> ${results.length}`);
    }
    if (suburb) {
      // Normalize suburb for comparison: convert URL format (potts-point) to title case (Potts Point)
      const normalizedSuburb = suburb.replace(/-/g, ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      const beforeSuburbFilter = results.length;
      console.log(`Suburb normalization: ${suburb} -> ${normalizedSuburb}`);
      console.log("Available suburbs:", [...new Set(results.map(l => l.suburb))]);
      // Case insensitive suburb matching
      results = results.filter(l => l.suburb.toLowerCase() === normalizedSuburb.toLowerCase());
      console.log(`Suburb filter: ${beforeSuburbFilter} -> ${results.length}`);
    }
    
    console.log("Final results:", results.length);
    return results;
  }
});

// Debug query to see all listings
export const getAllListingsDebug = query({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    return listings.map(l => ({ 
      id: l._id, 
      listingType: l.listingType, 
      state: l.state, 
      suburb: l.suburb 
    }));
  }
}); 

// Save/unsave listing functionality
export const saveListing = mutation({
  args: { 
    listingId: v.id("listings"),
    notes: v.optional(v.string())
  },
  handler: async (ctx, { listingId, notes }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get user by auth identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    // Check if listing is already saved
    const existingSave = await ctx.db
      .query("savedListings")
      .withIndex("by_user_and_listing", q => q.eq("userId", user._id).eq("listingId", listingId))
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
      notes
    });
    
    return { success: true, alreadySaved: false };
  }
});

export const unsaveListing = mutation({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Get user by auth identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    if (!user) throw new Error("User not found");
    
    // Find the saved listing
    const savedListing = await ctx.db
      .query("savedListings")
      .withIndex("by_user_and_listing", q => q.eq("userId", user._id).eq("listingId", listingId))
      .unique();
    
    if (savedListing) {
      await ctx.db.delete(savedListing._id);
      return { success: true, wasRemoved: true };
    }
    
    return { success: true, wasRemoved: false };
  }
});

export const isListingSaved = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, { listingId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    
    // Get user by auth identity
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    if (!user) return false;
    
    // Check if listing is saved
    const savedListing = await ctx.db
      .query("savedListings")
      .withIndex("by_user_and_listing", q => q.eq("userId", user._id).eq("listingId", listingId))
      .unique();
    
    return savedListing !== null;
  }
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
      .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    
    if (!user) return [];
    
    // Get saved listings with listing details
    const savedListings = await ctx.db
      .query("savedListings")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
    
    // Fetch listing details for each saved listing
    const listingsWithDetails = await Promise.all(
      savedListings.map(async (saved) => {
        const listing = await ctx.db.get(saved.listingId);
        return {
          ...saved,
          listing
        };
      })
    );
    
    return listingsWithDetails.filter(item => item.listing !== null);
  }
});