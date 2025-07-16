/**
 * Centralized Matching and Scoring Service
 *
 * This service provides ALL match calculation logic in one place to ensure:
 * - Consistency across the application
 * - DRY principle compliance
 * - Single source of truth for scoring algorithms
 * - Easy maintenance and updates
 */

import type { ConvexListing } from "../types";
import { calculateListingDistance } from "../utils";

// Standardized score breakdown interface
export interface StandardScoreBreakdown {
	overall: number;
	components: {
		distance: number;
		price: number;
		propertyType: number;
		bedrooms: number;
		parking: number;
		features: number;
	};
	weights: {
		distance: number;
		price: number;
		propertyType: number;
		bedrooms: number;
		parking: number;
		features: number;
	};
}

// Standard weights for score calculation
export const DEFAULT_WEIGHTS = {
	distance: 30,
	price: 25,
	propertyType: 20,
	bedrooms: 15,
	parking: 5,
	features: 5,
} as const;

/**
 * Calculate comprehensive match score between two listings
 */
export function calculateMatchScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
	weights: typeof DEFAULT_WEIGHTS = DEFAULT_WEIGHTS,
): StandardScoreBreakdown {
	// Calculate individual component scores
	const distanceScore = calculateDistanceScore(originalListing, matchedListing);
	const priceScore = calculatePriceScore(originalListing, matchedListing);
	const propertyTypeScore = calculatePropertyTypeScore(
		originalListing,
		matchedListing,
	);
	const bedroomScore = calculateBedroomScore(originalListing, matchedListing);
	const parkingScore = calculateParkingScore(originalListing, matchedListing);
	const featureScore = calculateFeatureScore(originalListing, matchedListing);

	// Calculate weighted overall score
	const totalWeight = Object.values(weights).reduce(
		(sum, weight) => sum + weight,
		0,
	);
	const overall = Math.round(
		(distanceScore * weights.distance +
			priceScore * weights.price +
			propertyTypeScore * weights.propertyType +
			bedroomScore * weights.bedrooms +
			parkingScore * weights.parking +
			featureScore * weights.features) /
			totalWeight,
	);

	return {
		overall,
		components: {
			distance: distanceScore,
			price: priceScore,
			propertyType: propertyTypeScore,
			bedrooms: bedroomScore,
			parking: parkingScore,
			features: featureScore,
		},
		weights,
	};
}

/**
 * Calculate distance match score (0-100)
 */
export function calculateDistanceScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): number {
	const distance = calculateListingDistance(originalListing, matchedListing);

	if (!distance) return 50; // Unknown distance gets neutral score

	// Score based on distance thresholds
	if (distance <= 0.5) return 100; // Same area
	if (distance <= 1) return 95; // Very close
	if (distance <= 2) return 90; // Close
	if (distance <= 5) return 80; // Nearby
	if (distance <= 10) return 70; // Same city
	if (distance <= 20) return 60; // Same region
	if (distance <= 50) return 40; // Moderate distance
	if (distance <= 100) return 20; // Far
	return 10; // Very far
}

/**
 * Calculate price match score (0-100) - centralized version
 */
export function calculatePriceScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): number {
	// Get price ranges
	const price1 = {
		min: originalListing.priceMin || 0,
		max: originalListing.priceMax || 0,
	};
	const price2 = {
		min: matchedListing.priceMin || 0,
		max: matchedListing.priceMax || 0,
	};

	// Handle invalid price ranges
	if (
		price1.max === 0 ||
		price2.max === 0 ||
		price1.min > price1.max ||
		price2.min > price2.max
	) {
		return 0;
	}

	// Determine buyer/seller dynamics
	const isOriginalBuyer = originalListing.listingType === "buyer";
	const isMatchedBuyer = matchedListing.listingType === "buyer";

	if (isOriginalBuyer !== isMatchedBuyer) {
		// Buyer-seller match
		const buyerRange = isOriginalBuyer ? price1 : price2;
		const sellerRange = isOriginalBuyer ? price2 : price1;
		return calculateBuyerSellerPriceScore(buyerRange, sellerRange);
	} else {
		// Same type match
		return calculateSameTypePriceScore(price1, price2);
	}
}

/**
 * Calculate buyer-seller price compatibility score
 */
function calculateBuyerSellerPriceScore(
	buyerRange: { min: number; max: number },
	sellerRange: { min: number; max: number },
): number {
	const hasOverlap =
		buyerRange.max >= sellerRange.min && buyerRange.min <= sellerRange.max;

	if (!hasOverlap) {
		// Calculate gap between ranges
		const gap = Math.min(
			Math.abs(buyerRange.max - sellerRange.min),
			Math.abs(sellerRange.max - buyerRange.min),
		);

		const avgBuyerBudget = (buyerRange.min + buyerRange.max) / 2;
		const gapPercentage = (gap / avgBuyerBudget) * 100;

		if (gapPercentage <= 5) return 60;
		if (gapPercentage <= 10) return 40;
		if (gapPercentage <= 20) return 20;
		return 0;
	}

	// Calculate overlap quality
	const overlapMin = Math.max(buyerRange.min, sellerRange.min);
	const overlapMax = Math.min(buyerRange.max, sellerRange.max);
	const overlapSize = overlapMax - overlapMin;

	const buyerRangeSize = buyerRange.max - buyerRange.min;
	const sellerRangeSize = sellerRange.max - sellerRange.min;

	const buyerOverlapPercent =
		buyerRangeSize > 0 ? (overlapSize / buyerRangeSize) * 100 : 100;
	const sellerOverlapPercent =
		sellerRangeSize > 0 ? (overlapSize / sellerRangeSize) * 100 : 100;

	const overlapScore = Math.min(buyerOverlapPercent, sellerOverlapPercent);

	if (overlapScore >= 80) return 95;
	if (overlapScore >= 60) return 85;
	if (overlapScore >= 40) return 75;
	if (overlapScore >= 20) return 65;
	return 55;
}

/**
 * Calculate same-type price compatibility score
 */
function calculateSameTypePriceScore(
	price1: { min: number; max: number },
	price2: { min: number; max: number },
): number {
	const hasOverlap = price1.max >= price2.min && price2.max >= price1.min;

	if (!hasOverlap) {
		const midpoint1 = (price1.min + price1.max) / 2;
		const midpoint2 = (price2.min + price2.max) / 2;
		const difference = Math.abs(midpoint1 - midpoint2);
		const avgPrice = (midpoint1 + midpoint2) / 2;
		const diffPercentage = (difference / avgPrice) * 100;

		if (diffPercentage <= 5) return 70;
		if (diffPercentage <= 10) return 50;
		if (diffPercentage <= 20) return 30;
		return 10;
	}

	const overlapMin = Math.max(price1.min, price2.min);
	const overlapMax = Math.min(price1.max, price2.max);
	const overlapSize = overlapMax - overlapMin;

	const range1Size = price1.max - price1.min;
	const range2Size = price2.max - price2.min;
	const avgRangeSize = (range1Size + range2Size) / 2;

	const overlapPercentage =
		avgRangeSize > 0 ? (overlapSize / avgRangeSize) * 100 : 100;

	if (overlapPercentage >= 90) return 90;
	if (overlapPercentage >= 70) return 80;
	if (overlapPercentage >= 50) return 70;
	if (overlapPercentage >= 30) return 60;
	return 50;
}

/**
 * Calculate property type match score (0-100)
 */
export function calculatePropertyTypeScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): number {
	if (!originalListing.buildingType || !matchedListing.buildingType) {
		return 50; // Unknown gets neutral score
	}

	// Exact match
	if (originalListing.buildingType === matchedListing.buildingType) {
		return 100;
	}

	// Compatible types (apartment/unit, house/villa, etc.)
	const compatibleTypes: Record<string, string[]> = {
		Apartment: ["Unit", "Studio"],
		Unit: ["Apartment", "Studio"],
		Studio: ["Apartment", "Unit"],
		House: ["Villa", "Duplex"],
		Villa: ["House", "Duplex"],
		Duplex: ["House", "Villa", "Townhouse"],
		Townhouse: ["Duplex"],
	};

	const originalType = originalListing.buildingType;
	const matchedType = matchedListing.buildingType;

	if (compatibleTypes[originalType]?.includes(matchedType)) {
		return 80; // Compatible types
	}

	return 30; // Different types but still possible match
}

/**
 * Calculate bedroom count match score (0-100)
 */
export function calculateBedroomScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): number {
	const originalBedrooms = originalListing.bedrooms || 0;
	const matchedBedrooms = matchedListing.bedrooms || 0;

	if (originalBedrooms === 0 || matchedBedrooms === 0) {
		return 50; // Unknown gets neutral score
	}

	const difference = Math.abs(originalBedrooms - matchedBedrooms);

	if (difference === 0) return 100; // Exact match
	if (difference === 1) return 80; // Close match
	if (difference === 2) return 60; // Acceptable
	if (difference === 3) return 40; // Significant difference
	return 20; // Very different
}

/**
 * Calculate parking match score (0-100)
 */
export function calculateParkingScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): number {
	const originalParking = originalListing.parking || 0;
	const matchedParking = matchedListing.parking || 0;

	if (originalParking === matchedParking) return 100;

	const difference = Math.abs(originalParking - matchedParking);

	if (difference === 1) return 80; // Close
	if (difference === 2) return 60; // Acceptable
	return 40; // Different parking needs
}

/**
 * Calculate feature match score (0-100)
 */
export function calculateFeatureScore(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): number {
	const originalFeatures = originalListing.features || [];
	const matchedFeatures = matchedListing.features || [];

	if (originalFeatures.length === 0 && matchedFeatures.length === 0) {
		return 100; // Both have no features
	}

	if (originalFeatures.length === 0 || matchedFeatures.length === 0) {
		return 50; // One has features, other doesn't
	}

	const commonFeatures = originalFeatures.filter((feature) =>
		matchedFeatures.includes(feature),
	);

	const totalUniqueFeatures = new Set([...originalFeatures, ...matchedFeatures])
		.size;
	const overlapPercentage = (commonFeatures.length / totalUniqueFeatures) * 100;

	// Convert overlap to score
	if (overlapPercentage >= 80) return 95;
	if (overlapPercentage >= 60) return 85;
	if (overlapPercentage >= 40) return 75;
	if (overlapPercentage >= 20) return 65;
	if (overlapPercentage >= 10) return 55;
	return 40;
}

/**
 * Get match quality text based on overall score
 */
export function getMatchQualityText(score: number): string {
	if (score >= 90) return "Excellent";
	if (score >= 80) return "Good";
	if (score >= 70) return "Fair";
	if (score >= 60) return "Basic";
	return "Poor";
}

/**
 * Get match quality color classes based on score
 */
export function getMatchQualityColorClasses(score: number): {
	text: string;
	bg: string;
	border: string;
} {
	if (score >= 90)
		return {
			text: "text-green-700",
			bg: "bg-green-50",
			border: "border-green-200",
		};
	if (score >= 80)
		return {
			text: "text-blue-700",
			bg: "bg-blue-50",
			border: "border-blue-200",
		};
	if (score >= 70)
		return {
			text: "text-yellow-700",
			bg: "bg-yellow-50",
			border: "border-yellow-200",
		};
	if (score >= 60)
		return {
			text: "text-orange-700",
			bg: "bg-orange-50",
			border: "border-orange-200",
		};
	return {
		text: "text-red-700",
		bg: "bg-red-50",
		border: "border-red-200",
	};
}
