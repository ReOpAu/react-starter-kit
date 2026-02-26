import { v } from "convex/values";
import { action } from "../_generated/server";

interface PhotoResource {
	name: string;
	heightPx: number;
	widthPx: number;
	authorAttributions: Array<{
		displayName: string;
		uri: string;
		photoUri: string;
	}>;
}

interface PlacePhotosResponse {
	photos?: PhotoResource[];
}

interface PhotoMediaResponse {
	name: string;
	photoUri: string;
}

interface NearbyPlace {
	id?: string;
	displayName?: { text: string };
	photos?: PhotoResource[];
}

interface NearbySearchResponse {
	places?: NearbyPlace[];
}

// Resolved photo shape used internally before returning
interface ResolvedPhoto {
	url: string;
	width: number;
	height: number;
	attribution?: string;
	placeName?: string;
}

/** Resolve photo resources into URLs via the media endpoint */
async function resolvePhotoUrls(
	photoResources: PhotoResource[],
	apiKey: string,
	placeName?: string,
): Promise<ResolvedPhoto[]> {
	const photos = await Promise.all(
		photoResources.map(async (photo): Promise<ResolvedPhoto | null> => {
			const mediaUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=800&skipHttpRedirect=true`;
			const mediaRes = await fetch(mediaUrl, {
				headers: { "X-Goog-Api-Key": apiKey },
			});
			if (!mediaRes.ok) return null;

			const mediaData: PhotoMediaResponse = await mediaRes.json();
			return {
				url: mediaData.photoUri,
				width: photo.widthPx,
				height: photo.heightPx,
				attribution: photo.authorAttributions?.[0]?.displayName,
				placeName,
			};
		}),
	);
	return photos.filter((p): p is ResolvedPhoto => p !== null);
}

export const getPlacePhotos = action({
	args: {
		placeId: v.string(),
		maxPhotos: v.optional(v.number()),
		// Pass lat/lng so we can fall back to nearby neighbourhood photos
		lat: v.optional(v.number()),
		lng: v.optional(v.number()),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			source: v.union(v.literal("place"), v.literal("nearby")),
			photos: v.array(
				v.object({
					url: v.string(),
					width: v.number(),
					height: v.number(),
					attribution: v.optional(v.string()),
					placeName: v.optional(v.string()),
				}),
			),
		}),
		v.object({ success: v.literal(false), error: v.string() }),
	),
	handler: async (_ctx, args) => {
		const apiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!apiKey) {
			return {
				success: false as const,
				error: "Google Places API key not configured",
			};
		}

		const maxPhotos = args.maxPhotos ?? 6;

		try {
			// Step 1: Try to get photos directly from the place
			const detailsUrl = `https://places.googleapis.com/v1/places/${args.placeId}`;
			const detailsRes = await fetch(detailsUrl, {
				headers: {
					"X-Goog-Api-Key": apiKey,
					"X-Goog-FieldMask": "photos,location",
				},
			});

			if (!detailsRes.ok) {
				const errorData = await detailsRes.json().catch(() => ({}));
				const errorMsg =
					(errorData as Record<string, any>).error?.message ||
					`${detailsRes.status} ${detailsRes.statusText}`;
				return {
					success: false as const,
					error: `Failed to fetch place details: ${errorMsg}`,
				};
			}

			const detailsData: PlacePhotosResponse & {
				location?: { latitude: number; longitude: number };
			} = await detailsRes.json();

			// If the place itself has photos, return them directly
			if (detailsData.photos && detailsData.photos.length > 0) {
				const limit = Math.min(maxPhotos, detailsData.photos.length);
				const resolved = await resolvePhotoUrls(
					detailsData.photos.slice(0, limit),
					apiKey,
				);

				return {
					success: true as const,
					source: "place" as const,
					photos: resolved,
				};
			}

			// Step 2: No direct photos — fall back to nearby neighbourhood search
			// Use provided lat/lng, or the location from the place details response
			const lat = args.lat ?? detailsData.location?.latitude;
			const lng = args.lng ?? detailsData.location?.longitude;

			if (lat == null || lng == null) {
				return {
					success: true as const,
					source: "place" as const,
					photos: [],
				};
			}

			const nearbyRes = await fetch(
				"https://places.googleapis.com/v1/places:searchNearby",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Goog-Api-Key": apiKey,
						"X-Goog-FieldMask": "places.id,places.displayName,places.photos",
					},
					body: JSON.stringify({
						locationRestriction: {
							circle: {
								center: { latitude: lat, longitude: lng },
								radius: 500,
							},
						},
						maxResultCount: 10,
					}),
				},
			);

			if (!nearbyRes.ok) {
				// Nearby failed but that's not fatal — just return empty
				return {
					success: true as const,
					source: "nearby" as const,
					photos: [],
				};
			}

			const nearbyData: NearbySearchResponse = await nearbyRes.json();
			if (!nearbyData.places || nearbyData.places.length === 0) {
				return {
					success: true as const,
					source: "nearby" as const,
					photos: [],
				};
			}

			// Collect photos from nearby places, taking 1-2 per place for variety
			const allResolved: ResolvedPhoto[] = [];
			for (const place of nearbyData.places) {
				if (allResolved.length >= maxPhotos) break;
				if (!place.photos || place.photos.length === 0) continue;

				const take = Math.min(
					2,
					maxPhotos - allResolved.length,
					place.photos.length,
				);
				const resolved = await resolvePhotoUrls(
					place.photos.slice(0, take),
					apiKey,
					place.displayName?.text,
				);
				allResolved.push(...resolved);
			}

			return {
				success: true as const,
				source: "nearby" as const,
				photos: allResolved,
			};
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error(
				`[getPlacePhotos] Exception for place ${args.placeId}:`,
				errorMessage,
			);
			return {
				success: false as const,
				error: errorMessage,
			};
		}
	},
});
