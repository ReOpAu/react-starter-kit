import { v } from "convex/values";
import { action } from "../_generated/server";

export const getPlaceDetails = action({
  args: { placeId: v.string() },
  returns: v.union(
    v.object({ success: v.literal(true), details: v.any() }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return { success: false as const, error: "Google Places API key not configured" };
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${args.placeId}&fields=geometry,name,formatted_address,types,place_id,adr_address,icon,icon_background_color,icon_mask_base_uri,photos,plus_code,url,utc_offset,vicinity,reference,scope,alt_id,permanently_closed,opening_hours,price_level,rating,user_ratings_total&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "OK" && data.result) {
        return { success: true as const, details: data.result };
      }
      return { success: false as const, error: String(data.error_message || data.status || "Unknown error") };
    } catch (err) {
      return { success: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  }
}); 