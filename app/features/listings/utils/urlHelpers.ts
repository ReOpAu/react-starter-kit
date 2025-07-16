import type { ConvexListing } from "../types";

/**
 * Generates the complete URL path for a listing following the saaskit specification:
 * /listings/[state]/[type]/[suburb]/[id]
 */
export function generateListingUrl(listing: ConvexListing): string {
	const state = listing.state.toLowerCase();
	const type = listing.listingType.toLowerCase();
	const suburb = listing.suburb.toLowerCase().replace(/\s+/g, "-");
	const id = listing._id;

	return `/listings/${state}/${type}/${suburb}/${id}`;
}

/**
 * Generates the matches URL for a listing
 */
export function generateMatchesUrl(listing: ConvexListing): string {
	return `${generateListingUrl(listing)}/matches`;
}

/**
 * Generates the match detail URL for comparing two listings
 */
export function generateMatchDetailUrl(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): string {
	return `${generateListingUrl(originalListing)}/matches/${matchedListing._id}`;
}

/**
 * Generates the type-specific URL (all buyers/sellers in a state)
 */
export function generateTypeUrl(state: string, type: string): string {
	return `/listings/${state.toLowerCase()}/${type.toLowerCase()}`;
}

/**
 * Generates the suburb-specific URL (all listings of a type in a suburb)
 */
export function generateSuburbUrl(
	state: string,
	type: string,
	suburb: string,
): string {
	const cleanSuburb = suburb.toLowerCase().replace(/\s+/g, "-");
	return `/listings/${state.toLowerCase()}/${type.toLowerCase()}/${cleanSuburb}`;
}

/**
 * Extracts listing info from URL parameters
 */
export function parseListingParams(params: {
	state?: string;
	type?: string;
	suburb?: string;
	id?: string;
}) {
	return {
		state: params.state?.toUpperCase() || "",
		type: params.type as "buyer" | "seller" | undefined,
		suburb: params.suburb?.replace(/-/g, " ") || "",
		id: params.id || "",
	};
}
