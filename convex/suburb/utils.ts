// Shared utility for suburb validation

export function isValidSuburbPrediction(prediction: { types: string[]; description: string }): boolean {
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

export async function getPlaceDetails(placeId: string, apiKey: string): Promise<{ lat: number; lng: number; types: string[] } | null> {
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
} 