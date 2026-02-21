import type { LocationIntent, Suggestion } from "~/stores/types";

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

import { STREET_KEYWORDS } from "@shared/constants/addressTypes";

// Re-export the canonical implementation
export { classifyLocationIntent as classifyIntent } from "@shared/utils/intentClassification";

// Re-export for backward compatibility (to be removed after migration)
export const streetKeywords = STREET_KEYWORDS;

export async function fetchLatLngForPlaceId(
	placeId: string,
	apiKey: string,
): Promise<{ lat: number; lng: number } | null> {
	const res = await fetch(
		`https://places.googleapis.com/v1/places/${placeId}`,
		{
			headers: {
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask": "location",
			},
		},
	);
	if (!res.ok) return null;
	const data = await res.json();
	if (data.location) {
		return {
			lat: data.location.latitude,
			lng: data.location.longitude,
		};
	}
	return null;
}
