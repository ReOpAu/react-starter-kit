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

// Update mode type to include 'agent'
export type Mode = 'manual' | 'voice' | 'agent';

// Update any interfaces that use mode
export interface ActiveSearch {
	query: string;
	source: Mode;
}
