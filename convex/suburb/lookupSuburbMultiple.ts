import { v } from "convex/values";
import { action } from "../_generated/server";
import { isValidSuburbPrediction, getPlaceDetails } from "./utils";

// Define a type for suburb predictions
interface SuburbPrediction {
  types: string[];
  description: string;
  place_id: string;
}

export const lookupSuburbMultiple = action({
  args: {
    suburbInput: v.string(),
    maxResults: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      results: v.array(
        v.object({
          canonicalSuburb: v.string(),
          placeId: v.string(),
          geocode: v.object({
            lat: v.number(),
            lng: v.number(),
          }),
          types: v.array(v.string()),
        }),
      ),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const { suburbInput, maxResults = 5 } = args;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return {
        success: false as const,
        error: "Google Places API key not configured",
      };
    }
    try {
      const allResults: Array<{
        canonicalSuburb: string;
        placeId: string;
        geocode: { lat: number; lng: number };
        types: string[];
      }> = [];
      const urls = [
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=address&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=geocode&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=(regions)&components=country:au&key=${apiKey}`,
      ];
      const responses = await Promise.all(
        urls.map((url) => fetch(url).then((res) => res.json())),
      );
      const [addressData, geocodeData, regionsData] = responses;
      if (addressData.status === "OK" && addressData.predictions) {
        const suburbMatches = addressData.predictions.filter(
          (prediction: SuburbPrediction) => isValidSuburbPrediction(prediction)
        );
        const detailPromises = suburbMatches
          .slice(0, maxResults)
          .map(async (match: SuburbPrediction) => {
            const placeDetails = await getPlaceDetails(match.place_id, apiKey);
            if (placeDetails) {
              return {
                canonicalSuburb: match.description,
                placeId: match.place_id,
                geocode: {
                  lat: placeDetails.lat,
                  lng: placeDetails.lng,
                },
                types: placeDetails.types,
              };
            }
            return null;
          });
        const newResults = (await Promise.all(detailPromises)).filter(
          (result): result is NonNullable<typeof result> => result !== null,
        );
        allResults.push(...newResults);
      }
      if (allResults.length < maxResults) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput,
        )}&types=geocode&components=country:au&key=${apiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.status === "OK" && geocodeData.predictions) {
          const suburbanMatches = geocodeData.predictions.filter(
            (prediction: SuburbPrediction) => {
              if (allResults.some((result) => result.placeId === prediction.place_id)) {
                return false;
              }
              return isValidSuburbPrediction(prediction);
            }
          );
          const detailPromises = suburbanMatches
            .slice(0, maxResults - allResults.length)
            .map(async (match: SuburbPrediction) => {
              const placeDetails = await getPlaceDetails(match.place_id, apiKey);
              if (placeDetails) {
                return {
                  canonicalSuburb: match.description,
                  placeId: match.place_id,
                  geocode: {
                    lat: placeDetails.lat,
                    lng: placeDetails.lng,
                  },
                  types: placeDetails.types,
                };
              }
              return null;
            });
          const newResults = (await Promise.all(detailPromises)).filter(
            (result): result is NonNullable<typeof result> => result !== null,
          );
          allResults.push(...newResults);
        }
      }
      if (allResults.length < maxResults) {
        const regionsUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput,
        )}&types=(regions)&components=country:au&key=${apiKey}`;
        const regionsResponse = await fetch(regionsUrl);
        const regionsData = await regionsResponse.json();
        if (regionsData.status === "OK" && regionsData.predictions) {
          const validRegions = regionsData.predictions.filter(
            (prediction: SuburbPrediction) => {
              if (allResults.some((result) => result.placeId === prediction.place_id)) {
                return false;
              }
              return isValidSuburbPrediction(prediction);
            }
          );
          const detailPromises = validRegions
            .slice(0, maxResults - allResults.length)
            .map(async (match: SuburbPrediction) => {
              const placeDetails = await getPlaceDetails(match.place_id, apiKey);
              if (placeDetails) {
                return {
                  canonicalSuburb: match.description,
                  placeId: match.place_id,
                  geocode: {
                    lat: placeDetails.lat,
                    lng: placeDetails.lng,
                  },
                  types: placeDetails.types,
                };
              }
              return null;
            });
          const newResults = (await Promise.all(detailPromises)).filter(
            (result): result is NonNullable<typeof result> => result !== null,
          );
          allResults.push(...newResults);
        }
      }
      if (allResults.length > 0) {
        return {
          success: true as const,
          results: allResults,
        };
      }
      return {
        success: false as const,
        error: `No valid Australian suburbs found for "${suburbInput}". Please try a different suburb name or check the spelling.`,
      };
    } catch (error) {
      return {
        success: false as const,
        error: "Failed to lookup suburbs - please try again",
      };
    }
  },
}); 