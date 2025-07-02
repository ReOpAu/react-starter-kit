"use node";

import { randomUUID } from "node:crypto";
import { v } from "convex/values";
import { action } from "./_generated/server";

interface GooglePlacesPrediction {
	description: string;
	place_id: string;
	types: string[];
	matched_substrings?: Array<{ offset: number; length: number }>;
}

interface GooglePlacesResponse {
	status: string;
	predictions?: GooglePlacesPrediction[];
}

interface GoogleTextSearchResult {
	formatted_address: string;
	place_id: string;
	types: string[];
	geometry?: {
		location: {
			lat: number;
			lng: number;
		};
	};
}

interface GoogleTextSearchResponse {
	status: string;
	results?: GoogleTextSearchResult[];
}

interface AddressMatch {
	address: string;
	confidence: number;
	matchType: string;
	placeId: string;
	addressType: string;
	googleRank: number;
	sessionToken?: string;
}

// Debug logging helper
function debugLog(message: any, ...optionalParams: any[]) {
	if (process.env.ADDRESS_AUTOCOMPLETE_DEBUG === "true") {
		if (optionalParams[0] === "error") {
			console.error(message, ...optionalParams.slice(1));
		} else {
			console.log(message, ...optionalParams);
		}
	}
}

// Helper function to sanitize and validate user input for address queries
function sanitizeAddressInput(input: string): string {
	// Allow only alphanumeric, spaces, comma, period, hyphen, apostrophe, and remove other characters
	const cleaned = input.replace(/[^a-zA-Z0-9\s,.'\-]/g, "");
	// Collapse multiple spaces
	const normalized = cleaned.replace(/\s+/g, " ").trim();
	// Check for minimum length and at least one letter
	if (normalized.length < 2 || !/[a-zA-Z]/.test(normalized)) {
		throw new Error(
			"Invalid input: address must contain at least two characters and a letter.",
		);
	}
	return normalized;
}

// Helper function to generate session token (UUID v4)
function generateSessionToken(): string {
	return randomUUID();
}

// Helper function to validate full residential address using Google Address Validation API
async function validateFullAddress(
	input: string,
	apiKey: string,
): Promise<AddressMatch[]> {
	debugLog(`[Address Validation] Validating full address: "${input}"`);

	try {
		const validationUrl = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;

		const requestBody = {
			address: {
				addressLines: [input],
				regionCode: "AU", // Australia
			},
			enableUspsCass: false, // Not needed for Australia
		};

		const response = await fetch(validationUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		const data = await response.json();
		debugLog(
			"[Address Validation] Google API Response:",
			JSON.stringify(data, null, 2),
		);

		if (!data.result) {
			debugLog("[Address Validation] No result returned from API");
			return [];
		}

		if (!data.result.address) {
			debugLog(
				"[Address Validation] No address in result, likely invalid input",
			);
			return [];
		}

		const result = data.result;
		const validatedAddress = result.address;

		// Extract the formatted address
		const formattedAddress = validatedAddress.formattedAddress;

		// Get validation verdict for strict validation
		const verdict = result.verdict || {};
		const addressComplete = verdict.addressComplete || false;
		const hasUnconfirmedComponents = verdict.hasUnconfirmedComponents || false;
		const hasInferredComponents = verdict.hasInferredComponents || false;
		const inputGranularity = verdict.inputGranularity || "";
		const validationGranularity = verdict.validationGranularity || "";
		const geocodeGranularity = verdict.geocodeGranularity || "";

		debugLog("[Address Validation] Verdict details:", {
			addressComplete,
			hasUnconfirmedComponents,
			hasInferredComponents,
			inputGranularity,
			validationGranularity,
			geocodeGranularity,
		});

		// Strict validation: reject addresses that are likely invalid
		// 1. Must have complete address information
		if (!addressComplete) {
			debugLog("[Address Validation] Rejecting: Address is not complete");
			return [];
		}

		// 2. Should not have unconfirmed components (Google couldn't verify parts)
		if (hasUnconfirmedComponents) {
			debugLog("[Address Validation] Rejecting: Has unconfirmed components");
			return [];
		}

		// 3. Check for excessive inference (Google had to guess too much)
		if (hasInferredComponents) {
			debugLog(
				"[Address Validation] Warning: Has inferred components, checking granularity...",
			);

			// If Google had to infer components AND the validation granularity is lower than premise level,
			// it's likely the address doesn't exist
			const lowGranularityLevels = [
				"LOCALITY",
				"ADMINISTRATIVE_AREA",
				"COUNTRY",
			];
			if (
				lowGranularityLevels.includes(validationGranularity) ||
				lowGranularityLevels.includes(geocodeGranularity)
			) {
				debugLog(
					"[Address Validation] Rejecting: Low granularity with inferred components suggests invalid address",
				);
				return [];
			}
		}

		// 4. Ensure we have premise-level granularity for house numbers
		const acceptableGranularities = ["PREMISE", "SUB_PREMISE"];
		if (!acceptableGranularities.includes(validationGranularity)) {
			debugLog(
				"[Address Validation] Rejecting: Validation granularity too low:",
				validationGranularity,
			);
			return [];
		}

		// Calculate confidence based on validation quality
		let confidence = 0.95; // Start very high for strict validation
		if (hasInferredComponents) confidence -= 0.1;
		if (validationGranularity !== "PREMISE") confidence -= 0.05;

		// Get place ID if available (from geocode)
		let placeId = "";
		if (result.geocode?.placeId) {
			placeId = result.geocode.placeId;
		}

		const match: AddressMatch = {
			address: formattedAddress,
			confidence: confidence,
			matchType: "address_validation",
			placeId: placeId,
			addressType: "validated_address",
			googleRank: 0,
		};

		debugLog("[Address Validation] Validated address:", match);
		return [match];
	} catch (error) {
		debugLog("[Address Validation] Error:", "error", error);
		return [];
	}
}

// Helper function to search using Google Places Text Search API
async function searchFullAddress(
	input: string,
	apiKey: string,
	sessionToken?: string,
): Promise<AddressMatch[]> {
	// Sanitize and validate input before using in URL (enforced by project security/architecture rules)
	let safeInput: string;
	try {
		safeInput = sanitizeAddressInput(input);
	} catch (e) {
		debugLog("[Address Text Search] Input sanitization failed:", "error", e);
		return [];
	}
	debugLog(`[Address Text Search] Searching for full address: "${safeInput}"`);

	try {
		// For Text Search, we don't use session tokens as they're primarily for Autocomplete + Place Details workflows
		const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
			`${safeInput} Australia`,
		)}&type=street_address&key=${apiKey}`;

		const response = await fetch(textSearchUrl);
		const data = (await response.json()) as GoogleTextSearchResponse;

		debugLog(
			"[Address Text Search] Google API Response:",
			JSON.stringify(data, null, 2),
		);

		if (data.status !== "OK" || !data.results || data.results.length === 0) {
			debugLog(`[Address Text Search] No results: ${data.status}`);
			return [];
		}

		// Process text search results
		const matches = data.results
			.filter((result: GoogleTextSearchResult) => {
				// Must be a street address type
				const isStreetAddress =
					result.types.includes("street_address") ||
					result.types.includes("premise") ||
					result.types.includes("subpremise");

				// Must be in Australia
				const isInAustralia =
					result.formatted_address.toLowerCase().includes("australia") ||
					/\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(result.formatted_address);

				// Exclude businesses
				const isBusiness = result.types.some((type) =>
					[
						"store",
						"food",
						"restaurant",
						"gas_station",
						"shopping_mall",
						"hospital",
						"school",
						"university",
						"bank",
						"pharmacy",
					].includes(type),
				);

				return isStreetAddress && isInAustralia && !isBusiness;
			})
			.slice(0, 3) // Limit to top 3 results
			.map((result: GoogleTextSearchResult, index: number): AddressMatch => {
				return {
					address: result.formatted_address,
					confidence: 0.9 - index * 0.1, // High confidence, decreasing by rank
					matchType: "text_search",
					placeId: result.place_id,
					addressType: "full_address",
					googleRank: index,
					sessionToken, // Include session token for consistency
				};
			});

		debugLog(
			`[Address Text Search] Found ${matches.length} addresses:`,
			matches,
		);
		return matches;
	} catch (error) {
		debugLog("[Address Text Search] Error:", "error", error);
		return [];
	}
}

export const autocompleteAddresses = action({
	args: {
		partialInput: v.string(),
		maxResults: v.optional(v.number()),
		sessionToken: v.string(),
		location: v.optional(
			v.object({
				lat: v.number(),
				lng: v.number(),
			}),
		),
		radius: v.optional(v.number()),
	},
	handler: async (
		ctx,
		{ partialInput, maxResults = 8, sessionToken, location, radius },
	) => {
		try {
			// Get Google Places API key from environment
			const apiKey = process.env.GOOGLE_PLACES_API_KEY;
			if (!apiKey || apiKey.trim() === "") {
				throw new Error("Google Places API key not configured");
			}
			if (!apiKey) {
				throw new Error("Google Places API key not configured");
			}

			// Sanitize and validate input before using in URL (enforced by project security/architecture rules)
			let safeInput: string;
			try {
				safeInput = sanitizeAddressInput(partialInput);
			} catch (e) {
				debugLog("[Autocomplete] Input sanitization failed:", "error", e);
				throw new Error(
					"Invalid input: address must contain at least two characters and a letter.",
				);
			}

			// Build the request URL
			const baseUrl =
				"https://maps.googleapis.com/maps/api/place/autocomplete/json";
			const params = new URLSearchParams({
				input: safeInput,
				key: apiKey,
				sessiontoken: sessionToken,
				types: "address",
				components: "country:au", // Restrict to Australia
			});

			// Add location bias if provided
			if (location && radius) {
				params.append("location", `${location.lat},${location.lng}`);
				params.append("radius", radius.toString());
			}

			const url = `${baseUrl}?${params.toString()}`;

			// Make the API request
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(
					`Google Places API error: ${response.status} ${response.statusText}`,
				);
			}

			const data = await response.json();

			if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
				debugLog("Google Places API error:", "error", data);
				throw new Error(
					`Google Places API error: ${data.status} - ${data.error_message || "Unknown error"}`,
				);
			}

			// Transform the results to match our interface
			const suggestions = (data.predictions || [])
				.slice(0, maxResults)
				.map((prediction: any) => ({
					address: prediction.description,
					confidence: 1.0, // Google doesn't provide confidence scores for autocomplete
					matchType: "autocomplete",
					placeId: prediction.place_id,
					addressType: prediction.types?.[0] || "unknown",
					sessionToken,
				}));

			return suggestions;
		} catch (error) {
			debugLog("Address autocomplete error:", "error", error);
			throw new Error(
				`Failed to get address suggestions: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	},
});

// Legacy function name - now returns addresses instead of just suburbs
export const autocompleteSuburbs = autocompleteAddresses;
