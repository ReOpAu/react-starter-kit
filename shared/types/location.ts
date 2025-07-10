/**
 * Shared location and address types
 * Consolidated from multiple files to ensure consistency
 */

// Core location intent classification
export type LocationIntent = "suburb" | "street" | "address" | "general";

// Nullable variant for UI states that can be unset
export type LocationIntentNullable = LocationIntent | null;

// Mode types for address finder
export type Mode = "manual" | "voice" | "agent";

// Common suggestion interface
export interface Suggestion {
	description: string;
	placeId: string;
	// New fields to support rich suggestion UI
	resultType?: LocationIntent;
	suburb?: string;
	postcode?: string;
	types?: string[];
	// Optional validated coordinates
	lat?: number;
	lng?: number;
	// Confidence score (0-1) from backend
	confidence?: number;
	// Display text for auto-selected results (uses description by default)
	displayText?: string;
	structuredFormatting?: {
		mainText?: string;
		secondaryText?: string;
		// ...other fields as needed
	};
}

// History item for conversation tracking
export interface HistoryItem {
	type: "user" | "agent" | "system";
	text: string;
	timestamp?: number;
}

// Search tracking
export interface ActiveSearch {
	query: string;
	source: Mode;
}

// Utility functions for intent classification
export function getIntentColor(intent: LocationIntent): string {
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
}

export function classifySelectedResult(suggestion: Suggestion): LocationIntent {
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
}