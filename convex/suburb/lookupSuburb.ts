import { v } from "convex/values";
import { action } from "../_generated/server";
import { isValidSuburbPrediction } from "./utils";

export const lookupSuburb = action({
	args: {
		suburbInput: v.string(),
	},
	returns: v.union(
		v.object({
			success: v.literal(true),
			canonicalSuburb: v.string(),
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
			const responses = await Promise.all(
				urls.map((url) => fetch(url).then((res) => res.json())),
			);
			const [addressData, geocodeData, regionsData] = responses;
			if (
				addressData.status === "OK" &&
				addressData.predictions &&
				addressData.predictions.length > 0
			) {
				const suburbMatch = addressData.predictions.find(
					(prediction: { types: string[]; description: string }) =>
						isValidSuburbPrediction(prediction),
				);
				if (suburbMatch) {
					return {
						success: true as const,
						canonicalSuburb: suburbMatch.description,
					};
				}
			}
			if (
				geocodeData.status === "OK" &&
				geocodeData.predictions &&
				geocodeData.predictions.length > 0
			) {
				const suburbanMatch = geocodeData.predictions.find(
					(prediction: { types: string[]; description: string }) =>
						isValidSuburbPrediction(prediction),
				);
				if (suburbanMatch) {
					return {
						success: true as const,
						canonicalSuburb: suburbanMatch.description,
					};
				}
			}
			if (
				regionsData.status === "OK" &&
				regionsData.predictions &&
				regionsData.predictions.length > 0
			) {
				const validRegion = regionsData.predictions.find(
					(prediction: { types: string[]; description: string }) =>
						isValidSuburbPrediction(prediction),
				);
				if (validRegion) {
					return {
						success: true as const,
						canonicalSuburb: validRegion.description,
					};
				}
			}
			return {
				success: false as const,
				error: "No valid address, street, or suburb found",
			};
		} catch (error) {
			return {
				success: false as const,
				error: "Lookup failed - please try again",
			};
		}
	},
});
