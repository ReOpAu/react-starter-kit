import { v } from "convex/values";
import { action } from "../_generated/server";
import { getPlaceDetails } from "./utils";

function isValidSuburbPrediction(prediction: {
	types: string[];
	description: string;
}): boolean {
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

export const lookupSuburbEnhanced = action({
	args: {
		suburbInput: v.string(),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			canonicalSuburb: v.string(),
			placeId: v.string(),
			geocode: v.object({
				lat: v.number(),
				lng: v.number(),
			}),
			types: v.array(v.string()),
		}),
		v.object({
			success: v.literal(false),
			error: v.string(),
		}),
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
			const { suburbInput } = args;
			const urls = [
				`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=address&components=country:au&key=${apiKey}`,
				`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=geocode&components=country:au&key=${apiKey}`,
				`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=(regions)&components=country:au&key=${apiKey}`,
			];
			const [addressData, geocodeData, regionsData] = await Promise.all(
				urls.map((url) => fetch(url).then((res) => res.json())),
			);
			if (
				addressData.status === "OK" &&
				addressData.predictions &&
				addressData.predictions.length > 0
			) {
				const suburbMatch = addressData.predictions.find(
					(prediction: {
						types: string[];
						description: string;
						place_id: string;
					}) => isValidSuburbPrediction(prediction),
				);
				if (suburbMatch) {
					const placeDetails = await getPlaceDetails(
						suburbMatch.place_id,
						apiKey,
					);
					if (placeDetails) {
						return {
							success: true as const,
							canonicalSuburb: suburbMatch.description,
							placeId: suburbMatch.place_id,
							geocode: {
								lat: placeDetails.lat,
								lng: placeDetails.lng,
							},
							types: placeDetails.types,
						};
					}
				}
			}
			if (
				geocodeData.status === "OK" &&
				geocodeData.predictions &&
				geocodeData.predictions.length > 0
			) {
				const suburbanMatch = geocodeData.predictions.find(
					(prediction: {
						types: string[];
						description: string;
						place_id: string;
					}) => isValidSuburbPrediction(prediction),
				);
				if (suburbanMatch) {
					const placeDetails = await getPlaceDetails(
						suburbanMatch.place_id,
						apiKey,
					);
					if (placeDetails) {
						return {
							success: true as const,
							canonicalSuburb: suburbanMatch.description,
							placeId: suburbanMatch.place_id,
							geocode: {
								lat: placeDetails.lat,
								lng: placeDetails.lng,
							},
							types: placeDetails.types,
						};
					}
				}
			}
			if (
				regionsData.status === "OK" &&
				regionsData.predictions &&
				regionsData.predictions.length > 0
			) {
				const validRegion = regionsData.predictions.find(
					(prediction: {
						types: string[];
						description: string;
						place_id: string;
					}) => isValidSuburbPrediction(prediction),
				);
				if (validRegion) {
					const placeDetails = await getPlaceDetails(
						validRegion.place_id,
						apiKey,
					);
					if (placeDetails) {
						return {
							success: true as const,
							canonicalSuburb: validRegion.description,
							placeId: validRegion.place_id,
							geocode: {
								lat: placeDetails.lat,
								lng: placeDetails.lng,
							},
							types: placeDetails.types,
						};
					}
				}
			}
			return {
				success: false as const,
				error: `No valid Australian suburb found for "${args.suburbInput}". Please try a different suburb name or check the spelling.`,
			};
		} catch (error) {
			return {
				success: false as const,
				error: "Failed to lookup suburb - please try again",
			};
		}
	},
});
