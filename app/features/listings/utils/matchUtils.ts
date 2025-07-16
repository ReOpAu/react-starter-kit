import { calculatePriceScore } from "../services/matchingService";
import type { ConvexListing } from "../types";
import { formatDistance } from "./distance";

/**
 * Interface for listing type information
 */
export interface ListingTypeInfo {
	isOriginalBuyer: boolean;
	isMatchedBuyer: boolean;
	isOriginalSuburbBuyer: boolean;
	isMatchedSuburbBuyer: boolean;
	isOriginalStreetBuyer: boolean;
	isMatchedStreetBuyer: boolean;
}

/**
 * Interface for color class mapping
 */
export interface ColorClasses {
	original: {
		main: string;
		light: string;
		text: string;
		border: string;
	};
	matched: {
		main: string;
		light: string;
		text: string;
		border: string;
	};
}

/**
 * Interface for location information
 */
export interface LocationInfo {
	sameSuburb: boolean;
	sameState: boolean;
	distance?: number;
	distanceText: string;
}

/**
 * Interface for price comparison
 */
export interface PriceComparison {
	hasOverlap: boolean;
	overlapPercentage: number;
	priceDifference: number;
	comparisonText: string;
}

/**
 * Detects listing type information
 */
export function getListingTypeInfo(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): ListingTypeInfo {
	// Determine if this is a buyer listing and what type
	const isOriginalBuyer = originalListing.listingType === "buyer";
	const isMatchedBuyer = matchedListing.listingType === "buyer";

	// Check for specific buyer listing types
	const isOriginalSuburbBuyer =
		isOriginalBuyer && originalListing.buyerType === "suburb";

	const isMatchedSuburbBuyer =
		isMatchedBuyer && matchedListing.buyerType === "suburb";

	const isOriginalStreetBuyer =
		isOriginalBuyer && originalListing.buyerType === "street";

	const isMatchedStreetBuyer =
		isMatchedBuyer && matchedListing.buyerType === "street";

	return {
		isOriginalBuyer,
		isMatchedBuyer,
		isOriginalSuburbBuyer,
		isMatchedSuburbBuyer,
		isOriginalStreetBuyer,
		isMatchedStreetBuyer,
	};
}

/**
 * Gets color classes based on listing type
 */
export function getColorClasses(
	listingTypeInfo: ListingTypeInfo,
): ColorClasses {
	const { isOriginalBuyer, isMatchedBuyer } = listingTypeInfo;

	// Get the appropriate color styles based on listing type
	const originalColorClass = isOriginalBuyer
		? "bg-orange-500"
		: "bg-purple-500";
	const originalLightColorClass = isOriginalBuyer
		? "bg-orange-100"
		: "bg-purple-100";
	const originalTextColorClass = isOriginalBuyer
		? "text-orange-700"
		: "text-purple-700";
	const originalBorderColorClass = isOriginalBuyer
		? "border-orange-300"
		: "border-purple-300";

	const matchedColorClass = isMatchedBuyer ? "bg-orange-500" : "bg-purple-500";
	const matchedLightColorClass = isMatchedBuyer
		? "bg-orange-100"
		: "bg-purple-100";
	const matchedTextColorClass = isMatchedBuyer
		? "text-orange-700"
		: "text-purple-700";
	const matchedBorderColorClass = isMatchedBuyer
		? "border-orange-300"
		: "border-purple-300";

	return {
		original: {
			main: originalColorClass,
			light: originalLightColorClass,
			text: originalTextColorClass,
			border: originalBorderColorClass,
		},
		matched: {
			main: matchedColorClass,
			light: matchedLightColorClass,
			text: matchedTextColorClass,
			border: matchedBorderColorClass,
		},
	};
}

/**
 * Calculate location information between two listings
 */
export function calculateLocationInfo(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
	distance?: number,
): LocationInfo {
	const sameSuburb =
		originalListing.suburb.toLowerCase() ===
		matchedListing.suburb.toLowerCase();
	const sameState =
		originalListing.state.toLowerCase() === matchedListing.state.toLowerCase();

	let distanceText = "";
	if (distance !== undefined) {
		distanceText = `${formatDistance(distance)} apart`;
	}

	return {
		sameSuburb,
		sameState,
		distance,
		distanceText,
	};
}

/**
 * Calculate price comparison between two listings (for display purposes)
 * Uses centralized scoring service for consistency
 */
export function calculatePriceComparison(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): PriceComparison {
	const price1 = {
		min: originalListing.priceMin || 0,
		max: originalListing.priceMax || 0,
	};
	const price2 = {
		min: matchedListing.priceMin || 0,
		max: matchedListing.priceMax || 0,
	};

	// Check for price overlap
	const hasOverlap = price1.max >= price2.min && price2.max >= price1.min;

	// Use centralized scoring for consistency
	const matchScore = calculatePriceScore(originalListing, matchedListing);

	// Calculate price difference
	const midpoint1 = (price1.min + price1.max) / 2;
	const midpoint2 = (price2.min + price2.max) / 2;
	const priceDifference = Math.abs(midpoint1 - midpoint2);

	// Generate comparison text based on match score
	let comparisonText = "";
	if (matchScore >= 90) {
		comparisonText = "Excellent price match";
	} else if (matchScore >= 80) {
		comparisonText = "Very good price alignment";
	} else if (matchScore >= 70) {
		comparisonText = "Good price compatibility";
	} else if (matchScore >= 60) {
		comparisonText = "Fair price overlap";
	} else if (matchScore >= 40) {
		comparisonText = "Some price compatibility";
	} else if (matchScore >= 20) {
		comparisonText = "Limited price alignment";
	} else {
		comparisonText = "Significant price mismatch";
	}

	return {
		hasOverlap,
		overlapPercentage: matchScore,
		priceDifference,
		comparisonText,
	};
}

/**
 * Format listing location for display
 */
export function formatListingLocation(
	listing: ConvexListing,
	isSuburbBuyer: boolean,
): string {
	if (!listing.suburb) return "";
	return isSuburbBuyer ? ` in ${listing.suburb}` : "";
}

/**
 * Format listing details for display
 */
export function formatListingDetails(
	listing: ConvexListing,
	isSuburbBuyer: boolean,
): string {
	const suburb = listing.suburb || "";
	const state = listing.state || "";

	return isSuburbBuyer ? `${suburb}, ${state}` : state;
}

/**
 * Get listing type label
 */
export function getListingTypeLabel(listing: ConvexListing): string {
	return listing.listingType === "buyer" ? "Buyer" : "Seller";
}

/**
 * Normalize suburb name
 */
export function normalizeSuburb(suburb: string): string {
	return suburb
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}
