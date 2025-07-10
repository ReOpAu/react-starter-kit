import { v } from "convex/values";
import { action } from "../_generated/server";

// Constants for Google Places API
const GOOGLE_PLACES_FIELDS =
	"address_components,formatted_address,geometry,name,place_id,types";

// TypeScript interfaces for Google Places API response
interface AddressComponent {
	long_name: string;
	short_name: string;
	types: string[];
}

interface PlaceGeometry {
	location: {
		lat: number;
		lng: number;
	};
}

interface GooglePlaceResult {
	address_components?: AddressComponent[];
	formatted_address?: string;
	geometry?: PlaceGeometry;
	name?: string;
	place_id: string;
	types?: string[];
}

interface GooglePlacesResponse {
	result?: GooglePlaceResult;
	status: string;
	error_message?: string;
}

// Helper function to extract specific address components from the Google Places response
const extractComponent = (
	components: AddressComponent[],
	type: string,
): string | undefined => {
	const component = components.find((c) => c.types.includes(type));
	return component?.long_name;
};

export const getPlaceDetails = action({
	args: { placeId: v.string() },
	returns: v.union(
		v.object({
			success: v.literal(true),
			details: v.object({
				placeId: v.string(),
				formattedAddress: v.string(),
				lat: v.number(),
				lng: v.number(),
				types: v.array(v.string()),
				postcode: v.optional(v.string()),
				suburb: v.optional(v.string()),
				state: v.optional(v.string()),
			}),
		}),
		v.object({ success: v.literal(false), error: v.string() }),
	),
	handler: async (ctx, args) => {
		const apiKey = process.env.GOOGLE_PLACES_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		try {
			// Request essential fields: address_components (for postcode/suburb), geometry (for lat/lng),
			// formatted_address, place_id, and types.
			const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${args.placeId}&fields=${GOOGLE_PLACES_FIELDS}&key=${apiKey}`;

			const res = await fetch(url);
			if (!res.ok) {
				return {
					success: false as const,
					error: `HTTP error: ${res.status} ${res.statusText}`,
				};
			}

			const data: GooglePlacesResponse = await res.json();

			if (data.status === "OK" && data.result) {
				const { result } = data;
				const components = result.address_components || [];

				// Validate that we have the essential data
				if (!result.formatted_address) {
					return {
						success: false as const,
						error: "Missing formatted_address in response",
					};
				}

				if (!result.geometry?.location) {
					return {
						success: false as const,
						error: "Missing geometry data in response",
					};
				}

				// Extract structured data from the components array
				const postcode = extractComponent(components, "postal_code");
				const suburb = extractComponent(components, "locality");
				const state = extractComponent(
					components,
					"administrative_area_level_1",
				);

				const details = {
					placeId: result.place_id,
					formattedAddress: result.formatted_address,
					lat: result.geometry.location.lat,
					lng: result.geometry.location.lng,
					types: result.types || [],
					postcode,
					suburb,
					state,
				};

				// Log successful enrichment for debugging
				console.log(
					`[getPlaceDetails] Successfully enriched place: ${result.place_id}`,
					{
						formattedAddress: result.formatted_address,
						postcode,
						suburb,
						state,
					},
				);

				return { success: true as const, details };
			}
			const errorMessage = data.error_message || data.status || "Unknown error";
			console.error(
				`[getPlaceDetails] Google Places API error for place ${args.placeId}:`,
				errorMessage,
			);
			return {
				success: false as const,
				error: String(errorMessage),
			};
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error(
				`[getPlaceDetails] Exception for place ${args.placeId}:`,
				errorMessage,
			);
			return {
				success: false as const,
				error: errorMessage,
			};
		}
	},
});
