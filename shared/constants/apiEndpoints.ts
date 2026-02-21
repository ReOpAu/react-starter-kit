/**
 * Shared Google API endpoints and configuration for Convex backend
 * Uses Places API (New) — https://places.googleapis.com/v1/
 */

// Google API base URLs
export const GOOGLE_API_ENDPOINTS = {
	// Places Autocomplete API (New) — POST endpoint
	PLACES_AUTOCOMPLETE:
		"https://places.googleapis.com/v1/places:autocomplete",

	// Places Details API (New) — GET with resource name
	PLACES_DETAILS: "https://places.googleapis.com/v1/places",

	// Places Text Search API (New) — POST endpoint
	PLACES_TEXT_SEARCH:
		"https://places.googleapis.com/v1/places:searchText",

	// Address Validation API (unchanged)
	ADDRESS_VALIDATION:
		"https://addressvalidation.googleapis.com/v1:validateAddress",
} as const;

// Common configuration for Places API (New)
export const PLACES_API_DEFAULTS = {
	// Region restriction for Australian addresses
	INCLUDED_REGION_CODES: ["au"],

	// Field mask for place details requests
	DETAILS_FIELD_MASK:
		"id,formattedAddress,location,addressComponents,types,displayName",

	// Field mask for geometry-only requests
	GEOMETRY_FIELD_MASK: "location",
} as const;

// Helper to build a place details URL for Places API (New)
export function buildPlaceDetailsUrl(placeId: string): string {
	return `${GOOGLE_API_ENDPOINTS.PLACES_DETAILS}/${placeId}`;
}

// Helper to build headers for Places API (New) requests
export function buildPlacesHeaders(
	apiKey: string,
	fieldMask?: string,
): Record<string, string> {
	const headers: Record<string, string> = {
		"X-Goog-Api-Key": apiKey,
	};
	if (fieldMask) {
		headers["X-Goog-FieldMask"] = fieldMask;
	}
	return headers;
}

export function buildAddressValidationUrl(apiKey: string): string {
	return `${GOOGLE_API_ENDPOINTS.ADDRESS_VALIDATION}?key=${apiKey}`;
}
