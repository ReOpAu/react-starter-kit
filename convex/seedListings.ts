import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import ngeohash from "ngeohash";
import { api } from "./_generated/api";
import { PRICE_OPTIONS } from "../shared/constants/priceOptions";

// Sample data for clean, realistic listings
const SUBURBS = [
	{ suburb: "Bondi", state: "NSW", postcode: "2026", lat: -33.8908, lng: 151.2743 },
	{ suburb: "Toorak", state: "VIC", postcode: "3142", lat: -37.8416, lng: 145.0176 },
	{ suburb: "Paddington", state: "QLD", postcode: "4064", lat: -27.4598, lng: 153.0082 },
	{ suburb: "Cottesloe", state: "WA", postcode: "6011", lat: -31.9959, lng: 115.7581 },
	{ suburb: "Unley", state: "SA", postcode: "5061", lat: -34.9447, lng: 138.6056 },
];

const BUILDING_TYPES = ["House", "Apartment", "Townhouse", "Villa", "Unit"];

// Features must match the exact enum values from the schema
const FEATURES = [
	"Pool", "Garden", "Garage", "AirConditioning", "SolarPanels", 
	"StudyRoom", "WalkInWardrobe", "Ensuite", "Balcony", "Fireplace",
	"SecuritySystem", "Gym", "Tennis", "Sauna"
] as const;

type Feature = typeof FEATURES[number];

function getRandomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function randomFeatures(count = 3): Feature[] {
	const shuffled = [...FEATURES].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

function randomPrice(): { min: number; max: number } {
	// Use the exact same price options as the forms for consistency
	const priceValues = PRICE_OPTIONS.map(option => option.value);
	
	// Pick random min price from the same options users see in forms
	const minIndex = Math.floor(Math.random() * (priceValues.length - 3)); // Leave room for max
	const min = priceValues[minIndex];
	
	// Pick max price that's higher than min from the same options
	const maxStartIndex = minIndex + 1 + Math.floor(Math.random() * 3); // 1-3 steps higher
	const maxIndex = Math.min(maxStartIndex, priceValues.length - 1);
	const max = priceValues[maxIndex];
	
	return { min, max };
}

// Create seed listing mutation
export const createSeedListing = mutation({
	args: {
		listing: v.object({
			listingType: v.union(v.literal("buyer"), v.literal("seller")),
			userId: v.id("users"),
			suburb: v.string(),
			state: v.string(),
			postcode: v.string(),
			address: v.optional(v.string()),
			latitude: v.number(),
			longitude: v.number(),
			geohash: v.string(),
			buildingType: v.union(
				v.literal("House"),
				v.literal("Apartment"),
				v.literal("Townhouse"),
				v.literal("Villa"),
				v.literal("Unit")
			),
			bedrooms: v.number(),
			bathrooms: v.number(),
			parking: v.number(),
			priceMin: v.number(),
			priceMax: v.number(),
			features: v.array(v.union(
		v.literal("Pool"),
		v.literal("Garden"),
		v.literal("Garage"),
		v.literal("AirConditioning"),
		v.literal("SolarPanels"),
		v.literal("StudyRoom"),
		v.literal("WalkInWardrobe"),
		v.literal("Ensuite"),
		v.literal("Balcony"),
		v.literal("Fireplace"),
		v.literal("SecuritySystem"),
		v.literal("Gym"),
		v.literal("Tennis"),
		v.literal("Sauna")
	)),
			buyerType: v.optional(v.union(v.literal("street"), v.literal("suburb"))),
			searchRadius: v.optional(v.number()),
			sellerType: v.optional(v.union(v.literal("sale"), v.literal("offmarket"))),
			headline: v.string(),
			description: v.string(),
			images: v.optional(v.array(v.string())),
			contactEmail: v.optional(v.string()),
			contactPhone: v.optional(v.string()),
			isActive: v.boolean(),
			isPremium: v.optional(v.boolean()),
			sample: v.optional(v.boolean()),
			createdAt: v.number(),
			updatedAt: v.number(),
		}),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("listings", args.listing);
	},
});

// Create seed user
export const createSeedUser = mutation({
	args: {
		email: v.string(),
		name: v.string(),
		tokenIdentifier: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("users", {
			email: args.email,
			name: args.name,
			tokenIdentifier: args.tokenIdentifier,
		});
	},
});

// Main seeding action - clean and simple
export const seedListings = action({
	args: {
		userCount: v.optional(v.number()),
		listingCount: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const userCount = args.userCount ?? 5;
		const listingCount = args.listingCount ?? 20;

		// Create users
		const userIds = [];
		for (let i = 0; i < userCount; i++) {
			const userId = await ctx.runMutation(api.seedListings.createSeedUser, {
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				tokenIdentifier: `seed_user_${i + 1}`,
			});
			userIds.push(userId);
		}

		// Create diverse, realistic listings
		for (let i = 0; i < listingCount; i++) {
			const location = getRandomElement(SUBURBS);
			const buildingType = getRandomElement(BUILDING_TYPES);
			const features = randomFeatures(Math.floor(Math.random() * 4) + 2);
			const price = randomPrice();
			const isBuyer = Math.random() < 0.5;
			const now = Date.now();

			// Generate address with small location variation
			const latVariation = (Math.random() - 0.5) * 0.01; // ~1km radius
			const lngVariation = (Math.random() - 0.5) * 0.01;
			const lat = location.lat + latVariation;
			const lng = location.lng + lngVariation;
			const geohash = ngeohash.encode(lat, lng, 7);

			const baseListing = {
				listingType: isBuyer ? "buyer" as const : "seller" as const,
				userId: getRandomElement(userIds),
				suburb: location.suburb,
				state: location.state,
				postcode: location.postcode,
				latitude: lat,
				longitude: lng,
				geohash,
				buildingType: buildingType as any,
				bedrooms: Math.floor(Math.random() * 4) + 1, // 1-4 bedrooms
				bathrooms: Math.floor(Math.random() * 3) + 1, // 1-3 bathrooms  
				parking: Math.floor(Math.random() * 3), // 0-2 parking spaces
				priceMin: price.min,
				priceMax: price.max,
				features,
				headline: isBuyer 
					? `Looking for ${buildingType} in ${location.suburb}`
					: `Beautiful ${buildingType} in ${location.suburb}`,
				description: isBuyer
					? `Seeking a quality ${buildingType} in ${location.suburb}. Features wanted: ${features.slice(0, 2).join(", ")}.`
					: `Stunning ${buildingType} for sale in ${location.suburb}. Features: ${features.join(", ")}.`,
				images: [],
				isActive: true,
				isPremium: Math.random() < 0.2,
				sample: true,
				createdAt: now,
				updatedAt: now,
			};

			if (isBuyer) {
				const buyerType = Math.random() < 0.7 ? "suburb" : "street";
				await ctx.runMutation(api.seedListings.createSeedListing, {
					listing: {
						...baseListing,
						buyerType,
						searchRadius: buyerType === "street" ? Math.floor(Math.random() * 5) + 1 : undefined,
					},
				});
			} else {
				const streetNum = Math.floor(Math.random() * 200) + 1;
				await ctx.runMutation(api.seedListings.createSeedListing, {
					listing: {
						...baseListing,
						address: `${streetNum} Main Street, ${location.suburb} ${location.state} ${location.postcode}`,
						sellerType: Math.random() < 0.8 ? "sale" : "offmarket",
						contactEmail: `seller${i}@example.com`,
						contactPhone: `04${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
					},
				});
			}
		}

		return {
			success: true,
			message: `Created ${userCount} users and ${listingCount} listings`,
		};
	},
});

// Cleanup actions
export const deleteSampleData = action({
	args: {},
	handler: async (ctx) => {
		// Delete sample listings
		const listings = await ctx.runQuery(api.listings.listListings, {});
		let deletedListings = 0;
		for (const listing of listings.listings) {
			if (listing.sample) {
				await ctx.runMutation(api.listings.deleteListing, { id: listing._id });
				deletedListings++;
			}
		}

		// Delete sample users
		const users = await ctx.runQuery(api.users.listAllUsers, {});
		let deletedUsers = 0;
		for (const user of users) {
			if (user.tokenIdentifier.startsWith('seed_user_')) {
				await ctx.runMutation(api.users.deleteUser, { id: user._id });
				deletedUsers++;
			}
		}

		return {
			success: true,
			deletedListings,
			deletedUsers,
		};
	},
});

export const deleteAllListings = action({
	args: {},
	handler: async (ctx): Promise<{ success: boolean; message: string; deletedListings: number }> => {
		const result = await ctx.runMutation(api.listings.clearAllListings, {});
		return {
			success: true,
			message: `Deleted ${result.cleared} listings`,
			deletedListings: result.cleared,
		};
	},
});