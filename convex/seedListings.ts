import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import ngeohash from "ngeohash";

const SAMPLE_SUBURBS_WITH_STATES = [
	// NSW - Sydney Area
	{ suburb: "Edgecliff", state: "NSW", postcode: "2027", lat: -33.87924, lng: 151.23614 },
	{ suburb: "Paddington", state: "NSW", postcode: "2021", lat: -33.88416, lng: 151.22728 },
	{ suburb: "Double Bay", state: "NSW", postcode: "2028", lat: -33.87664, lng: 151.24245 },
	{ suburb: "Potts Point", state: "NSW", postcode: "2029", lat: -33.88151, lng: 151.24355 },
	{ suburb: "Surry Hills", state: "NSW", postcode: "2010", lat: -33.88548, lng: 151.21201 },
	{ suburb: "Darlinghurst", state: "NSW", postcode: "2010", lat: -33.87746, lng: 151.21912 },
	{ suburb: "Redfern", state: "NSW", postcode: "2016", lat: -33.89283, lng: 151.20321 },
	{ suburb: "Alexandria", state: "NSW", postcode: "2015", lat: -33.90617, lng: 151.19851 },
	{ suburb: "Newtown", state: "NSW", postcode: "2042", lat: -33.89831, lng: 151.18094 },
	{ suburb: "Glebe", state: "NSW", postcode: "2037", lat: -33.87804, lng: 151.18512 },
	{ suburb: "Ultimo", state: "NSW", postcode: "2007", lat: -33.87813, lng: 151.19869 },
	{ suburb: "Pyrmont", state: "NSW", postcode: "2009", lat: -33.86891, lng: 151.19519 },
	
	// VIC - Melbourne Area  
	{ suburb: "Melbourne", state: "VIC", postcode: "3000", lat: -37.81425, lng: 144.96317 },
	{ suburb: "Richmond", state: "VIC", postcode: "3121", lat: -37.8204, lng: 145.00252 },
	{ suburb: "West Footscray", state: "VIC", postcode: "3012", lat: -37.80174, lng: 144.88407 },
	{ suburb: "South Yarra", state: "VIC", postcode: "3141", lat: -37.8389, lng: 144.9922 },
	{ suburb: "Hawthorn", state: "VIC", postcode: "3122", lat: -37.82442, lng: 145.03172 },
	{ suburb: "Toorak", state: "VIC", postcode: "3142", lat: -37.84161, lng: 145.01762 },
	{ suburb: "Cremorne", state: "VIC", postcode: "3141", lat: -37.8318, lng: 144.9938 },
	{ suburb: "Collingwood", state: "VIC", postcode: "3066", lat: -37.8047, lng: 144.9881 },
	{ suburb: "Fitzroy", state: "VIC", postcode: "3065", lat: -37.7985, lng: 144.9789 },
	{ suburb: "Carlton", state: "VIC", postcode: "3053", lat: -37.7983, lng: 144.9648 },
	{ suburb: "Southbank", state: "VIC", postcode: "3006", lat: -37.8245, lng: 144.9648 },
	{ suburb: "Docklands", state: "VIC", postcode: "3008", lat: -37.8181, lng: 144.9481 },
	
	// QLD - Brisbane Area
	{ suburb: "Brisbane", state: "QLD", postcode: "4000", lat: -27.46897, lng: 153.0235 },
	{ suburb: "South Brisbane", state: "QLD", postcode: "4101", lat: -27.4822, lng: 153.0178 },
	{ suburb: "West End", state: "QLD", postcode: "4101", lat: -27.4846, lng: 153.0081 },
	{ suburb: "Fortitude Valley", state: "QLD", postcode: "4006", lat: -27.4578, lng: 153.0364 },
	{ suburb: "New Farm", state: "QLD", postcode: "4005", lat: -27.4661, lng: 153.0447 },
	{ suburb: "Teneriffe", state: "QLD", postcode: "4005", lat: -27.4628, lng: 153.0481 },
	
	// WA - Perth Area
	{ suburb: "Perth", state: "WA", postcode: "6000", lat: -31.95589, lng: 115.86059 },
	{ suburb: "Northbridge", state: "WA", postcode: "6003", lat: -31.9475, lng: 115.8614 },
	{ suburb: "East Perth", state: "WA", postcode: "6004", lat: -31.9614, lng: 115.8711 },
	{ suburb: "West Perth", state: "WA", postcode: "6005", lat: -31.9525, lng: 115.8408 },
	
	// SA - Adelaide Area
	{ suburb: "Adelaide", state: "SA", postcode: "5000", lat: -34.92818, lng: 138.59993 },
	{ suburb: "North Adelaide", state: "SA", postcode: "5006", lat: -34.9058, lng: 138.5969 },
	{ suburb: "Kent Town", state: "SA", postcode: "5067", lat: -34.9264, lng: 138.6211 },
	{ suburb: "Norwood", state: "SA", postcode: "5067", lat: -34.9189, lng: 138.6297 },
];

const SAMPLE_STREETS = ["Main St", "Park Rd", "Beach Ave", "Hill St", "River Rd"];
const BUILDING_TYPES = ["Apartment", "House", "Townhouse"];
const FEATURES = ["pool", "garage", "balcony", "garden", "aircon", "solar", "study", "ensuite", "walk-in robe"];
const BUYER_RADIUS_OPTIONS = [1, 3, 5, 7]; // Search radius options for street buyers (km)

function getRandomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

function getRandomOffset(radius: number): number {
	const degreeRadius = radius / 111;
	return (Math.random() - 0.5) * degreeRadius * 2;
}

function generateAddress() {
	const suburb = getRandomElement(SAMPLE_SUBURBS_WITH_STATES);
	const streetName = getRandomElement(SAMPLE_STREETS);
	const streetNumber = Math.floor(Math.random() * 100) + 1;
	let radius = 0;
	const distribution = Math.random();
	if (distribution > 0.66) {
		radius = 2 + Math.random();
	} else if (distribution > 0.33) {
		radius = 0.5 + Math.random() * 1.5;
	} else {
		radius = 0.5;
	}
	const lat = suburb.lat + getRandomOffset(radius);
	const lng = suburb.lng + getRandomOffset(radius);
	return {
		street: `${streetNumber} ${streetName}`,
		streetName: streetName,
		suburb: suburb.suburb,
		state: suburb.state,
		postcode: suburb.postcode,
		latitude: lat,
		longitude: lng,
	};
}

function randomFeatures(min = 3, max = 7) {
	const count = Math.floor(Math.random() * (max - min + 1)) + min;
	return [...FEATURES].sort(() => Math.random() - 0.5).slice(0, count);
}

function randomPrice(min = 500000, max = 2500000) {
	const base = Math.floor(Math.random() * (max - min + 1)) + min;
	return { min: base, max: base + Math.floor(Math.random() * 200000) };
}

function randomPropertyDetails() {
	return {
		bedrooms: Math.floor(Math.random() * 5) + 1,
		bathrooms: Math.floor(Math.random() * 3) + 1,
		parkingSpaces: Math.floor(Math.random() * 2) + 1,
		landArea: Math.floor(Math.random() * 500) + 200,
		floorArea: Math.floor(Math.random() * 200) + 50,
	};
}

// Mutation to create a test user
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

// Mutation to create a test listing
export const createSeedListing = mutation({
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
			radiusKm: v.optional(v.number()),
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
		}),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("listings", args.listing);
	},
});

// Action to orchestrate the seeding process
export const seedListings = action({
	args: {
		userCount: v.optional(v.number()),
		listingCount: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const userCount = args.userCount ?? 10;
		const listingCount = args.listingCount ?? 200;

		// Create users using mutations
		const userIds = [];
		for (let i = 0; i < userCount; i++) {
			const userId = await ctx.runMutation(api.seedListings.createSeedUser, {
				email: `user${i + 1}@example.com`,
				name: `User ${i + 1}`,
				tokenIdentifier: `seed_user_${i + 1}`,
			});
			userIds.push(userId);
		}

		// Create listings with better matching potential
		const createdListings = [];
		
		// First, create a mix of random listings (70% of total)
		const randomListingCount = Math.floor(listingCount * 0.7);
		for (let i = 0; i < randomListingCount; i++) {
			const address = generateAddress();
			const buildingType = getRandomElement(BUILDING_TYPES);
			const propertyDetails = randomPropertyDetails();
			const features = randomFeatures();
			const now = Date.now();
			const isBuyer = Math.random() < 0.5;
			const userId = getRandomElement(userIds);
			const listingType: "buyer" | "seller" = isBuyer ? "buyer" : "seller";
			const subtype: "street" | "suburb" = Math.random() < 0.5 ? "street" : "suburb";
			const geohash = ngeohash.encode(address.latitude, address.longitude, 7);
			const headline = isBuyer 
				? (subtype === "street" 
					? `Looking for a ${buildingType} on ${address.streetName}, ${address.suburb}`
					: `Looking for a ${buildingType} in ${address.suburb}`)
				: `Selling a ${buildingType} in ${address.suburb}`;
			const description = isBuyer ? `We are looking to buy a ${buildingType} in ${address.suburb}.` : `A beautiful ${buildingType} for sale in ${address.suburb}.`;

			const baseListing = {
				listingType,
				subtype,
				userId,
				geohash,
				buildingType,
				propertyDetails,
				headline,
				description,
				images: [],
				suburb: address.suburb,
				state: address.state,
				postcode: address.postcode,
				street: address.street,
				latitude: address.latitude,
				longitude: address.longitude,
				isPremium: Math.random() < 0.2,
				sample: true,
				expiresAt: now + 1000 * 60 * 60 * 24 * 30,
				createdAt: now,
				updatedAt: now,
			};

			if (isBuyer) {
				const listingId = await ctx.runMutation(api.seedListings.createSeedListing, {
					listing: {
						...baseListing,
						pricePreference: randomPrice(),
						mustHaveFeatures: randomFeatures(2, 4),
						niceToHaveFeatures: randomFeatures(1, 3),
						// Add radius for street buyers
						radiusKm: subtype === "street" ? getRandomElement(BUYER_RADIUS_OPTIONS) : undefined,
					},
				});
				createdListings.push({ id: listingId, type: "buyer", ...baseListing });
			} else {
				const listingId = await ctx.runMutation(api.seedListings.createSeedListing, {
					listing: {
						...baseListing,
						price: randomPrice(),
						features,
					},
				});
				createdListings.push({ id: listingId, type: "seller", ...baseListing });
			}
		}

		// Then create complementary pairs (30% of total)
		const pairCount = Math.floor((listingCount - randomListingCount) / 2);
		for (let i = 0; i < pairCount; i++) {
			const baseAddress = generateAddress();
			const buildingType = getRandomElement(BUILDING_TYPES);
			const propertyDetails = randomPropertyDetails();
			const features = randomFeatures();
			const now = Date.now();
			const price = randomPrice(400000, 1500000); // Overlapping price range
			
			// Create buyer listing
			const buyerAddress = {
				...baseAddress,
				// Slight variation in location for buyers (within same suburb)
				latitude: baseAddress.latitude + getRandomOffset(0.3),
				longitude: baseAddress.longitude + getRandomOffset(0.3),
			};
			const buyerGeohash = ngeohash.encode(buyerAddress.latitude, buyerAddress.longitude, 7);
			
			const buyerSubtype = Math.random() < 0.7 ? "suburb" : "street"; // More suburb buyers
			await ctx.runMutation(api.seedListings.createSeedListing, {
				listing: {
					listingType: "buyer" as const,
					subtype: buyerSubtype,
					userId: getRandomElement(userIds),
					geohash: buyerGeohash,
					buildingType,
					propertyDetails,
					headline: buyerSubtype === "street" 
						? `Looking for a ${buildingType} on ${baseAddress.streetName}, ${baseAddress.suburb}`
						: `Looking for a ${buildingType} in ${baseAddress.suburb}`,
					description: `We are looking to buy a ${buildingType} in ${baseAddress.suburb}. Looking for ${features.slice(0, 3).join(", ")}.`,
					images: [],
					suburb: baseAddress.suburb,
					state: baseAddress.state,
					postcode: baseAddress.postcode,
					street: baseAddress.street,
					latitude: buyerAddress.latitude,
					longitude: buyerAddress.longitude,
					isPremium: Math.random() < 0.2,
					sample: true,
					expiresAt: now + 1000 * 60 * 60 * 24 * 30,
					createdAt: now,
					updatedAt: now,
					pricePreference: {
						min: Math.max(price.min - 100000, 200000),
						max: price.max + 100000
					},
					mustHaveFeatures: features.slice(0, 2), // Must have some of the seller's features
					niceToHaveFeatures: features.slice(2, 4),
					// Add radius for street buyers
					radiusKm: buyerSubtype === "street" ? getRandomElement(BUYER_RADIUS_OPTIONS) : undefined,
				},
			});

			// Create matching seller listing  
			const sellerAddress = {
				...baseAddress,
				// Small variation for sellers (very close to buyer)
				latitude: baseAddress.latitude + getRandomOffset(0.5),
				longitude: baseAddress.longitude + getRandomOffset(0.5),
			};
			const sellerGeohash = ngeohash.encode(sellerAddress.latitude, sellerAddress.longitude, 7);
			
			await ctx.runMutation(api.seedListings.createSeedListing, {
				listing: {
					listingType: "seller" as const,
					subtype: "street" as const, // Sellers are usually street-specific
					userId: getRandomElement(userIds),
					geohash: sellerGeohash,
					buildingType,
					propertyDetails,
					headline: `${buildingType} for sale in ${baseAddress.suburb}`,
					description: `A beautiful ${buildingType} for sale in ${baseAddress.suburb}. Features include ${features.slice(0, 4).join(", ")}.`,
					images: [],
					suburb: baseAddress.suburb,
					state: baseAddress.state,
					postcode: baseAddress.postcode,
					street: baseAddress.street,
					latitude: sellerAddress.latitude,
					longitude: sellerAddress.longitude,
					isPremium: Math.random() < 0.3,
					sample: true,
					expiresAt: now + 1000 * 60 * 60 * 24 * 30,
					createdAt: now,
					updatedAt: now,
					price,
					features, // Has the features the buyer wants
				},
			});
		}

		return { 
			success: true, 
			message: `Successfully seeded ${userCount} users and ${listingCount} listings` 
		};
	},
});

// Action to delete all sample listings and users
export const deleteSampleData = action({
	args: {},
	handler: async (ctx) => {
		let deletedListings = 0;
		let deletedUsers = 0;

		// Delete all sample listings
		const allListings = await ctx.runQuery(api.listings.listListings, {});
		for (const listing of allListings) {
			if (listing.sample) {
				await ctx.runMutation(api.listings.deleteListing, { id: listing._id });
				deletedListings++;
			}
		}

		// Delete sample users (those with seed_user_ prefix in tokenIdentifier)
		const allUsers = await ctx.runQuery(api.users.listAllUsers, {});
		for (const user of allUsers) {
			if (user.tokenIdentifier.startsWith('seed_user_')) {
				await ctx.runMutation(api.users.deleteUser, { id: user._id });
				deletedUsers++;
			}
		}

		return {
			success: true,
			message: `Deleted ${deletedListings} sample listings and ${deletedUsers} sample users`,
			deletedListings,
			deletedUsers
		};
	},
});

// Action to delete ALL listings (use with caution!)
export const deleteAllListings = action({
	args: {},
	handler: async (ctx) => {
		const allListings = await ctx.runQuery(api.listings.listListings, {});
		let deletedCount = 0;

		for (const listing of allListings) {
			await ctx.runMutation(api.listings.deleteListing, { id: listing._id });
			deletedCount++;
		}

		return {
			success: true,
			message: `Deleted ALL ${deletedCount} listings (sample and real)`,
			deletedListings: deletedCount
		};
	},
});

// Import the API to access mutations
import { api } from "./_generated/api";