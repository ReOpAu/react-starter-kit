/**
 * Shared location and address types for Convex backend
 * Consolidated from multiple files to ensure consistency
 */

// Core location intent classification
export type LocationIntent = "suburb" | "street" | "address" | "general";

// Common place suggestion interface for backend
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
	suburb?: string; // Extracted suburb/town from Places API
}
