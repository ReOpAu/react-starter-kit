import { defineTable } from "convex/server";
import { v } from "convex/values";

const priceRangeSchema = v.object({
	min: v.number(),
	max: v.number(),
});

export const listings = defineTable({
	listingType: v.union(v.literal("buyer"), v.literal("seller")),
	subtype: v.union(v.literal("street"), v.literal("suburb")),
	userId: v.id("users"),
	geohash: v.string(),
	buildingType: v.string(),
	price: v.optional(priceRangeSchema),
	pricePreference: v.optional(priceRangeSchema),
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
	radiusKm: v.optional(v.number()), // Search radius for street buyers
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
	.index("by_listingType", ["listingType"])
	.index("by_geohash_and_type", ["geohash", "listingType"])
	.index("by_userId", ["userId"]);