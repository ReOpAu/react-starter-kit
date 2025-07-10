/**
 * Shared Google API endpoints and configuration for Convex backend
 * Consolidated from multiple files to ensure consistency
 */

// Google Places API base URLs
export const GOOGLE_API_ENDPOINTS = {
	// Places Autocomplete API
	PLACES_AUTOCOMPLETE: "https://maps.googleapis.com/maps/api/place/autocomplete/json",
	
	// Places Details API  
	PLACES_DETAILS: "https://maps.googleapis.com/maps/api/place/details/json",
	
	// Places Text Search API
	PLACES_TEXT_SEARCH: "https://maps.googleapis.com/maps/api/place/textsearch/json",
	
	// Address Validation API
	ADDRESS_VALIDATION: "https://addressvalidation.googleapis.com/v1:validateAddress",
} as const;

// Common query parameters for Google Places API
export const PLACES_API_DEFAULTS = {
	// Country restriction for Australian addresses
	COMPONENTS: "country:au",
	
	// Default fields for place details
	DETAILS_FIELDS: "geometry,types,formatted_address,address_components",
	
	// Place types for different intents
	TYPES: {
		SUBURB: "(regions)",
		STREET: "geocode", 
		ADDRESS: "address",
		GEOCODE: "geocode",
	},
} as const;

// Helper functions to build API URLs
export function buildPlacesAutocompleteUrl(
	query: string,
	apiKey: string,
	options: {
		types?: string;
		location?: { lat: number; lng: number };
		radius?: number;
		sessionToken?: string;
	} = {}
): string {
	const baseUrl = GOOGLE_API_ENDPOINTS.PLACES_AUTOCOMPLETE;
	const params = new URLSearchParams({
		input: query,
		key: apiKey,
		components: PLACES_API_DEFAULTS.COMPONENTS,
	});
	
	if (options.types) {
		params.set("types", options.types);
	}
	
	if (options.location) {
		params.set("location", `${options.location.lat},${options.location.lng}`);
		if (options.radius) {
			params.set("radius", options.radius.toString());
		}
	}
	
	if (options.sessionToken) {
		params.set("sessiontoken", options.sessionToken);
	}
	
	return `${baseUrl}?${params.toString()}`;
}

export function buildPlaceDetailsUrl(
	placeId: string,
	apiKey: string,
	fields: string = PLACES_API_DEFAULTS.DETAILS_FIELDS
): string {
	const baseUrl = GOOGLE_API_ENDPOINTS.PLACES_DETAILS;
	const params = new URLSearchParams({
		place_id: placeId,
		fields,
		key: apiKey,
	});
	
	return `${baseUrl}?${params.toString()}`;
}

export function buildAddressValidationUrl(apiKey: string): string {
	return `${GOOGLE_API_ENDPOINTS.ADDRESS_VALIDATION}?key=${apiKey}`;
}