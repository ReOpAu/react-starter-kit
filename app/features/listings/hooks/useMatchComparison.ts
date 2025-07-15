import { useMemo } from "react";
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
	matchedListing: ConvexListing
): MatchComparisonResult {
	const result = useMemo(() => {
		// Calculate price comparison
		const calculatePriceComparison = (): PriceComparison | null => {
			const originalPrice = originalListing.price || originalListing.pricePreference;
			const matchPrice = matchedListing.price || matchedListing.pricePreference;

			if (!originalPrice || !matchPrice) return null;

			const overlap = originalPrice.max >= matchPrice.min && matchPrice.max >= originalPrice.min;
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
					original: originalListing.propertyDetails.bedrooms,
					match: matchedListing.propertyDetails.bedrooms,
					matches: originalListing.propertyDetails.bedrooms === matchedListing.propertyDetails.bedrooms,
				},
				bathrooms: {
					original: originalListing.propertyDetails.bathrooms,
					match: matchedListing.propertyDetails.bathrooms,
					matches: originalListing.propertyDetails.bathrooms === matchedListing.propertyDetails.bathrooms,
				},
				parkingSpaces: {
					original: originalListing.propertyDetails.parkingSpaces,
					match: matchedListing.propertyDetails.parkingSpaces,
					matches: originalListing.propertyDetails.parkingSpaces === matchedListing.propertyDetails.parkingSpaces,
				},
			};
		};

		// Calculate feature comparison
		const calculateFeatureComparison = (): FeatureComparison => {
			const originalFeatures = originalListing.features || [];
			const matchFeatures = matchedListing.features || [];

			const common = originalFeatures.filter(feature => matchFeatures.includes(feature));
			const onlyInOriginal = originalFeatures.filter(feature => !matchFeatures.includes(feature));
			const onlyInMatch = matchFeatures.filter(feature => !originalFeatures.includes(feature));

			const totalFeatures = originalFeatures.length + matchFeatures.length;
			const matchScore = totalFeatures > 0 ? (common.length * 2) / totalFeatures : 0;

			return {
				common,
				onlyInOriginal,
				onlyInMatch,
				matchScore,
			};
		};

		// Calculate distance
		const distance = calculateListingDistance(originalListing, matchedListing);
		const distanceDisplay = distance ? formatDistance(distance) : "Distance unknown";

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