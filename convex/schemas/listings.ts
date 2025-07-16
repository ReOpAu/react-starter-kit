import { defineTable } from "convex/server";
import { v } from "convex/values";

// Clean, powerful listing schema - production ready
export const listings = defineTable({
	// Core Identity
	listingType: v.union(v.literal("buyer"), v.literal("seller")),
	userId: v.id("users"),

	// Location (simple & clean)
	suburb: v.string(),
	state: v.string(),
	postcode: v.string(),
	address: v.optional(v.string()), // Full address for sellers
	latitude: v.number(),
	longitude: v.number(),
	geohash: v.string(),

	// Property Basics
	buildingType: v.union(
		v.literal("House"),
		v.literal("Apartment"),
		v.literal("Townhouse"),
		v.literal("Villa"),
		v.literal("Unit"),
	),
	bedrooms: v.number(),
	bathrooms: v.number(),
	parking: v.number(), // Simple: number of spaces

	// Price (simple & powerful)
	priceMin: v.number(),
	priceMax: v.number(),

	// Features (comprehensive enum matching saaskit PropertyFeature)
	features: v.array(
		v.union(
			v.literal("CornerBlock"),
			v.literal("EnsuiteBathroom"),
			v.literal("MatureGarden"),
			v.literal("LockUpGarage"),
			v.literal("Pool"),
			v.literal("SolarPanels"),
			v.literal("RenovatedKitchen"),
			v.literal("AirConditioning"),
			v.literal("HighCeilings"),
			v.literal("WaterViews"),
			v.literal("StudyRoom"),
			v.literal("OpenPlanLiving"),
			v.literal("SecuritySystem"),
			v.literal("EnergyEfficient"),
			v.literal("NorthFacing"),
			v.literal("PetFriendly"),
			v.literal("WheelchairAccessible"),
			v.literal("SmartHome"),
			v.literal("Fireplace"),
			v.literal("WalkInWardrobe"),
			v.literal("LanewayAccess"),
			v.literal("Bungalow"),
			v.literal("DualLiving"),
			v.literal("GrannyFlat"),
			v.literal("HeritageListed"),
			v.literal("RainwaterTank"),
			v.literal("DoubleGlazedWindows"),
			v.literal("HomeTheatre"),
			v.literal("WineCellar"),
			v.literal("OutdoorKitchen"),
		),
	),

	// Buyer-specific
	buyerType: v.optional(v.union(v.literal("street"), v.literal("suburb"))),
	searchRadius: v.optional(v.number()), // km for street buyers

	// Seller-specific
	sellerType: v.optional(v.union(v.literal("sale"), v.literal("offmarket"))),

	// Content
	headline: v.string(),
	description: v.string(),
	images: v.optional(v.array(v.string())),

	// Contact
	contactEmail: v.optional(v.string()),
	contactPhone: v.optional(v.string()),

	// Metadata
	isActive: v.boolean(),
	isPremium: v.optional(v.boolean()),
	sample: v.optional(v.boolean()),
	createdAt: v.number(),
	updatedAt: v.number(),
})
	.index("by_type", ["listingType"])
	.index("by_location", ["state", "suburb"])
	.index("by_geohash", ["geohash"]);
