import { v } from "convex/values";
import { action } from "../_generated/server";

export const getNearbyAldiStores = action({
	args: {
		lat: v.number(),
		lng: v.number(),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			places: v.any(), // You can define a stricter validator if desired
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
	),
	handler: async (ctx, args) => {
		// Add this line for debugging
		console.log("Received coordinates:", { lat: args.lat, lng: args.lng });

		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}
		try {
			const body = {
				includedTypes: ["supermarket"],
				maxResultCount: 20,
				locationRestriction: {
					circle: {
						center: { latitude: args.lat, longitude: args.lng },
						radius: 5000, // 5km
					},
				},
			};

			console.log("API request body:", JSON.stringify(body, null, 2));

			const res = await fetch(
				"https://places.googleapis.com/v1/places:searchNearby",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Goog-Api-Key": apiKey,
						"X-Goog-FieldMask":
							"places.displayName,places.formattedAddress,places.location,places.id,places.types",
					},
					body: JSON.stringify(body),
				},
			);

			console.log("API response status:", res.status);

			if (!res.ok) {
				const errorText = await res.text();
				console.log("API error response:", errorText);
				return {
					success: false as const,
					error: `API error: ${res.status} - ${errorText}`,
				};
			}

			const data = await res.json();
			console.log("API response data:", JSON.stringify(data, null, 2));

			// Filter results to only include Aldi stores
			const aldiStores = (data.places || []).filter((place: any) =>
				place.displayName?.text?.toLowerCase().includes("aldi"),
			);

			console.log("Filtered Aldi stores:", JSON.stringify(aldiStores, null, 2));

			return { success: true as const, places: aldiStores };
		} catch (err) {
			return {
				success: false as const,
				error: err instanceof Error ? err.message : "Failed to fetch stores.",
			};
		}
	},
});
