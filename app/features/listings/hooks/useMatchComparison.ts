import { useMemo } from "react";
import { calculatePriceScore } from "../services/matchingService";
import type { ConvexListing } from "../types";
import { calculateListingDistance, formatDistance } from "../utils";

interface PriceComparison {
	original: { min: number; max: number };
	match: { min: number; max: number };
	difference: number;
	overlap: boolean;
}

interface PropertyComparison {
	bedrooms: { original: number; match: number; matches: boolean };
	bathrooms: { original: number; match: number; matches: boolean };
	parkingSpaces: { original: number; match: number; matches: boolean };
}

interface FeatureComparison {
	common: string[];
	onlyInOriginal: string[];
	onlyInMatch: string[];
	matchScore: number;
}

interface MatchComparisonResult {
	priceComparison: PriceComparison | null;
	propertyComparison: PropertyComparison;
	featureComparison: FeatureComparison;
	distance: number | null;
	distanceDisplay: string;
}

/**
 * Custom hook to calculate comprehensive comparison data between two listings.
 * Extracts complex business logic from components for better separation of concerns.
 *
 * @param originalListing - The original listing being compared
 * @param matchedListing - The listing being compared against
 * @returns Computed comparison objects for price, property details, features, and distance
 */
export function useMatchComparison(
	originalListing: ConvexListing,
	matchedListing: ConvexListing,
): MatchComparisonResult {
	const result = useMemo(() => {
		// Calculate price comparison using centralized service
		const calculatePriceComparison = (): PriceComparison | null => {
			const originalPrice = {
				min: originalListing.priceMin,
				max: originalListing.priceMax,
			};
			const matchPrice = {
				min: matchedListing.priceMin,
				max: matchedListing.priceMax,
			};

			if (!originalPrice.min && !originalPrice.max) return null;
			if (!matchPrice.min && !matchPrice.max) return null;

			// Use centralized scoring for consistency
			const priceScore = calculatePriceScore(originalListing, matchedListing);

			// Derive overlap from centralized score (score >= 70 indicates good price compatibility)
			const overlap = priceScore >= 70;

			const avgOriginal = (originalPrice.min + originalPrice.max) / 2;
			const avgMatch = (matchPrice.min + matchPrice.max) / 2;
			const difference = Math.abs(avgOriginal - avgMatch);

			return {
				original: originalPrice,
				match: matchPrice,
				difference,
				overlap,
			};
		};

		// Calculate property details comparison
		const calculatePropertyComparison = (): PropertyComparison => {
			return {
				bedrooms: {
					original: originalListing.bedrooms,
					match: matchedListing.bedrooms,
					matches: originalListing.bedrooms === matchedListing.bedrooms,
				},
				bathrooms: {
					original: originalListing.bathrooms,
					match: matchedListing.bathrooms,
					matches: originalListing.bathrooms === matchedListing.bathrooms,
				},
				parkingSpaces: {
					original: originalListing.parking,
					match: matchedListing.parking,
					matches: originalListing.parking === matchedListing.parking,
				},
			};
		};

		// Calculate feature comparison
		const calculateFeatureComparison = (): FeatureComparison => {
			const originalFeatures = originalListing.features || [];
			const matchFeatures = matchedListing.features || [];

			const common = originalFeatures.filter((feature) =>
				matchFeatures.includes(feature),
			);
			const onlyInOriginal = originalFeatures.filter(
				(feature) => !matchFeatures.includes(feature),
			);
			const onlyInMatch = matchFeatures.filter(
				(feature) => !originalFeatures.includes(feature),
			);

			const totalFeatures = originalFeatures.length + matchFeatures.length;
			const matchScore =
				totalFeatures > 0 ? (common.length * 2) / totalFeatures : 0;

			return {
				common,
				onlyInOriginal,
				onlyInMatch,
				matchScore,
			};
		};

		// Calculate distance
		const distance = calculateListingDistance(originalListing, matchedListing);
		const distanceDisplay = distance
			? formatDistance(distance)
			: "Distance unknown";

		return {
			priceComparison: calculatePriceComparison(),
			propertyComparison: calculatePropertyComparison(),
			featureComparison: calculateFeatureComparison(),
			distance,
			distanceDisplay,
		};
	}, [originalListing, matchedListing]);

	return result;
}
