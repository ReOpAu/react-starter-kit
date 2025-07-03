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
    })
  ),
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return { success: false as const, error: "Google Places API key not configured" };
    }
    try {
      const body = {
        includedTypes: ["supermarket"],
        keyword: "Aldi",
        maxResultCount: 5,
        locationRestriction: {
          circle: {
            center: { latitude: args.lat, longitude: args.lng },
            radius: 5000, // 5km
          },
        },
      };
      const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.distanceMeters,places.placeId",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return { success: false as const, error: `API error: ${res.status}` };
      }
      const data = await res.json();
      return { success: true as const, places: data.places || [] };
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : "Failed to fetch stores." };
    }
  },
}); 