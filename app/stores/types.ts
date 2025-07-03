// Unified Intelligent Address System
export type LocationIntent = "suburb" | "street" | "address" | "general" | null;

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
}

export interface HistoryItem {
	type: "user" | "agent" | "system";
	text: string;
	timestamp?: number;
}
