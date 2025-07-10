import type { Suggestion } from "~/stores/addressFinderStore";
import type { LocationIntent } from "~/stores/types";

/**
 * Helper function to classify intent based on what user actually selected
 */
export const classifySelectedResult = (
	suggestion: Suggestion,
): LocationIntent => {
	const types = suggestion.types || [];
	const description = suggestion.description;

	// Check for full addresses
	if (
		types.includes("street_address") ||
		types.includes("premise") ||
		/^(unit\s+|apt\s+|apartment\s+|shop\s+|suite\s+)?\d+[a-z]?([/-]\d+[a-z]?(-\d+[a-z]?)?)?\s+/i.test(
			description.trim(),
		)
	) {
		return "address";
	}

	// Check for streets
	if (types.includes("route")) {
		return "street";
	}

	// Check for suburbs/localities
	if (types.includes("locality") || types.includes("sublocality")) {
		return "suburb";
	}

	// Default fallback
	return "general";
};

/**
 * Helper function to de-duplicate suggestions by placeId with source priority
 */
export const deduplicateSuggestions = <
	T extends Suggestion & { source: string },
>(
	suggestions: T[],
): T[] => {
	// Define source priority: agentCache > unified > ai > autocomplete
	const sourcePriority = {
		agentCache: 4,
		unified: 3,
		ai: 2,
		autocomplete: 1,
	};

	return suggestions.reduce((acc, current) => {
		const existingIndex = acc.findIndex(
			(item) => item.placeId === current.placeId,
		);

		if (existingIndex === -1) {
			// No duplicate found, add the suggestion
			acc.push(current);
		} else {
			// Duplicate found, keep the one with higher priority source
			const currentPriority =
				sourcePriority[current.source as keyof typeof sourcePriority] || 0;
			const existingPriority =
				sourcePriority[
					acc[existingIndex].source as keyof typeof sourcePriority
				] || 0;

			if (currentPriority > existingPriority) {
				acc[existingIndex] = current;
			}
		}

		return acc;
	}, [] as T[]);
};

/**
 * Returns a Tailwind CSS class string for styling based on location intent.
 */
export const getIntentColor = (intent: LocationIntent): string => {
	switch (intent) {
		case "suburb":
			return "bg-blue-100 text-blue-800";
		case "street":
			return "bg-green-100 text-green-800";
		case "address":
			return "bg-purple-100 text-purple-800";
		default:
			return "bg-gray-100 border-gray-200 text-gray-700";
	}
};

// Street indicators - comprehensive Australian street types
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
	"highway",
	"hwy",
	"parkway",
	"pkwy",
	"reserve",
	"res",
	"rise",
	"ridge",
	"retreat",
	"gardens",
	"gdns",
	"green",
	"grn",
	"heights",
	"hts",
	"hill",
	"outlook",
	"vista",
	"promenade",
	"prom",
	"strand",
	"quay",
	"wharf",
	"pier",
	"mall",
	"plaza",
	"link",
	"loop",
	"bend",
	"corner",
	"crossing",
	"cir",
	"circle",
];

// Pre-compile regex patterns for street keywords (word boundaries)
const streetKeywordRegexes = streetKeywords.map(
	(keyword) => new RegExp(`\\b${keyword}\\b`, "i"),
);

// Rural indicators
const ruralKeywords = [
	"hwy",
	"highway",
	"rd",
	"road",
	"lane",
	"track",
	"station",
	"farm",
	"mount",
	"creek",
	"way",
	"drive",
	"dr",
	"ln",
	"springmount",
];
const ruralKeywordRegexes = ruralKeywords.map(
	(keyword) => new RegExp(`\\b${keyword}\\b`, "i"),
);

export function classifyIntent(query: string): LocationIntent {
	const lowerQuery = query.toLowerCase().trim();

	// IMMEDIATE ADDRESS RECOGNITION - Recognize obvious address patterns first
	// Enhanced house number patterns - covers more Australian formats
	const hasHouseNumber = /^(\d+[a-z]?([/-]\d+[a-z]?)*)\s+/.test(lowerQuery);

	// Enhanced unit/apartment patterns - covers more variations
	const hasUnitNumber =
		/^(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*[,\s]/i.test(lowerQuery) ||
		/^[a-z]?\d+([/-]\d+[a-z]?)*[,/]\s*\d+\s+/.test(lowerQuery);

	// IMMEDIATE ADDRESS RECOGNITION - Number first = likely address
	// This handles cases like "18 s", "123 g", "5 c", "18 melbourne" 
	if (hasHouseNumber || hasUnitNumber) {
		return "address";
	}

	// Special handling for common Australian place names that contain street-like words
	const specialCases = [
		/^st\s+kilda/i,           // St Kilda (suburb)
		/^(mount|mt)\s+/i,        // Mount suburbs (Mt Eliza, Mt Waverley, Mount Eliza)
		/^port\s+/i,              // Port suburbs (Port Melbourne)
		/^glen\s+/i,              // Glen suburbs (Glen Waverley)
		/^box\s+hill/i,           // Box Hill
		/^st\s+albans/i,          // St Albans
		/^point\s+/i,             // Point suburbs
	];

	const isSpecialSuburb = specialCases.some(pattern => pattern.test(lowerQuery));

	// Handle special suburb cases BEFORE street type detection to prevent misclassification
	if (isSpecialSuburb) {
		// For special suburbs, only consider it a street/address if it has additional street indicators
		// beyond the special suburb name itself
		
		// Special handling for complete suburb names that contain street-like words
		// These are complete suburb names, not prefix + suburb patterns
		const completeSuburbNames = [
			/^box\s+hill$/i,           // Box Hill is a complete suburb name
		];
		
		const isCompleteSuburbName = completeSuburbNames.some(pattern => pattern.test(lowerQuery));
		
		// For complete suburb names, don't check for additional street types
		// They are definitively suburbs, not streets
		if (isCompleteSuburbName) {
			return "suburb";
		}
		
		// For prefix-based special suburbs (St Kilda, Mt Waverley, etc.)
		// Remove the prefix to check if there are additional street indicators
		const withoutSpecialPrefix = lowerQuery.replace(/^(st|mt|mount|port|glen|point)\s+/i, "");
		
		const hasAdditionalStreetType = streetKeywordRegexes.some((regex) =>
			regex.test(withoutSpecialPrefix),
		);
		
		// Check if it's a street in a special suburb (e.g., "St Kilda Road")
		if (hasAdditionalStreetType && !hasHouseNumber && !hasUnitNumber) {
			return "street";
		}
		// Check if it's an address in special suburb (e.g., "123 St Kilda Road")
		if ((hasHouseNumber || hasUnitNumber) && hasAdditionalStreetType) {
			return "address";
		}
		// Otherwise it's just the suburb name
		return "suburb";
	}

	// Check if query has street type indicator
	const hasStreetType = streetKeywordRegexes.some((regex) =>
		regex.test(lowerQuery),
	);

	// Rural address pattern: house number + rural keyword
	const hasRuralType = ruralKeywordRegexes.some((regex) =>
		regex.test(lowerQuery),
	);
	
	// Note: The (hasHouseNumber || hasUnitNumber) && (hasStreetType || hasRuralType) check
	// is now handled by the immediate address recognition above

	// Street name pattern (street type but no house number at start)
	if (hasStreetType && !hasHouseNumber && !hasUnitNumber) {
		return "street";
	}

	// Enhanced unit/apartment patterns anywhere in the query (fallback)
	if (
		/\b(unit|apt|apartment|suite|shop|level|floor|lot|u|g|l|b)\s*\d+[a-z]?([/-]\d+[a-z]?)*\b/i.test(lowerQuery) ||
		/\b\d+[a-z]?[/]\d+\s+/.test(lowerQuery)
	) {
		return "address";
	}

	// Check for postcode patterns (4 digits) - these are usually suburbs
	const hasPostcode = /\b\d{4}\b/.test(lowerQuery);

	// Enhanced Australian state abbreviations and full names
	const hasAustralianState =
		/\b(vic|nsw|qld|wa|sa|tas|nt|act|australia|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(
			lowerQuery,
		);

	// Common Australian suburb patterns
	const hasSuburbIndicators = 
		/\b(north|south|east|west|upper|lower|mount|mt|saint|st|port|glen|box|point|new|old)\s+[a-z]/i.test(lowerQuery) ||
		/\b(heights|gardens|valley|beach|park|creek|hill|ridge|bay|cove|grove|lakes|springs|falls)\b/i.test(lowerQuery);


	// If it has postcode, state, or suburb indicators but no street indicators, likely a suburb
	if ((hasPostcode || hasAustralianState || hasSuburbIndicators) && !hasStreetType && !hasRuralType) {
		return "suburb";
	}

	// Enhanced simple text pattern - allows for apostrophes, hyphens, and numbers in suburb names
	const isSuburbLikeText = /^[a-z0-9\s\-'&]+$/i.test(lowerQuery) && !/^\d+$/.test(lowerQuery);

	// If it's just suburb-like text without street indicators, assume suburb
	if (isSuburbLikeText && !hasStreetType && !hasRuralType && lowerQuery.length > 2) {
		return "suburb";
	}

	return "general";
}

export async function fetchLatLngForPlaceId(
	placeId: string,
	apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
	const res = await fetch(
		`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`,
	);
	const data = await res.json();
	if (data.result?.geometry?.location) {
		return {
			lat: data.result.geometry.location.lat,
			lng: data.result.geometry.location.lng,
		};
	}
	return null;
}
