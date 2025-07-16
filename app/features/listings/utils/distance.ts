/**
 * Distance calculation utilities for the listings feature.
 * Uses the Haversine formula for accurate distance calculations between coordinates.
 */

export interface DistanceCoordinates {
	latitude: number;
	longitude: number;
}

export interface ListingWithCoordinates {
	latitude?: number;
	longitude?: number;
	location?: DistanceCoordinates;
}

/**
 * Calculates the great-circle distance between two points on Earth using the Haversine formula.
 * This provides accurate distance calculations taking into account the Earth's curvature.
 *
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lon1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lon2 - Longitude of the second point in decimal degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Calculates distance between two listings, handling different coordinate formats.
 *
 * @param listing1 - First listing object
 * @param listing2 - Second listing object
 * @returns Distance in kilometers, or null if coordinates are missing
 */
export function calculateListingDistance(
	listing1: ListingWithCoordinates,
	listing2: ListingWithCoordinates,
): number | null {
	// Try to get coordinates from different possible properties
	const coords1 = getCoordinates(listing1);
	const coords2 = getCoordinates(listing2);

	if (!coords1 || !coords2) {
		return null;
	}

	return calculateDistance(
		coords1.latitude,
		coords1.longitude,
		coords2.latitude,
		coords2.longitude,
	);
}

/**
 * Formats distance for display, showing meters for distances under 1km.
 *
 * @param distance - Distance in kilometers
 * @returns Formatted distance string (e.g., "500m", "2.3km")
 */
export function formatDistance(distance: number): string {
	return distance < 1
		? `${Math.round(distance * 1000)}m`
		: `${distance.toFixed(1)}km`;
}

/**
 * Calculates and formats distance between two listings for display.
 *
 * @param listing1 - First listing object
 * @param listing2 - Second listing object
 * @returns Formatted distance string or "Distance unknown" if coordinates are missing
 */
export function calculateAndFormatListingDistance(
	listing1: ListingWithCoordinates,
	listing2: ListingWithCoordinates,
): string {
	const distance = calculateListingDistance(listing1, listing2);
	return distance !== null ? formatDistance(distance) : "Distance unknown";
}

/**
 * Helper function to extract coordinates from a listing object.
 * Handles different coordinate formats that may exist in the codebase.
 */
function getCoordinates(
	listing: ListingWithCoordinates,
): DistanceCoordinates | null {
	// Check for direct latitude/longitude properties
	if (listing.latitude && listing.longitude) {
		return {
			latitude: listing.latitude,
			longitude: listing.longitude,
		};
	}

	// Check for location object
	if (listing.location?.latitude && listing.location?.longitude) {
		return {
			latitude: listing.location.latitude,
			longitude: listing.location.longitude,
		};
	}

	return null;
}
