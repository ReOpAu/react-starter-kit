/*
 * This file is imported by:
 * - app/routes/home.tsx
 * - app/hooks/useEnhancedPlaceSuggestions.ts
 * - app/hooks/useSuburbAutocomplete.ts
 * - app/routes/conv-address.tsx
 */
"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// Intent classification types
export type LocationIntent = "suburb" | "street" | "address" | "general";

// Result types for better UI display
export interface PlaceSuggestion {
	placeId: string;
	description: string;
	types: string[];
	matchedSubstrings: Array<{ length: number; offset: number }>;
	structuredFormatting: {
		mainText: string;
		secondaryText: string;
		main_text?: string;
		secondary_text?: string;
		main_text_matched_substrings?: Array<{ length: number; offset: number }>;
	};
	resultType: "suburb" | "street" | "address" | "general";
	confidence: number;
	suburb?: string; // 🎯 NEW: Extracted suburb/town from Places API
}

interface GoogleAutocompletePrediction {
	description: string;
	place_id: string;
	types: string[];
}

// 🎯 NEW: Helper function to extract suburb/town from Places API response
function extractSuburbFromPlacesSuggestion(
	suggestion: PlaceSuggestion,
): string | undefined {
	console.log(
		`[Suburb Extraction] Extracting suburb from: "${suggestion.description}"`,
	);

	// Method 1 (HIGHEST PRIORITY): If the result is a suburb, the main text is the suburb.
	if (
		suggestion.resultType === "suburb" &&
		suggestion.structuredFormatting.mainText
	) {
		const suburb = suggestion.structuredFormatting.mainText.trim();
		console.log(
			`[Suburb Extraction] Result is suburb type, using mainText: "${suburb}"`,
		);
		return suburb;
	}

	// Method 2: Extract from secondaryText (good for full addresses where suburb is in secondary)
	if (suggestion.structuredFormatting.secondaryText) {
		const secondaryText = suggestion.structuredFormatting.secondaryText;
		const parts = secondaryText.split(",").map((part) => part.trim());
		if (parts.length > 0) {
			const firstPart = parts[0];
			const suburb = firstPart
				.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, "")
				.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, "")
				.replace(/\s+\d{4}$/, "")
				.trim();

			if (suburb) {
				console.log(
					`[Suburb Extraction] Found suburb in secondaryText: "${suburb}"`,
				);
				return suburb;
			}
		}
	}

	// Method 3: Fallback to parsing the full description string.
	if (suggestion.description) {
		const parts = suggestion.description.split(",").map((part) => part.trim());

		let potentialSuburbPart: string | undefined;
		if (
			suggestion.types.includes("street_address") ||
			suggestion.types.includes("premise")
		) {
			if (parts.length >= 2) {
				potentialSuburbPart = parts[1];
			}
		} else {
			if (parts.length > 0) {
				potentialSuburbPart = parts[0];
			}
		}

		if (potentialSuburbPart) {
			const suburb = potentialSuburbPart
				.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, "")
				.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, "")
				.replace(/\s+\d{4}$/, "")
				.trim();

			if (suburb && suburb.length > 0 && suburb.toLowerCase() !== "australia") {
				console.log(
					`[Suburb Extraction] Found suburb in description fallback: "${suburb}"`,
				);
				return suburb;
			}
		}
	}

	console.log("[Suburb Extraction] Could not extract suburb from suggestion");
	return undefined;
}

// Module-level constant for excluded place types
export const EXCLUDED_PLACE_TYPES = [
	"establishment",
	"point_of_interest",
	"store",
	"food",
	"restaurant",
	"gas_station",
	"hospital",
	"school",
	"street_address",
	"route",
	"premise",
	"subpremise",
	"shopping_mall",
	"park",
	"tourist_attraction",
	"transit_station",
	"train_station",
	"bus_station",
	"subway_station",
	"airport",
	"university",
	"hotel",
	"club",
	"golf_course",
	"stadium",
	"casino",
	"museum",
	"art_gallery",
	"aquarium",
	"zoo",
	"marina",
	"beach",
	"mountain",
	"lake",
	"river",
	"waterfall",
	"theme_park",
	"amusement_park",
	"bowling_alley",
	"night_club",
	"bar",
	"movie_theater",
	"beauty_salon",
	"car_dealer",
	"real_estate_agency",
	"lawyer",
	"dentist",
	"doctor",
	"pharmacy",
	"bank",
	"gym",
	"campground",
	"camping_cabin",
	"hiking_area",
	"natural_feature",
	"walking_track",
	"hiking_trail",
	"nature_trail",
	"walking_path",
	"pedestrian_path",
	"bike_path",
	"cycling_path",
	"trail_head",
	"playground",
	"picnic_ground",
	"observation_deck",
	"lookout",
	"scenic_lookout",
	"visitor_center",
	"information_center",
	"plaza",
	"square",
	"gardens",
	"depot",
	"terminal",
	"junction",
] as const;

// Intent classification helper
function classifyLocationIntent(query: string): LocationIntent {
	const lowerQuery = query.toLowerCase().trim();

	// Street indicators
	const streetKeywords = [
		"street",
		"st",
		"road",
		"rd",
		"avenue",
		"ave",
		"lane",
		"ln",
		"drive",
		"dr",
		"way",
		"crescent",
		"cres",
		"court",
		"ct",
		"place",
		"pl",
		"terrace",
		"tce",
		"grove",
		"close",
		"boulevard",
		"blvd",
		"parade",
		"pde",
		"circuit",
		"cct",
		"walk",
		"mews",
		"row",
		"square",
		"sq",
		"esplanade",
		"esp",
	];

	// Check if query has street type indicator
	const hasStreetType = streetKeywords.some((keyword) => {
		// Use word boundaries to avoid false matches like "st" in "west"
		const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, "i");
		return wordBoundaryRegex.test(lowerQuery);
	});

	// Check for house number at the beginning (true address)
	const hasHouseNumber = /^\d+[a-z]?\s+/.test(lowerQuery);

	// Check for unit/apartment patterns at the beginning
	const hasUnitNumber =
		/^(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery);

	// 🎯 STRICTER ADDRESS CLASSIFICATION for Two-Step Validation
	// Only classify as "address" if it has BOTH a street number AND street type AND looks complete
	// This ensures we only use Address Validation API for complete street addresses
	if ((hasHouseNumber || hasUnitNumber) && hasStreetType) {
		// Additional check: address should look complete (have suburb/state info)
		// Incomplete addresses like "38 Clive street Wes" should be treated as "street" during autocomplete
		const hasSuburbInfo =
			/\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(
				lowerQuery,
			) ||
			/\b\d{4}\b/.test(lowerQuery) || // Has postcode
			lowerQuery.split(",").length >= 2; // Has comma-separated parts (likely includes suburb)

		// If it has address components but looks incomplete, treat as street for autocomplete
		if (!hasSuburbInfo && lowerQuery.length < 50) {
			// Reasonable length check
			console.log(
				`[Intent Classification] "${query}" has address components but appears incomplete - treating as street for autocomplete`,
			);
			return "street";
		}

		return "address";
	}

	// Street name pattern (street type but no house number at start)
	// Examples: "Clive street", "Smith Road, Richmond", "Collins St, Melbourne"
	if (hasStreetType && !hasHouseNumber && !hasUnitNumber) {
		return "street";
	}

	// Unit/apartment patterns anywhere in the query without street type (fallback to general)
	if (
		/\b(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery) &&
		!hasStreetType
	) {
		return "general";
	}

	// Check for postcode patterns (4 digits) - these are usually suburbs
	const hasPostcode = /\b\d{4}\b/.test(lowerQuery);

	// Check for Australian state abbreviations
	const hasAustralianState =
		/\b(vic|nsw|qld|wa|sa|tas|nt|act|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(
			lowerQuery,
		);

	// If it has postcode or state but no street indicators, likely a suburb
	if ((hasPostcode || hasAustralianState) && !hasStreetType) {
		return "suburb";
	}

	// Suburb patterns (simple text without numbers or street types)
	const isSimpleText = /^[a-z\s\-']+$/i.test(lowerQuery);

	// If it's just simple text without street indicators, assume suburb
	if (isSimpleText && !hasStreetType) {
		return "suburb";
	}

	return "general";
}

// Enhanced place suggestions function with intent handling
export const getPlaceSuggestions = action({
	args: {
		query: v.string(),
		intent: v.optional(
			v.union(
				v.literal("suburb"),
				v.literal("street"),
				v.literal("address"),
				v.literal("general"),
			),
		),
		maxResults: v.optional(v.number()),
		location: v.optional(
			v.object({
				lat: v.number(),
				lng: v.number(),
			}),
		),
		radius: v.optional(v.number()),
		isAutocomplete: v.optional(v.boolean()), // NEW: Flag to indicate if this is for autocomplete (vs explicit validation)
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			suggestions: v.array(
				v.object({
					placeId: v.string(),
					description: v.string(),
					types: v.array(v.string()),
					matchedSubstrings: v.array(
						v.object({
							length: v.number(),
							offset: v.number(),
						}),
					),
					structuredFormatting: v.object({
						mainText: v.string(),
						secondaryText: v.string(),
						main_text: v.optional(v.string()),
						secondary_text: v.optional(v.string()),
						main_text_matched_substrings: v.optional(
							v.array(
								v.object({
									length: v.number(),
									offset: v.number(),
								}),
							),
						),
					}),
					resultType: v.union(
						v.literal("suburb"),
						v.literal("street"),
						v.literal("address"),
						v.literal("general"),
					),
					confidence: v.number(),
					suburb: v.optional(v.string()), // 🎯 NEW: Add suburb field
				}),
			),
			detectedIntent: v.union(
				v.literal("suburb"),
				v.literal("street"),
				v.literal("address"),
				v.literal("general"),
			),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_PLACES_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		try {
			const query = args.query.trim();
			const detectedIntent = args.intent || classifyLocationIntent(query);
			const maxResults = args.maxResults || 8;
			// Use baseSuburbLookup for all intents
			const baseResult = await baseSuburbLookup(query, apiKey, {
				includeDetails: true,
				maxResults,
			});
			if (baseResult.success) {
				// Map to PlaceSuggestion[] format using preserved fields
				const suggestions = baseResult.results.map((r) => ({
					placeId: r.placeId || "",
					description: r.canonicalSuburb,
					types: r.types || [],
					matchedSubstrings: r.matchedSubstrings || [],
					structuredFormatting: {
						mainText:
							r.structuredFormatting?.main_text ||
							r.canonicalSuburb.split(",")[0] ||
							r.canonicalSuburb,
						secondaryText:
							r.structuredFormatting?.secondary_text ||
							r.canonicalSuburb.split(",").slice(1).join(",").trim() ||
							"",
						main_text: r.structuredFormatting?.main_text,
						secondary_text: r.structuredFormatting?.secondary_text,
						main_text_matched_substrings:
							r.structuredFormatting?.main_text_matched_substrings,
					},
					resultType: detectedIntent,
					confidence: 1,
					suburb: r.canonicalSuburb.split(",")[0] || r.canonicalSuburb,
				}));
				return {
					success: true as const,
					suggestions,
					detectedIntent,
				};
			}
			return {
				success: false as const,
				error: baseResult.error,
			};
		} catch (error) {
			console.error("Error in getPlaceSuggestions:", error);
			return {
				success: false as const,
				error: "Failed to fetch place suggestions",
			};
		}
	},
});

// Helper functions
function classifyResultType(
	types: string[],
	description: string,
): "suburb" | "street" | "address" | "general" {
	// Specific address indicators
	if (
		types.includes("street_address") ||
		types.includes("premise") ||
		/^\d+/.test(description)
	) {
		return "address";
	}

	// Street indicators
	if (
		types.includes("route") ||
		/\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|crescent|cres|court|ct|place|pl)\b/i.test(
			description,
		)
	) {
		return "street";
	}

	// Suburb indicators
	if (
		types.includes("locality") ||
		types.includes("sublocality") ||
		types.includes("administrative_area_level_2")
	) {
		return "suburb";
	}

	return "general";
}

interface GooglePlacePrediction {
	types: string[];
	description: string;
	place_id: string;
	matched_substrings?: Array<{ length: number; offset: number }>;
	structured_formatting?: {
		main_text: string;
		secondary_text: string;
		main_text_matched_substrings?: Array<{ length: number; offset: number }>;
	};
}

function calculateConfidence(
	prediction: GooglePlacePrediction,
	detectedIntent: LocationIntent,
	resultType: "suburb" | "street" | "address" | "general",
): number {
	let confidence = 0.5; // Base confidence

	// Boost confidence for intent match
	if (doesResultMatchIntent(resultType, detectedIntent)) {
		confidence += 0.3;
	}

	// Boost for exact type matches
	if (
		(detectedIntent === "suburb" && prediction.types.includes("locality")) ||
		(detectedIntent === "street" && prediction.types.includes("route")) ||
		(detectedIntent === "address" &&
			prediction.types.includes("street_address"))
	) {
		confidence += 0.2;
	}

	// Penalize establishment types for suburb/street intents
	if (
		(detectedIntent === "suburb" || detectedIntent === "street") &&
		prediction.types.some((type: string) => type.includes("establishment"))
	) {
		confidence -= 0.3;
	}

	// Boost for Australian addresses
	if (/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|Australia)/.test(prediction.description)) {
		confidence += 0.1;
	}

	return Math.max(0, Math.min(1, confidence));
}

function doesResultMatchIntent(
	resultType: "suburb" | "street" | "address" | "general",
	intent: LocationIntent,
): boolean {
	switch (intent) {
		case "suburb":
			return resultType === "suburb";
		case "street":
			return resultType === "street" || resultType === "address";
		case "address":
			return resultType === "address" || resultType === "street";
		case "general":
			return true;
		default:
			return false;
	}
}

function shouldIncludeResult(
	prediction: GooglePlacePrediction,
	intent: LocationIntent,
	strictness: string,
): boolean {
	const description = prediction.description.toLowerCase();
	const types = prediction.types;

	// Always exclude non-Australian results
	if (
		!/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|Australia)/i.test(prediction.description)
	) {
		return false;
	}

	// Exclude unwanted establishment types - comprehensive list
	const unwantedTypes = [
		// Business establishments
		"establishment",
		"point_of_interest",
		"store",
		"food",
		"restaurant",
		"gas_station",
		"hospital",
		"school",
		"shopping_mall",
		"university",
		"bank",
		"pharmacy",
		"gym",
		"beauty_salon",
		"car_dealer",
		"real_estate_agency",
		"lawyer",
		"dentist",
		"doctor",

		// Tourist attractions and recreational areas
		"tourist_attraction",
		"park",
		"amusement_park",
		"zoo",
		"museum",
		"art_gallery",
		"aquarium",
		"casino",

		// Natural features and outdoor recreation
		"natural_feature",
		"hiking_area",
		"camping_cabin",
		"campground",
		"national_park",
		"state_park",
		"botanical_garden",
		"beach",
		"mountain_peak",
		"lake",
		"river",
		"waterfall",
		"trail",

		// Entertainment and recreation venues
		"movie_theater",
		"bowling_alley",
		"night_club",
		"bar",
		"stadium",
		"sports_complex",
		"golf_course",
		"ski_resort",
		"marina",
		"water_park",
		"theme_park",

		// Transportation
		"transit_station",
		"airport",
		"bus_station",
		"train_station",
		"subway_station",

		// Walking tracks, trails, and outdoor paths
		"walking_track",
		"hiking_trail",
		"nature_trail",
		"walking_path",
		"pedestrian_path",
		"bike_path",
		"cycling_path",
		"trail_head",

		// Other recreational facilities
		"playground",
		"picnic_ground",
		"observation_deck",
		"lookout",
		"scenic_lookout",
		"visitor_center",
		"information_center",
	];

	const hasUnwantedType = types.some((type: string) =>
		unwantedTypes.includes(type as (typeof EXCLUDED_PLACE_TYPES)[number]),
	);

	// Exclude unwanted keywords - comprehensive list
	const unwantedKeywords = [
		"tunnel",
		"bridge",
		"mall",
		"centre",
		"center",
		"station",
		"hospital",
		"school",
		"university",
		"airport",
		"port",
		"wharf",
		"pier",
		"marina",
		"golf",
		"club",
		"hotel",
		"motel",
		"plaza",
		"depot",
		"terminal",
		"walk",
		"trail",
		"track",
		"path",
		"falls",
		"waterfall",
		"lookout",
		"reserve",
		"park",
		"garden",
		"beach",
		"creek",
		"river",
		"lake",
		"mountain",
		"hill",
		"valley",
		"gorge",
		"scenic",
		"viewpoint",
		"camping",
		"campground",
		"caravan",
		"picnic",
		"bbq",
		"playground",
	];

	const hasUnwantedKeyword = unwantedKeywords.some((keyword) =>
		description.includes(keyword),
	);

	// Apply strictness-based filtering
	if (strictness === "high") {
		// For suburbs, only allow genuine locality types
		if (intent === "suburb") {
			const isGenuineSuburb = types.some((type: string) =>
				["locality", "sublocality", "administrative_area_level_2"].includes(
					type,
				),
			);
			return isGenuineSuburb && !hasUnwantedType && !hasUnwantedKeyword;
		}
	}

	return !hasUnwantedType && !hasUnwantedKeyword;
}

// --- BEGIN: Base suburb lookup function and wrappers ---

interface SuburbLookupOptions {
	includeDetails?: boolean;
	maxResults?: number;
}

interface SuburbLookupResult {
	canonicalSuburb: string;
	placeId?: string;
	geocode?: { lat: number; lng: number };
	types?: string[];
	structuredFormatting?: {
		main_text?: string;
		secondary_text?: string;
		main_text_matched_substrings?: Array<{ length: number; offset: number }>;
	};
	matchedSubstrings?: Array<{ length: number; offset: number }>;
}

async function baseSuburbLookup(
	suburbInput: string,
	apiKey: string,
	options: SuburbLookupOptions = {},
): Promise<
	| {
			success: true;
			results: SuburbLookupResult[];
	  }
	| {
			success: false;
			error: string;
	  }
> {
	const { includeDetails = false, maxResults = 5 } = options;
	try {
		// Helper function to get place details including geocode
		const getPlaceDetails = async (placeId: string) => {
			const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,types&key=${apiKey}`;
			const detailsResponse = await fetch(detailsUrl);
			const detailsData = await detailsResponse.json();
			if (detailsData.status === "OK" && detailsData.result) {
				return {
					lat: detailsData.result.geometry?.location?.lat || 0,
					lng: detailsData.result.geometry?.location?.lng || 0,
					types: detailsData.result.types || [],
				};
			}
			return null;
		};

		const allResults: SuburbLookupResult[] = [];
		const urls = [
			`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=address&components=country:au&key=${apiKey}`,
			`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=geocode&components=country:au&key=${apiKey}`,
			`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=(regions)&components=country:au&key=${apiKey}`,
		];
		const responses = await Promise.all(
			urls.map((url) => fetch(url).then((res) => res.json())),
		);
		const [addressData, geocodeData, regionsData] = responses;

		// Helper to filter predictions for valid suburbs
		function filterSuburbPredictions(predictions: any[]): any[] {
			return predictions.filter((prediction) => {
				// Only accept suburb-level types (not specific addresses or businesses)
				const isSuburbLevel = prediction.types.some((type: string) =>
					[
						"locality",
						"sublocality",
						"sublocality_level_1",
						"administrative_area_level_2",
						"political",
					].includes(type),
				);
				// Exclude specific addresses, businesses, and establishments
				const isSpecificPlace = prediction.types.some((type: string) =>
					EXCLUDED_PLACE_TYPES.includes(
						type as (typeof EXCLUDED_PLACE_TYPES)[number],
					),
				);
				// Must contain Australian state
				const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(
					prediction.description,
				);
				// Must NOT contain specific place names (tunnels, bridges, etc.)
				const hasSpecificPlaceName =
					/\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(
						prediction.description,
					);
				// Must be a simple suburb format (e.g., "Richmond VIC, Australia")
				const isSimpleSuburbFormat =
					/^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(
						prediction.description,
					);
				return (
					isSuburbLevel &&
					!isSpecificPlace &&
					hasAustralianState &&
					!hasSpecificPlaceName &&
					isSimpleSuburbFormat
				);
			});
		}

		// Helper to add results from a prediction list
		async function addResults(predictions: any[]) {
			for (const prediction of predictions) {
				if (allResults.length >= maxResults) break;
				if (allResults.some((r) => r.placeId === prediction.place_id)) continue;
				if (includeDetails) {
					const placeDetails = await getPlaceDetails(prediction.place_id);
					if (placeDetails) {
						allResults.push({
							canonicalSuburb: prediction.description,
							placeId: prediction.place_id,
							geocode: { lat: placeDetails.lat, lng: placeDetails.lng },
							types: placeDetails.types,
							structuredFormatting: prediction.structured_formatting,
							matchedSubstrings: prediction.matched_substrings,
						});
					}
				} else {
					allResults.push({
						canonicalSuburb: prediction.description,
						placeId: prediction.place_id,
						structuredFormatting: prediction.structured_formatting,
						matchedSubstrings: prediction.matched_substrings,
					});
				}
			}
		}

		// Try addressData
		if (addressData.status === "OK" && addressData.predictions) {
			const matches = filterSuburbPredictions(addressData.predictions);
			await addResults(matches);
		}
		// Try geocodeData if needed
		if (
			allResults.length < maxResults &&
			geocodeData.status === "OK" &&
			geocodeData.predictions
		) {
			const matches = filterSuburbPredictions(geocodeData.predictions).filter(
				(prediction) =>
					!allResults.some((r) => r.placeId === prediction.place_id),
			);
			await addResults(matches);
		}
		// Try regionsData if needed
		if (
			allResults.length < maxResults &&
			regionsData.status === "OK" &&
			regionsData.predictions
		) {
			const matches = filterSuburbPredictions(regionsData.predictions).filter(
				(prediction) =>
					!allResults.some((r) => r.placeId === prediction.place_id),
			);
			await addResults(matches);
		}
		if (allResults.length > 0) {
			return {
				success: true as const,
				results: allResults.slice(0, maxResults),
			};
		}
		return {
			success: false as const,
			error: `No valid Australian suburbs found for "${suburbInput}". Please try a different suburb name or check the spelling.`,
		};
	} catch (error) {
		console.error("baseSuburbLookup error:", error);
		return {
			success: false as const,
			error: "Failed to lookup suburbs - please try again",
		};
	}
}

export const lookupSuburb = action({
	args: {
		suburbInput: v.string(),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			canonicalSuburb: v.string(),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_PLACES_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		const result = await baseSuburbLookup(args.suburbInput, apiKey, {
			includeDetails: false,
			maxResults: 1,
		});
		if (result.success && result.results.length > 0) {
			return {
				success: true as const,
				canonicalSuburb: result.results[0].canonicalSuburb,
			};
		}
		if (!result.success) {
			return {
				success: false as const,
				error: result.error,
			};
		}
		// fallback: no results but success true (shouldn't happen)
		return {
			success: false as const,
			error: "No valid suburb found.",
		};
	},
});

export const lookupSuburbEnhanced = action({
	args: {
		suburbInput: v.string(),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			canonicalSuburb: v.string(),
			placeId: v.string(),
			geocode: v.object({
				lat: v.number(),
				lng: v.number(),
			}),
			types: v.array(v.string()),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_PLACES_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		const result = await baseSuburbLookup(args.suburbInput, apiKey, {
			includeDetails: true,
			maxResults: 1,
		});
		if (result.success && result.results.length > 0) {
			const r = result.results[0];
			return {
				success: true as const,
				canonicalSuburb: r.canonicalSuburb,
				placeId: r.placeId || "",
				geocode: r.geocode || { lat: 0, lng: 0 },
				types: r.types || [],
			};
		}
		if (!result.success) {
			return {
				success: false as const,
				error: result.error,
			};
		}
		// fallback: no results but success true (shouldn't happen)
		return {
			success: false as const,
			error: "No valid suburb found.",
		};
	},
});

export const lookupSuburbMultiple = action({
	args: {
		suburbInput: v.string(),
		maxResults: v.optional(v.number()),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			results: v.array(
				v.object({
					canonicalSuburb: v.string(),
					placeId: v.string(),
					geocode: v.object({
						lat: v.number(),
						lng: v.number(),
					}),
					types: v.array(v.string()),
				}),
			),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_PLACES_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		const result = await baseSuburbLookup(args.suburbInput, apiKey, {
			includeDetails: true,
			maxResults: args.maxResults || 5,
		});
		if (result.success) {
			return {
				success: true as const,
				results: result.results.map((r) => ({
					canonicalSuburb: r.canonicalSuburb,
					placeId: r.placeId || "",
					geocode: r.geocode || { lat: 0, lng: 0 },
					types: r.types || [],
				})),
			};
		}
		if (!result.success) {
			return {
				success: false as const,
				error: result.error,
			};
		}
		// fallback: no results but success true (shouldn't happen)
		return {
			success: false as const,
			error: "No valid suburbs found.",
		};
	},
});
// --- END: Base suburb lookup function and wrappers ---

// Add this interface after the existing interfaces
export interface AddressValidationResult {
	address: {
		formattedAddress: string;
		postalAddress: {
			addressLines: string[];
			locality?: string;
			administrativeArea?: string;
			postalCode?: string;
			regionCode: string;
		};
		addressComponents: Array<{
			componentName: {
				text: string;
				languageCode: string;
			};
			componentType: string;
			confirmationLevel:
				| "CONFIRMED"
				| "UNCONFIRMED_BUT_PLAUSIBLE"
				| "UNCONFIRMED_AND_SUSPICIOUS";
		}>;
	};
	geocode: {
		location: {
			latitude: number;
			longitude: number;
		};
		plusCode?: {
			globalCode: string;
			compoundCode?: string;
		};
		placeId: string;
	};
	verdict: {
		inputGranularity:
			| "PREMISE"
			| "SUB_PREMISE"
			| "ROUTE"
			| "LOCALITY"
			| "ADMINISTRATIVE_AREA"
			| "COUNTRY"
			| "OTHER";
		validationGranularity:
			| "PREMISE"
			| "SUB_PREMISE"
			| "ROUTE"
			| "LOCALITY"
			| "ADMINISTRATIVE_AREA"
			| "COUNTRY"
			| "OTHER";
		geocodeGranularity:
			| "PREMISE"
			| "SUB_PREMISE"
			| "ROUTE"
			| "LOCALITY"
			| "ADMINISTRATIVE_AREA"
			| "COUNTRY"
			| "OTHER";
		addressComplete: boolean;
		hasUnconfirmedComponents: boolean;
		hasInferredComponents: boolean;
		hasReplacedComponents: boolean;
	};
	uspsData?: {
		standardizedAddress: {
			firstAddressLine: string;
			cityStateZipAddressLine: string;
		};
		deliveryPointCode: string;
		deliveryPointCheckDigit: string;
		dpvConfirmation: "Y" | "N" | "S" | "D";
		dpvFootnote: string;
		cmra: "Y" | "N";
		vacant: "Y" | "N";
		pob: "Y" | "N";
	};
}

// Add this new action at the end of the file
export const validateAddress = action({
	args: {
		address: v.string(),
		enableUspsCass: v.optional(v.boolean()),
		regionCode: v.optional(v.string()),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			result: v.object({
				formattedAddress: v.string(),
				addressComponents: v.array(
					v.object({
						componentName: v.string(),
						componentType: v.string(),
						confirmationLevel: v.union(
							v.literal("CONFIRMED"),
							v.literal("UNCONFIRMED_BUT_PLAUSIBLE"),
							v.literal("UNCONFIRMED_AND_SUSPICIOUS"),
						),
					}),
				),
				geocode: v.object({
					latitude: v.number(),
					longitude: v.number(),
					placeId: v.string(),
					plusCode: v.optional(v.string()),
				}),
				verdict: v.object({
					addressComplete: v.boolean(),
					hasUnconfirmedComponents: v.boolean(),
					hasInferredComponents: v.boolean(),
					hasReplacedComponents: v.boolean(),
					validationGranularity: v.string(),
					geocodeGranularity: v.string(),
				}),
				uspsData: v.optional(
					v.object({
						standardizedAddress: v.string(),
						deliveryPointValidation: v.string(),
						vacant: v.optional(v.boolean()),
						commercialMailReceivingAgency: v.optional(v.boolean()),
					}),
				),
			}),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
			issues: v.optional(
				v.array(
					v.object({
						component: v.string(),
						issue: v.string(),
						severity: v.union(v.literal("ERROR"), v.literal("WARNING")),
					}),
				),
			),
		}),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_PLACES_API_KEY;

		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}

		try {
			const requestBody = {
				address: {
					regionCode: "AU",
					addressLines: [args.address],
				},
				enableUspsCass: false,
			};

			const response = await fetch(
				`https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(requestBody),
				},
			);

			if (!response.ok) {
				throw new Error(
					`Address validation API error: ${response.status} ${response.statusText}`,
				);
			}

			const data = await response.json();

			if (!data.result) {
				return {
					success: false as const,
					error: "No validation result returned from API",
				};
			}

			const result = data.result;

			// Process issues and warnings
			const issues = [];

			// Check for unconfirmed components
			if (result.address?.addressComponents) {
				for (const component of result.address.addressComponents) {
					if (component.confirmationLevel === "UNCONFIRMED_AND_SUSPICIOUS") {
						issues.push({
							component: component.componentType,
							issue: `Suspicious ${component.componentType}: ${component.componentName?.text}`,
							severity: "ERROR" as const,
						});
					} else if (
						component.confirmationLevel === "UNCONFIRMED_BUT_PLAUSIBLE"
					) {
						issues.push({
							component: component.componentType,
							issue: `Unconfirmed ${component.componentType}: ${component.componentName?.text}`,
							severity: "WARNING" as const,
						});
					}
				}
			}

			// Check verdict for issues
			if (!result.verdict?.addressComplete) {
				issues.push({
					component: "address",
					issue: "Address appears incomplete",
					severity: "ERROR" as const,
				});
			}

			if (result.verdict?.hasUnconfirmedComponents) {
				issues.push({
					component: "address",
					issue: "Address contains unconfirmed components",
					severity: "WARNING" as const,
				});
			}

			// Format the response
			const formattedResult = {
				formattedAddress: result.address?.formattedAddress || args.address,
				addressComponents:
					result.address?.addressComponents?.map(
						(comp: {
							componentName?: { text?: string };
							componentType?: string;
							confirmationLevel?:
								| "CONFIRMED"
								| "UNCONFIRMED_BUT_PLAUSIBLE"
								| "UNCONFIRMED_AND_SUSPICIOUS";
						}) => ({
							componentName: comp.componentName?.text || "",
							componentType: comp.componentType || "",
							confirmationLevel:
								comp.confirmationLevel || "UNCONFIRMED_BUT_PLAUSIBLE",
						}),
					) || [],
				geocode: {
					latitude: result.geocode?.location?.latitude || 0,
					longitude: result.geocode?.location?.longitude || 0,
					placeId: result.geocode?.placeId || "",
					plusCode: result.geocode?.plusCode?.globalCode,
				},
				verdict: {
					addressComplete: result.verdict?.addressComplete || false,
					hasUnconfirmedComponents:
						result.verdict?.hasUnconfirmedComponents || false,
					hasInferredComponents: result.verdict?.hasInferredComponents || false,
					hasReplacedComponents: result.verdict?.hasReplacedComponents || false,
					validationGranularity:
						result.verdict?.validationGranularity || "OTHER",
					geocodeGranularity: result.verdict?.geocodeGranularity || "OTHER",
				},
				uspsData: result.uspsData
					? {
							standardizedAddress:
								result.uspsData.standardizedAddress?.firstAddressLine || "",
							deliveryPointValidation: result.uspsData.dpvConfirmation || "N",
							vacant: result.uspsData.vacant === "Y",
							commercialMailReceivingAgency: result.uspsData.cmra === "Y",
						}
					: undefined,
			};

			return {
				success: true as const,
				result: formattedResult,
			};
		} catch (error) {
			console.error("Address validation error:", error);
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Address validation failed",
			};
		}
	},
});

// Helper function for Step 1: Address validation only (returns simple valid/invalid + formatted address)
async function validateAddressOnly(
	address: string,
	apiKey: string,
): Promise<{
	isValid: boolean;
	formattedAddress?: string;
	error?: string;
	placeId?: string;
}> {
	try {
		console.log(`[Address Validation Only] Validating: "${address}"`);

		const requestBody = {
			address: {
				regionCode: "AU",
				addressLines: [address],
			},
			enableUspsCass: false,
		};

		const response = await fetch(
			`https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			},
		);

		if (!response.ok) {
			return {
				isValid: false,
				error: `Address Validation API error: ${response.status}`,
			};
		}

		const data = await response.json();

		if (!data.result || !data.result.address) {
			return {
				isValid: false,
				error: "Address not found or invalid",
			};
		}

		const result = data.result;
		const verdict = result.verdict || {};

		// Strict validation criteria
		const addressComplete = verdict.addressComplete || false;
		const hasUnconfirmedComponents = verdict.hasUnconfirmedComponents || false;
		const validationGranularity = verdict.validationGranularity || "";

		console.log("[Address Validation Only] Verdict:", {
			addressComplete,
			hasUnconfirmedComponents,
			validationGranularity,
		});

		// 🎯 SMART VALIDATION: Balance between too strict and too lenient
		// 1. Reject clearly invalid addresses
		const unacceptableGranularities = [
			"COUNTRY",
			"ADMINISTRATIVE_AREA",
			"OTHER",
		];
		if (unacceptableGranularities.includes(validationGranularity)) {
			return {
				isValid: false,
				error: `Address validation granularity too low: ${validationGranularity} (address is too general)`,
			};
		}

		// 2. Smart premise-level validation for street addresses
		// For addresses with house numbers, we need higher confidence
		const hasHouseNumber = /^\d+/.test(address.trim());

		if (hasHouseNumber) {
			// If it has a house number, we need at least ROUTE level + good components
			if (validationGranularity === "LOCALITY") {
				return {
					isValid: false,
					error:
						"House number provided but address only validated to suburb level",
				};
			}

			// 🎯 AGGRESSIVE: For house numbers, require exact PREMISE level validation
			// PREMISE_PROXIMITY means Google is guessing the house number location - reject it!
			if (
				validationGranularity !== "PREMISE" &&
				validationGranularity !== "SUB_PREMISE"
			) {
				console.log(
					`[Address Validation Only] 🚨 REJECTING ADDRESS: "${address}" - House number provided but validation granularity is ${validationGranularity} (not exact premise level)`,
				);
				return {
					isValid: false,
					error: `House number validation insufficient - only validated to ${validationGranularity} level (house number location is estimated, not confirmed)`,
				};
			}

			// Check for suspicious components in numbered addresses
			if (hasUnconfirmedComponents) {
				console.log(
					`[Address Validation Only] 🚨 REJECTING ADDRESS: "${address}" - House number provided but validation granularity is ${validationGranularity} (not exact premise level)`,
				);
				return {
					isValid: false,
					error: `House number validation insufficient - only validated to ${validationGranularity} level (house number location is estimated, not confirmed)`,
				};
			}
		}

		return {
			isValid: addressComplete,
			formattedAddress: result.address?.formattedAddress || address,
			placeId: result.geocode?.placeId || "",
		};
	} catch (error) {
		console.error("Address validation error:", error);
		return {
			isValid: false,
			error:
				error instanceof Error ? error.message : "Address validation failed",
		};
	}
}
