import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Listing, BuyerListing, SellerListing } from "../app/features/listings/types";
import { getSearchGeohashes } from "./geohashUtils";

const MATCHING_CONFIG = {
  weights: {
    location: 30,
    buildingType: 25,
    price: 20,
    propertyDetails: 15,
    features: 10,
  } as const,
  featureWeights: {
    mustHave: 1.0,
    niceToHave: 0.4,
  },
  propertyDetailWeights: {
    bedrooms: 0.4,
    bathrooms: 0.3,
    parkingSpaces: 0.3,
  },
  propertyDetailMismatchPenalty: 25,
};

type ScoreKey = keyof typeof MATCHING_CONFIG.weights;

function calculateMatchScore(listingA: Listing, listingB: Listing) {
  const buyer = listingA.listingType === 'buyer' ? listingA : listingB;
  const seller = listingA.listingType === 'seller' ? listingA : listingB;
  const breakdown: Record<ScoreKey, number> = {
    location: 0,
    buildingType: 0,
    price: 0,
    propertyDetails: 0,
    features: 0,
  };

  breakdown.location = scoreLocation(buyer, seller);
  breakdown.buildingType = scoreBuildingType(buyer, seller);
  breakdown.price = scorePrice(buyer, seller);
  breakdown.propertyDetails = scorePropertyDetails(buyer, seller);
  breakdown.features = scoreFeatures(buyer, seller);

  let totalScore = 0;
  let totalWeight = 0;
  for (const key of Object.keys(MATCHING_CONFIG.weights) as ScoreKey[]) {
    totalScore += breakdown[key] * MATCHING_CONFIG.weights[key];
    totalWeight += MATCHING_CONFIG.weights[key];
  }
  const finalScore = Math.round(totalScore / totalWeight);
  return { score: finalScore, breakdown };
}

function scoreBuildingType(buyer: Listing, seller: Listing) {
  return buyer.buildingType === seller.buildingType ? 100 : 0;
}

function scorePrice(buyer: Listing, seller: Listing) {
  if (!buyer.pricePreference || !seller.price) return 0;
  const bMin = buyer.pricePreference.min;
  const bMax = buyer.pricePreference.max;
  const sMin = seller.price.min;
  const sMax = seller.price.max;
  if (bMax < sMin || sMax < bMin) return 0;
  return 100;
}

function scorePropertyDetails(buyer: Listing, seller: Listing) {
  const weights = MATCHING_CONFIG.propertyDetailWeights;
  let score = 0;
  let total = 0;
  for (const key of Object.keys(weights) as (keyof typeof weights)[]) {
    const diff = Math.abs(buyer.propertyDetails[key] - seller.propertyDetails[key]);
    const subScore = Math.max(0, 100 - (diff * MATCHING_CONFIG.propertyDetailMismatchPenalty));
    score += subScore * weights[key];
    total += weights[key];
  }
  return total ? score / total : 100;
}

function scoreFeatures(buyer: Listing, seller: Listing) {
  const must = buyer.mustHaveFeatures || [];
  const nice = buyer.niceToHaveFeatures || [];
  const sellerFeatures = seller.features || [];
  if (must.length && !must.every(f => sellerFeatures.includes(f))) return 0;
  const mustHaveScore = must.length ? (must.filter(f => sellerFeatures.includes(f)).length / must.length) * 100 : 100;
  const niceToHaveScore = nice.length ? (nice.filter(f => sellerFeatures.includes(f)).length / nice.length) * 100 : 100;
  return (mustHaveScore * MATCHING_CONFIG.featureWeights.mustHave + niceToHaveScore * MATCHING_CONFIG.featureWeights.niceToHave) /
    (MATCHING_CONFIG.featureWeights.mustHave + MATCHING_CONFIG.featureWeights.niceToHave);
}

function scoreLocation(buyer: Listing, seller: Listing) {
  // Perfect score for suburb buyers in the same suburb
  if (buyer.subtype === "suburb" && buyer.suburb === seller.suburb) return 100;
  
  const dist = haversine(buyer.latitude, buyer.longitude, seller.latitude, seller.longitude);
  
  // For street buyers with radius, use radius-based scoring
  const buyerRadiusKm = (buyer as any).radiusKm;
  if (buyer.subtype === "street" && buyerRadiusKm) {
    if (dist <= buyerRadiusKm) {
      // Score within radius: 100% at center, decreasing to 60% at radius edge
      const distanceRatio = dist / buyerRadiusKm;
      return Math.max(60, Math.round(100 - (distanceRatio * 40)));
    } else {
      // Outside radius: very low score based on overage
      const overageRatio = Math.min(1, (dist - buyerRadiusKm) / buyerRadiusKm);
      return Math.max(0, Math.round(60 - (overageRatio * 60)));
    }
  }
  
  // Default distance-based scoring (legacy behavior)
  return Math.max(0, 100 - (dist * 20));
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export const findMatches = query({
  args: {
    listingId: v.id("listings"),
    options: v.optional(v.object({
      minScore: v.optional(v.number()),
      limit: v.optional(v.number()),
      includeScoreBreakdown: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, { listingId, options }) => {
    const originalListing = await ctx.db.get(listingId);
    if (!originalListing) throw new Error("Original listing not found");
    const counterpartType = originalListing.listingType === "seller" ? "buyer" : "seller";
    
    // ENFORCE STATE BOUNDARIES - Only match within the same state/territory
    const allowedStates = [originalListing.state.toLowerCase()];
    
    // Get all listings of the counterpart type in the same state
    let candidates = await ctx.db
      .query("listings")
      .withIndex("by_listingType", q => q.eq("listingType", counterpartType))
      .collect();
    
    // STRICT STATE BOUNDARY ENFORCEMENT
    candidates = candidates.filter(listing => 
      allowedStates.includes(listing.state.toLowerCase())
    );
    
    // GEOGRAPHIC FILTERING BASED ON LISTING SUBTYPES
    if (originalListing.geohash) {
      // Get proper geohash neighbors using legacy algorithm (5x5 grid)
      const searchGeohashes = getSearchGeohashes(originalListing.geohash, 5);
      
      candidates = candidates.filter(listing => {
        // RULE 1: Always include exact suburb matches regardless of subtype
        if (listing.suburb.toLowerCase() === originalListing.suburb.toLowerCase()) {
          return true;
        }
        
        // RULE 2: For suburb listings, ONLY allow exact suburb matches (no geohash expansion)
        if (originalListing.subtype === "suburb" || listing.subtype === "suburb") {
          return false; // Already checked exact suburb match above, so exclude
        }
        
        // RULE 3: For street listings, allow geohash neighborhood matching with radius constraints
        if (originalListing.subtype === "street" && listing.subtype === "street" && listing.geohash) {
          const isInGeohashNeighborhood = searchGeohashes.some(searchHash => 
            listing.geohash.startsWith(searchHash.substring(0, 5))
          );
          
          if (!isInGeohashNeighborhood) return false;
          
          // If original listing is a street buyer with radius, check distance constraint
          const originalRadiusKm = (originalListing as any).radiusKm;
          if (originalListing.listingType === "buyer" && originalRadiusKm) {
            if (originalListing.latitude && originalListing.longitude && listing.latitude && listing.longitude) {
              const distance = haversine(
                originalListing.latitude, originalListing.longitude,
                listing.latitude, listing.longitude
              );
              return distance <= originalRadiusKm;
            }
            // If coordinates missing, fall back to geohash neighborhood
            return isInGeohashNeighborhood;
          }
          
          // If candidate is a street buyer with radius, check their constraint
          const candidateRadiusKm = (listing as any).radiusKm;
          if (listing.listingType === "buyer" && candidateRadiusKm) {
            if (listing.latitude && listing.longitude && originalListing.latitude && originalListing.longitude) {
              const distance = haversine(
                listing.latitude, listing.longitude,
                originalListing.latitude, originalListing.longitude
              );
              return distance <= candidateRadiusKm;
            }
            // If coordinates missing, fall back to geohash neighborhood
            return isInGeohashNeighborhood;
          }
          
          return isInGeohashNeighborhood;
        }
        
        return false;
      });
    } else {
      // Fallback to suburb-only matching if no geohash
      candidates = candidates.filter(listing => 
        listing.suburb.toLowerCase() === originalListing.suburb.toLowerCase()
      );
    }
    let scoredMatches = [];
    for (const candidate of candidates) {
      const { score, breakdown } = calculateMatchScore(originalListing as Listing, candidate as Listing);
      scoredMatches.push({
        listing: candidate,
        score,
        breakdown: options?.includeScoreBreakdown ? breakdown : undefined,
      });
    }
    scoredMatches = scoredMatches.filter(match => match.score >= (options?.minScore || 0));
    scoredMatches.sort((a, b) => b.score - a.score);
    if (options?.limit) scoredMatches = scoredMatches.slice(0, options.limit);
    return scoredMatches;
  },
});

/**
 * Get match details for two specific listings
 * This is more efficient than fetching all matches and filtering client-side
 */
export const getMatchDetails = query({
  args: {
    originalListingId: v.id("listings"),
    matchedListingId: v.id("listings"),
    includeScoreBreakdown: v.optional(v.boolean()),
  },
  handler: async (ctx, { originalListingId, matchedListingId, includeScoreBreakdown = false }) => {
    // Fetch both listings
    const [originalListing, matchedListing] = await Promise.all([
      ctx.db.get(originalListingId),
      ctx.db.get(matchedListingId),
    ]);

    if (!originalListing) {
      throw new Error("Original listing not found");
    }
    
    if (!matchedListing) {
      throw new Error("Matched listing not found");
    }

    // Calculate match score and breakdown
    const { score, breakdown } = calculateMatchScore(originalListing as any, matchedListing as any);
    
    return {
      originalListing,
      matchedListing,
      score,
      breakdown: includeScoreBreakdown ? breakdown : undefined,
      distance: originalListing.latitude && originalListing.longitude && 
                matchedListing.latitude && matchedListing.longitude
        ? haversine(
            originalListing.latitude, 
            originalListing.longitude,
            matchedListing.latitude, 
            matchedListing.longitude
          )
        : undefined,
    };
  },
}); 