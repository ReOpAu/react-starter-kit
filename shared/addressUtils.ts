import type { LocationIntent } from "./types/location";

// Define the structure of a suggestion as it's stored in the client
export interface Suggestion {
	description: string;
	placeId: string;
	// New fields to support rich suggestion UI
	resultType?: LocationIntent;
	suburb?: string;
	types?: string[];
	// Optional validated coordinates
	lat?: number;
	lng?: number;
	// Confidence score (0-1) from backend
	confidence?: number;
	structuredFormatting?: {
		mainText?: string;
		// ...other fields as needed
	};
}

export interface HistoryItem {
	type: "user" | "agent" | "system";
	text: string;
	timestamp?: number;
}

export type Mode = "manual" | "voice" | "agent";

// Re-export the canonical implementation
export { classifyIntent } from "./utils/intentClassification";

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
		/^(unit\\s+|apt\\s+|apartment\\s+|shop\\s+|suite\\s+)?\\d+[a-z]?([/-]\\d+[a-z]?(-\\d+[a-z]?)?)?\\s+/i.test(
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
