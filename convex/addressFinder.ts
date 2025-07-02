"use node";
import { randomUUID } from "node:crypto";
import { v } from "convex/values";
import { action } from "./_generated/server";

// --- Interfaces for API responses and our internal types ---

interface GooglePlacesPrediction {
	description: string;
	place_id: string;
	types: string[];
}

interface GooglePlacesResponse {
	status: string;
	predictions?: GooglePlacesPrediction[];
}

interface AddressMatch {
	description: string;
	placeId: string;
}

// --- Helper Functions from autocomplete.ts ---

// Helper function to detect if input looks like a full address with house number
function looksLikeFullAddress(input: string): boolean {
	return /^\d+\s/.test(input.trim());
}

// Helper function to validate full residential address using Google Address Validation API
async function validateFullAddress(
	input: string,
	apiKey: string,
): Promise<AddressMatch[]> {
	const validationUrl = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`;
	const requestBody = {
		address: {
			regionCode: "AU", // Hardcoded to Australia
			addressLines: [input],
		},
		enableUspsCass: false,
	};

	const response = await fetch(validationUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});

	const data = await response.json();

	const verdict = data.result?.verdict;
	const address = data.result?.address;

	// For a result to be considered valid and high-confidence, we require:
	// 1. A complete address verdict from Google.
	// 2. The address not to have unconfirmed components (unless it's a very precise result).
	// 3. The validation granularity must be at the 'PREMISE' (building) or 'SUB_PREMISE' (apartment) level.
	const isConfidentResult =
		verdict?.addressComplete &&
		!verdict?.hasUnconfirmedComponents &&
		(verdict?.validationGranularity === "PREMISE" ||
			verdict?.validationGranularity === "SUB_PREMISE");

	if (isConfidentResult && address?.formattedAddress) {
		return [
			{
				description: address.formattedAddress,
				placeId: data.result.geocode?.placeId || "",
			},
		];
	}

	return [];
}

// --- Main Action ---

export const search = action({
	args: { query: v.string() },
	returns: v.object({
		success: v.boolean(),
		suggestions: v.optional(
			v.array(
				v.object({
					description: v.string(),
					placeId: v.string(),
				}),
			),
		),
		error: v.optional(v.string()),
	}),
	handler: async (_, { query }) => {
		const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
		if (!PLACES_API_KEY) {
			throw new Error("GOOGLE_PLACES_API_KEY environment variable not set!");
		}
		if (!query || query.trim().length < 3) {
			// Require a minimum query length
			return { success: true, suggestions: [] };
		}

		try {
			// If it looks like a full address, try the high-precision validation API first.
			if (looksLikeFullAddress(query)) {
				const validatedSuggestions = await validateFullAddress(
					query,
					PLACES_API_KEY,
				);
				if (validatedSuggestions.length > 0) {
					console.log(
						`[addressFinder.search] Found high-confidence match via Address Validation API for: "${query}"`,
					);
					return { success: true, suggestions: validatedSuggestions };
				}
			}

			// Fallback to Places Autocomplete API for partial addresses or if validation fails.
			const sessionToken = randomUUID();
			const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
				query,
			)}&key=${PLACES_API_KEY}&sessiontoken=${sessionToken}&types=address&components=country:AU`; // Strictly biased to AU

			const response = await fetch(autocompleteUrl);
			const data = await response.json();

			if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
				throw new Error(
					`Google Places API Error: ${data.status} - ${data.error_message || ""}`,
				);
			}

			const suggestions = (data.predictions || [])
				// Final, ROBUST sanity check to ensure all results are from Australia.
				.filter((p: GooglePlacesPrediction) => {
					const description = p.description.toLowerCase();
					return (
						description.includes("australia") ||
						/\b(vic|nsw|qld|wa|sa|tas|nt|act)\b/i.test(description)
					);
				})
				.map((p: GooglePlacesPrediction) => ({
					description: p.description,
					placeId: p.place_id,
				}));

			return { success: true, suggestions };
		} catch (error) {
			console.error("Failed to fetch from Google APIs:", error);
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return { success: false, error: `API call failed: ${errorMessage}` };
		}
	},
});
