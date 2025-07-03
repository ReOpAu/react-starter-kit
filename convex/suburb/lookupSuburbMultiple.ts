import { v } from "convex/values";
import { action } from "../_generated/server";

function isValidSuburbPrediction(prediction: { types: string[]; description: string }): boolean {
  const isSuburbLevel = prediction.types.some((type) =>
    [
      "locality",
      "sublocality",
      "sublocality_level_1",
      "administrative_area_level_2",
      "political",
    ].includes(type),
  );
  const isSpecificPlace = prediction.types.some((type) =>
    [
      "establishment",
      "point_of_interest",
      "store",
      "food",
      "restaurant",
      "gas_station",
      "hospital",
      "school",
      "street_address",
      "route",
      "premise",
      "subpremise",
    ].includes(type),
  );
  const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(
    prediction.description,
  );
  const hasSpecificPlaceName =
    /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(
      prediction.description,
    );
  const isSimpleSuburbFormat =
    /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(
      prediction.description,
    );
  return (
    isSuburbLevel &&
    !isSpecificPlace &&
    hasAustralianState &&
    !hasSpecificPlaceName &&
    isSimpleSuburbFormat
  );
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
      const getPlaceDetails = async (placeId: string) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,types&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        if (detailsData.status === "OK" && detailsData.result) {
          return {
            lat: detailsData.result.geometry?.location?.lat || 0,
            lng: detailsData.result.geometry?.location?.lng || 0,
            types: detailsData.result.types || [],
          };
        }
        return null;
      };
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
          (prediction: {
            types: string[];
            description: string;
            place_id: string;
          }) => isValidSuburbPrediction(prediction)
        );
        const detailPromises = suburbMatches
          .slice(0, maxResults)
          .map(async (match: any) => {
            const placeDetails = await getPlaceDetails(match.place_id);
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
            (prediction: {
              types: string[];
              description: string;
              place_id: string;
            }) => {
              if (
                allResults.some(
                  (result) => result.placeId === prediction.place_id,
                )
              ) {
                return false;
              }
              const hasLocalityType = prediction.types.some((type) =>
                [
                  "locality",
                  "sublocality",
                  "sublocality_level_1",
                  "administrative_area_level_2",
                  "political",
                ].includes(type),
              );
              const hasBusinessType = prediction.types.some((type) =>
                [
                  "establishment",
                  "point_of_interest",
                  "store",
                  "food",
                  "restaurant",
                  "gas_station",
                  "hospital",
                  "school",
                  "shopping_mall",
                  "park",
                  "tourist_attraction",
                  "transit_station",
                  "train_station",
                  "bus_station",
                  "subway_station",
                  "street_address",
                  "route",
                  "premise",
                  "subpremise",
                ].includes(type),
              );
              const hasAustralianState =
                /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(
                  prediction.description,
                );
              const hasSpecificPlaceName =
                /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel)\b/i.test(
                  prediction.description,
                );
              const isSimpleSuburbFormat =
                /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(
                  prediction.description,
                );
              return (
                hasLocalityType &&
                !hasBusinessType &&
                hasAustralianState &&
                !hasSpecificPlaceName &&
                isSimpleSuburbFormat
              );
            },
          );
          const detailPromises = suburbanMatches
            .slice(0, maxResults - allResults.length)
            .map(async (match: any) => {
              const placeDetails = await getPlaceDetails(match.place_id);
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
            (prediction: {
              types: string[];
              description: string;
              place_id: string;
            }) => {
              if (
                allResults.some(
                  (result) => result.placeId === prediction.place_id,
                )
              ) {
                return false;
              }
              const isGenuineSuburb = prediction.types.some((type) =>
                [
                  "locality",
                  "sublocality",
                  "administrative_area_level_2",
                ].includes(type),
              );
              const hasAustralianState =
                /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(
                  prediction.description,
                );
              const isNotBusiness = !prediction.types.some((type) =>
                [
                  "establishment",
                  "point_of_interest",
                  "store",
                  "food",
                  "restaurant",
                  "gas_station",
                  "hospital",
                  "school",
                  "shopping_mall",
                  "park",
                  "tourist_attraction",
                  "transit_station",
                  "train_station",
                  "bus_station",
                  "subway_station",
                  "street_address",
                  "route",
                  "premise",
                  "subpremise",
                ].includes(type),
              );
              const hasSpecificPlaceName =
                /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(
                  prediction.description,
                );
              const isSimpleSuburbFormat =
                /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(
                  prediction.description,
                );
              return (
                isGenuineSuburb &&
                hasAustralianState &&
                isNotBusiness &&
                !hasSpecificPlaceName &&
                isSimpleSuburbFormat
              );
            },
          );
          const detailPromises = validRegions
            .slice(0, maxResults - allResults.length)
            .map(async (match: any) => {
              const placeDetails = await getPlaceDetails(match.place_id);
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