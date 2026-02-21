import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { paymentWebhook } from "./subscriptions";

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";

// Helper to calculate distance using Haversine formula
function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371e3; // Earth's radius in meters
	const φ1 = (lat1 * Math.PI) / 180;
	const φ2 = (lat2 * Math.PI) / 180;
	const Δφ = ((lat2 - lat1) * Math.PI) / 180;
	const Δλ = ((lon2 - lon1) * Math.PI) / 180;

	const a =
		Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
		Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return Math.round(R * c); // Return distance in meters
}

// Simplified display type getter
function getDisplayType(types: string[]): string {
	if (types.length > 0) {
		// Capitalize first letter and replace underscores with spaces
		const type = types[0];
		return type
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}
	return "Place";
}

export const nearbyPlaces = httpAction(async (_, request) => {
	if (!GOOGLE_MAPS_API_KEY) {
		return new Response(
			JSON.stringify({ error: "Google Places API key is not configured." }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const { lat, lng, radius, types, minRating } = await request.json();

	if (!lat || !lng) {
		return new Response(
			JSON.stringify({ error: "Latitude and longitude are required." }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const requestBody = {
		locationRestriction: {
			circle: {
				center: {
					latitude: Number.parseFloat(lat),
					longitude: Number.parseFloat(lng),
				},
				radius: Number.parseFloat(radius || "2000"),
			},
		},
		includedTypes: types,
		maxResultCount: 20,
	};

	try {
		const response = await fetch(PLACES_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
				"X-Goog-FieldMask":
					"places.displayName,places.formattedAddress,places.rating,places.types,places.location",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error("Google Places API error:", errorBody);
			return new Response(
				JSON.stringify({ error: "Failed to fetch from Google Places API." }),
				{
					status: response.status,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const data = await response.json();

		if (!data.places) {
			return new Response(JSON.stringify([]), {
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Access-Control-Allow-Origin": "*",
				},
			});
		}

		let places = data.places.map((place: any, index: number) => ({
			place_id: `place_${index}_${Math.random().toString(36).substr(2, 9)}`,
			name: place.displayName?.text,
			vicinity: place.formattedAddress,
			rating: place.rating,
			types: place.types,
			type: getDisplayType(place.types),
			distance: calculateDistance(
				Number.parseFloat(lat),
				Number.parseFloat(lng),
				place.location.latitude,
				place.location.longitude,
			),
		}));

		if (minRating) {
			places = places.filter(
				(place: { rating?: number }) =>
					place.rating && place.rating >= Number.parseFloat(minRating),
			);
		}

		places.sort(
			(a: { distance: number }, b: { distance: number }) =>
				a.distance - b.distance,
		);

		return new Response(JSON.stringify(places), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		console.error("Error fetching nearby places:", error);
		return new Response(
			JSON.stringify({ error: "An internal error occurred." }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
});

export const chat = httpAction(async (ctx, req) => {
	// Extract the `messages` from the body of the request
	const { messages } = await req.json();

	const result = streamText({
		model: openai("gpt-4o"),
		messages,
		async onFinish({ text }) {
			// implement your own logic here, e.g. for storing messages
			// or recording token usage
			console.log(text);
		},
	});

	// Respond with the stream
	return result.toDataStreamResponse({
		headers: {
			"Access-Control-Allow-Origin":
				process.env.FRONTEND_URL || "http://localhost:5173",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Allow-Credentials": "true",
			Vary: "origin",
		},
	});
});

const http = httpRouter();

http.route({
	path: "/api/chat",
	method: "POST",
	handler: chat,
});

http.route({
	path: "/api/chat",
	method: "OPTIONS",
	handler: httpAction(async (_, request) => {
		// Make sure the necessary headers are present
		// for this to be a valid pre-flight request
		const headers = request.headers;
		if (
			headers.get("Origin") !== null &&
			headers.get("Access-Control-Request-Method") !== null &&
			headers.get("Access-Control-Request-Headers") !== null
		) {
			return new Response(null, {
				headers: new Headers({
					"Access-Control-Allow-Origin":
						process.env.FRONTEND_URL || "http://localhost:5173",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
					"Access-Control-Max-Age": "86400",
				}),
			});
		}
		return new Response();
	}),
});

http.route({
	path: "/api/auth/webhook",
	method: "POST",
	handler: httpAction(async (_, request) => {
		// Make sure the necessary headers are present
		// for this to be a valid pre-flight request
		const headers = request.headers;
		if (
			headers.get("Origin") !== null &&
			headers.get("Access-Control-Request-Method") !== null &&
			headers.get("Access-Control-Request-Headers") !== null
		) {
			return new Response(null, {
				headers: new Headers({
					"Access-Control-Allow-Origin":
						process.env.FRONTEND_URL || "http://localhost:5173",
					"Access-Control-Allow-Methods": "POST",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
					"Access-Control-Max-Age": "86400",
				}),
			});
		}
		return new Response();
	}),
});

http.route({
	path: "/payments/webhook",
	method: "POST",
	handler: paymentWebhook,
});

http.route({
	path: "/api/nearbyPlaces",
	method: "POST",
	handler: nearbyPlaces,
});

http.route({
	path: "/api/nearbyPlaces",
	method: "OPTIONS",
	handler: httpAction(async (_, request) => {
		// Make sure the necessary headers are present
		// for this to be a valid pre-flight request
		const headers = request.headers;
		if (
			headers.get("Origin") !== null &&
			headers.get("Access-Control-Request-Method") !== null &&
			headers.get("Access-Control-Request-Headers") !== null
		) {
			return new Response(null, {
				headers: new Headers({
					"Access-Control-Allow-Origin":
						process.env.FRONTEND_URL || "http://localhost:5173",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
					"Access-Control-Max-Age": "86400",
				}),
			});
		}
		return new Response();
	}),
});

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
