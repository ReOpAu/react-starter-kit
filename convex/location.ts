/*
 * This file is imported by:
 * - app/routes/home.tsx
 * - app/hooks/useEnhancedPlaceSuggestions.ts
 * - app/hooks/useSuburbAutocomplete.ts
 * - app/routes/conv-address.tsx
 */
"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Intent classification types
export type LocationIntent = "suburb" | "street" | "address" | "general";

// Result types for better UI display
export interface PlaceSuggestion {
  placeId: string;
  description: string;
  types: string[];
  matchedSubstrings: Array<{ length: number; offset: number }>;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
    main_text?: string;
    secondary_text?: string;
    main_text_matched_substrings?: Array<{ length: number; offset: number }>;
  };
  resultType: "suburb" | "street" | "address" | "general";
  confidence: number;
  suburb?: string; // 🎯 NEW: Extracted suburb/town from Places API
}

interface GoogleAutocompletePrediction {
  description: string;
  place_id: string;
  types: string[];
}

// 🎯 NEW: Helper function to extract suburb/town from Places API response
function extractSuburbFromPlacesSuggestion(suggestion: PlaceSuggestion): string | undefined {
  console.log(`[Suburb Extraction] Extracting suburb from: "${suggestion.description}"`);
  
  // Method 1 (HIGHEST PRIORITY): If the result is a suburb, the main text is the suburb.
  if (suggestion.resultType === "suburb" && suggestion.structuredFormatting.mainText) {
    const suburb = suggestion.structuredFormatting.mainText.trim();
    console.log(`[Suburb Extraction] Result is suburb type, using mainText: "${suburb}"`);
    return suburb;
  }

  // Method 2: Extract from secondaryText (good for full addresses where suburb is in secondary)
  if (suggestion.structuredFormatting.secondaryText) {
    const secondaryText = suggestion.structuredFormatting.secondaryText;
    const parts = secondaryText.split(',').map(part => part.trim());
    if (parts.length > 0) {
      const firstPart = parts[0];
      const suburb = firstPart
        .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, '')
        .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, '')
        .replace(/\s+\d{4}$/, '')
        .trim();

      if (suburb) {
        console.log(`[Suburb Extraction] Found suburb in secondaryText: "${suburb}"`);
        return suburb;
      }
    }
  }
  
  // Method 3: Fallback to parsing the full description string.
  if (suggestion.description) {
    const parts = suggestion.description.split(',').map(part => part.trim());
    
    let potentialSuburbPart: string | undefined;
    if (suggestion.types.includes('street_address') || suggestion.types.includes('premise')) {
        if (parts.length >= 2) {
            potentialSuburbPart = parts[1];
        }
    } else {
        if (parts.length > 0) {
            potentialSuburbPart = parts[0];
        }
    }

    if (potentialSuburbPart) {
      const suburb = potentialSuburbPart
        .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, '')
        .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, '')
        .replace(/\s+\d{4}$/, '')
        .trim();
        
      if (suburb && suburb.length > 0 && suburb.toLowerCase() !== 'australia') {
        console.log(`[Suburb Extraction] Found suburb in description fallback: "${suburb}"`);
        return suburb;
      }
    }
  }
  
  console.log(`[Suburb Extraction] Could not extract suburb from suggestion`);
  return undefined;
}



// Intent classification helper
function classifyLocationIntent(query: string): LocationIntent {
  const lowerQuery = query.toLowerCase().trim();
  
  // Street indicators
  const streetKeywords = [
    'street', 'st', 'road', 'rd', 'avenue', 'ave', 'lane', 'ln', 'drive', 'dr', 
    'way', 'crescent', 'cres', 'court', 'ct', 'place', 'pl', 'terrace', 'tce',
    'grove', 'close', 'boulevard', 'blvd', 'parade', 'pde', 'circuit', 'cct',
    'walk', 'mews', 'row', 'square', 'sq', 'esplanade', 'esp'
  ];
  
  // Check if query has street type indicator
  const hasStreetType = streetKeywords.some(keyword => {
    // Use word boundaries to avoid false matches like "st" in "west"
    const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, 'i');
    return wordBoundaryRegex.test(lowerQuery);
  });
  
  // Check for house number at the beginning (true address)
  const hasHouseNumber = /^\d+[a-z]?\s+/.test(lowerQuery);
  
  // Check for unit/apartment patterns at the beginning
  const hasUnitNumber = /^(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery);
  
  // 🎯 STRICTER ADDRESS CLASSIFICATION for Two-Step Validation
  // Only classify as "address" if it has BOTH a street number AND street type AND looks complete
  // This ensures we only use Address Validation API for complete street addresses
  if ((hasHouseNumber || hasUnitNumber) && hasStreetType) {
    // Additional check: address should look complete (have suburb/state info)
    // Incomplete addresses like "38 Clive street Wes" should be treated as "street" during autocomplete
    const hasSuburbInfo = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(lowerQuery) ||
                         /\b\d{4}\b/.test(lowerQuery) || // Has postcode
                         lowerQuery.split(',').length >= 2; // Has comma-separated parts (likely includes suburb)
    
    // If it has address components but looks incomplete, treat as street for autocomplete
    if (!hasSuburbInfo && lowerQuery.length < 50) { // Reasonable length check
      console.log(`[Intent Classification] "${query}" has address components but appears incomplete - treating as street for autocomplete`);
      return "street";
    }
    
    return "address";
  }
  
  // Street name pattern (street type but no house number at start)
  // Examples: "Clive street", "Smith Road, Richmond", "Collins St, Melbourne"
  if (hasStreetType && !hasHouseNumber && !hasUnitNumber) {
    return "street";
  }
  
  // Unit/apartment patterns anywhere in the query without street type (fallback to general)
  if (/\b(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery) && !hasStreetType) {
    return "general";
  }
  
  // Check for postcode patterns (4 digits) - these are usually suburbs
  const hasPostcode = /\b\d{4}\b/.test(lowerQuery);
  
  // Check for Australian state abbreviations
  const hasAustralianState = /\b(vic|nsw|qld|wa|sa|tas|nt|act|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(lowerQuery);
  
  // If it has postcode or state but no street indicators, likely a suburb
  if ((hasPostcode || hasAustralianState) && !hasStreetType) {
    return "suburb";
  }
  
  // Suburb patterns (simple text without numbers or street types)
  const isSimpleText = /^[a-z\s\-']+$/i.test(lowerQuery);
  
  // If it's just simple text without street indicators, assume suburb
  if (isSimpleText && !hasStreetType) {
    return "suburb";
  }
  
  return "general";
}

// Enhanced place suggestions function with intent handling
export const getPlaceSuggestions = action({
  args: {
    query: v.string(),
    intent: v.optional(v.union(v.literal("suburb"), v.literal("street"), v.literal("address"), v.literal("general"))),
    maxResults: v.optional(v.number()),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number()
    })),
    radius: v.optional(v.number()),
    isAutocomplete: v.optional(v.boolean()), // NEW: Flag to indicate if this is for autocomplete (vs explicit validation)
    sessionToken: v.optional(v.string()) // NEW: Session token for Google's autocomplete billing optimization
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      suggestions: v.array(v.object({
        placeId: v.string(),
        description: v.string(),
        types: v.array(v.string()),
        matchedSubstrings: v.array(v.object({
          length: v.number(),
          offset: v.number()
        })),
        structuredFormatting: v.object({
          mainText: v.string(),
          secondaryText: v.string(),
          main_text: v.optional(v.string()),
          secondary_text: v.optional(v.string()),
          main_text_matched_substrings: v.optional(v.array(v.object({
            length: v.number(),
            offset: v.number()
          })))
        }),
        resultType: v.union(v.literal("suburb"), v.literal("street"), v.literal("address"), v.literal("general")),
        confidence: v.number(),
        suburb: v.optional(v.string()) // 🎯 NEW: Add suburb field
      })),
      detectedIntent: v.union(v.literal("suburb"), v.literal("street"), v.literal("address"), v.literal("general"))
    }),
    v.object({
      success: v.literal(false),
      error: v.string()
    })
  ),
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      return {
        success: false as const,
        error: "Google Places API key not configured"
      };
    }

    try {
      const query = args.query.trim();
      
      // Prioritize client-provided intent. Only classify on the backend if the client did not provide one.
      const clientIntent = args.intent;
      const detectedIntent = clientIntent && clientIntent !== 'general' 
        ? clientIntent 
        : classifyLocationIntent(query);
      
      const maxResults = args.maxResults || 8;
      
      console.log(`[getPlaceSuggestions] Query: "${query}", Client Intent: ${clientIntent}, Final Intent: ${detectedIntent}`);
      
      // 🎯 NEW: Handle single-word queries that might be suburbs OR streets
      const isSingleWord = !query.includes(' ');
      if (isSingleWord && detectedIntent === "suburb") {
        console.log(`[getPlaceSuggestions] Single word, suburb intent. Trying suburb-first search.`);
        
        // First, try searching for suburbs
        const suburbResult = await getPlacesApiSuggestions(
          query,
          "suburb",
          maxResults,
          apiKey,
          args.location,
          args.radius,
          args.sessionToken
        );

        // If we find suburb results, return them.
        if (suburbResult.success && suburbResult.suggestions.length > 0) {
          console.log(`[getPlaceSuggestions] Found ${suburbResult.suggestions.length} suburb results.`);
          return suburbResult;
        }
        
        // If no suburb results, fall back to searching for streets.
        console.log(`[getPlaceSuggestions] No suburb results found. Falling back to street search.`);
        return await getPlacesApiSuggestions(
          query,
          "street", // Force street intent
          maxResults,
          apiKey,
          args.location,
          args.radius,
          args.sessionToken
        );
      }
      
      // 🎯 NEW TWO-STEP PROCESS - but only for explicit validation, not autocomplete
      if (detectedIntent === "address" && !args.isAutocomplete) {
        console.log(`[getPlaceSuggestions] Using two-step validation for full address`);
        return await validateThenEnrichAddress(query, maxResults, apiKey, args.location);
      }
      
      // During autocomplete, even "address" intent should use Places API for suggestions
      if (detectedIntent === "address" && args.isAutocomplete) {
        console.log(`[getPlaceSuggestions] Autocomplete mode: Using Places API for address suggestions (no validation)`);
        return await getPlacesApiSuggestions(query, detectedIntent, maxResults, apiKey, args.location, args.radius, args.sessionToken);
      }
      
      // For suburbs, streets, general - use Places API directly (no validation needed)
      console.log(`[getPlaceSuggestions] Using Places API directly for intent: ${detectedIntent}`);
      return await getPlacesApiSuggestions(query, detectedIntent, maxResults, apiKey, args.location, args.radius, args.sessionToken);

    } catch (error) {
      console.error('Error in getPlaceSuggestions:', error);
      return {
        success: false as const,
        error: "Failed to fetch place suggestions"
      };
    }
  }
});

// Helper functions
function classifyResultType(types: string[], description: string): "suburb" | "street" | "address" | "general" {
  // Specific address indicators
  if (types.includes('street_address') || types.includes('premise') || /^\d+/.test(description)) {
    return "address";
  }
  
  // Street indicators
  if (types.includes('route') || 
      /\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|crescent|cres|court|ct|place|pl)\b/i.test(description)) {
    return "street";
  }
  
  // Suburb indicators
  if (types.includes('locality') || 
      types.includes('sublocality') || 
      types.includes('administrative_area_level_2')) {
    return "suburb";
  }
  
  return "general";
}

interface GooglePlacePrediction {
  types: string[];
  description: string;
  place_id: string;
  matched_substrings?: Array<{ length: number; offset: number }>;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
    main_text_matched_substrings?: Array<{ length: number; offset: number }>;
  };
}

function calculateConfidence(prediction: GooglePlacePrediction, detectedIntent: LocationIntent, resultType: "suburb" | "street" | "address" | "general"): number {
  let confidence = 0.5; // Base confidence
  
  // Boost confidence for intent match
  if (doesResultMatchIntent(resultType, detectedIntent)) {
    confidence += 0.3;
  }
  
  // Boost for exact type matches
  if ((detectedIntent === "suburb" && prediction.types.includes('locality')) ||
      (detectedIntent === "street" && prediction.types.includes('route')) ||
      (detectedIntent === "address" && prediction.types.includes('street_address'))) {
    confidence += 0.2;
  }
  
  // Penalize establishment types for suburb/street intents
  if ((detectedIntent === "suburb" || detectedIntent === "street") && 
      prediction.types.some((type: string) => type.includes('establishment'))) {
    confidence -= 0.3;
  }
  
  // Boost for Australian addresses
  if (/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|Australia)/.test(prediction.description)) {
    confidence += 0.1;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

function doesResultMatchIntent(resultType: "suburb" | "street" | "address" | "general", intent: LocationIntent): boolean {
  switch (intent) {
    case "suburb":
      return resultType === "suburb";
    case "street":
      return resultType === "street" || resultType === "address";
    case "address":
      return resultType === "address" || resultType === "street";
    case "general":
      return true;
    default:
      return false;
  }
}

function shouldIncludeResult(prediction: GooglePlacePrediction, intent: LocationIntent, strictness: string): boolean {
  const description = prediction.description.toLowerCase();
  const types = prediction.types;
  
  // Always exclude non-Australian results
  if (!/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|Australia)/i.test(prediction.description)) {
    return false;
  }
  
  // Exclude unwanted establishment types - comprehensive list
  const unwantedTypes = [
    // Business establishments
    'establishment', 'point_of_interest', 'store', 'food', 'restaurant',
    'gas_station', 'hospital', 'school', 'shopping_mall', 'university', 
    'bank', 'pharmacy', 'gym', 'beauty_salon', 'car_dealer',
    'real_estate_agency', 'lawyer', 'dentist', 'doctor',
    
    // Tourist attractions and recreational areas
    'tourist_attraction', 'park', 'amusement_park', 'zoo',
    'museum', 'art_gallery', 'aquarium', 'casino',
    
    // Natural features and outdoor recreation
    'natural_feature', 'hiking_area', 'camping_cabin', 'campground',
    'national_park', 'state_park', 'botanical_garden', 'beach',
    'mountain_peak', 'lake', 'river', 'waterfall', 'trail',
    
    // Entertainment and recreation venues
    'movie_theater', 'bowling_alley', 'night_club', 'bar',
    'stadium', 'sports_complex', 'golf_course', 'ski_resort',
    'marina', 'water_park', 'theme_park',
    
    // Transportation
    'transit_station', 'airport', 'bus_station', 'train_station',
    'subway_station',
    
    // Walking tracks, trails, and outdoor paths
    'walking_track', 'hiking_trail', 'nature_trail', 'walking_path',
    'pedestrian_path', 'bike_path', 'cycling_path', 'trail_head',
    
    // Other recreational facilities
    'playground', 'picnic_ground', 'observation_deck', 'lookout',
    'scenic_lookout', 'visitor_center', 'information_center'
  ];
  
  const hasUnwantedType = types.some((type: string) => unwantedTypes.includes(type));
  
  // Exclude unwanted keywords - comprehensive list
  const unwantedKeywords = [
    'tunnel', 'bridge', 'mall', 'centre', 'center', 'station', 'hospital',
    'school', 'university', 'airport', 'port', 'wharf', 'pier', 'marina',
    'golf', 'club', 'hotel', 'motel', 'plaza', 'depot', 'terminal',
    'walk', 'trail', 'track', 'path', 'falls', 'waterfall', 'lookout',
    'reserve', 'park', 'garden', 'beach', 'creek', 'river', 'lake',
    'mountain', 'hill', 'valley', 'gorge', 'scenic', 'viewpoint',
    'camping', 'campground', 'caravan', 'picnic', 'bbq', 'playground'
  ];
  
  const hasUnwantedKeyword = unwantedKeywords.some(keyword => 
    description.includes(keyword)
  );
  
  // Apply strictness-based filtering
  if (strictness === "high") {
    // For suburbs, only allow genuine locality types
    if (intent === "suburb") {
      const isGenuineSuburb = types.some((type: string) => 
        ['locality', 'sublocality', 'administrative_area_level_2'].includes(type)
      );
      return isGenuineSuburb && !hasUnwantedType;
    }
  }
  
  return !hasUnwantedType;
}

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
    })
  ),
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      return {
        success: false as const,
        error: "Google Places API key not configured"
      };
    }

    try {
      const { suburbInput } = args;
      const urls = [
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=address&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=geocode&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=(regions)&components=country:au&key=${apiKey}`
      ];

      const responses = await Promise.all(urls.map(url => fetch(url).then(res => res.json())));
      const [addressData, geocodeData, regionsData] = responses;
      
      console.log('Address-only API Response:', JSON.stringify(addressData, null, 2));

      // Step 2: If we get address results, filter for SUBURB-LEVEL results only
      if (addressData.status === "OK" && addressData.predictions && addressData.predictions.length > 0) {
        const suburbMatch = addressData.predictions.find((prediction: {types: string[], description: string}) => {
          // Only accept suburb-level types (not specific addresses or businesses)
          const isSuburbLevel = prediction.types.some(type => [
            'locality',
            'sublocality',
            'sublocality_level_1',
            'administrative_area_level_2',
            'political'
          ].includes(type));
          
          // Exclude specific addresses, businesses, and establishments
          const isSpecificPlace = prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must contain Australian state
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT contain specific place names (tunnels, bridges, etc.)
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground)\b/i.test(prediction.description);
          
          return isSuburbLevel && !isSpecificPlace && hasAustralianState && !hasSpecificPlaceName;
        });

        if (suburbMatch) {
          return {
            success: true as const,
            canonicalSuburb: suburbMatch.description
          };
        }
      }

      console.log('Geocode API Response:', JSON.stringify(geocodeData, null, 2));

      if (geocodeData.status === "OK" && geocodeData.predictions && geocodeData.predictions.length > 0) {
        // Filter for suburb/locality types only - NO specific places
        const suburbanMatch = geocodeData.predictions.find((prediction: {types: string[], description: string}) => {
          // Must contain locality-related types
          const hasLocalityType = prediction.types.some(type => [
            'locality',
            'sublocality',
            'sublocality_level_1',
            'administrative_area_level_2',
            'political'
          ].includes(type));
          
          // Must NOT contain establishment, business, or specific place types
          const hasBusinessType = prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'shopping_mall',
            'park',
            'tourist_attraction',
            'transit_station',
            'train_station',
            'bus_station',
            'subway_station',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must contain Australian state abbreviation
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT contain specific infrastructure or landmark names
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel)\b/i.test(prediction.description);
          
          // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
          const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);
          
          return hasLocalityType && !hasBusinessType && hasAustralianState && !hasSpecificPlaceName && isSimpleSuburbFormat;
        });

        if (suburbanMatch) {
          return {
            success: true as const,
            canonicalSuburb: suburbanMatch.description
          };
        }
      }

      console.log('Regions API Response:', JSON.stringify(regionsData, null, 2));

      if (regionsData.status === "OK" && regionsData.predictions && regionsData.predictions.length > 0) {
        // Very strict filtering for regions - ONLY genuine suburbs
        const validRegion = regionsData.predictions.find((prediction: {types: string[], description: string}) => {
          // Must be a genuine suburb/locality
          const isGenuineSuburb = prediction.types.some(type => [
            'locality',
            'sublocality',
            'administrative_area_level_2'
          ].includes(type));
          
          // Must contain Australian state
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT be any kind of specific place, business, or establishment
          const isNotBusiness = !prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'shopping_mall',
            'park',
            'tourist_attraction',
            'transit_station',
            'train_station',
            'bus_station',
            'subway_station',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must NOT contain specific infrastructure or landmark names
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(prediction.description);
          
          // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
          const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);
          
          return isGenuineSuburb && hasAustralianState && isNotBusiness && !hasSpecificPlaceName && isSimpleSuburbFormat;
        });

        if (validRegion) {
          return {
            success: true as const,
            canonicalSuburb: validRegion.description
          };
        }
      }

      return {
        success: false as const,
        error: "No valid address, street, or suburb found"
      };

    } catch (error) {
      console.error('Google Places API Error:', error);
      return {
        success: false as const,
        error: "Lookup failed - please try again"
      };
    }
  },
});

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
    })
  ),
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      return {
        success: false as const,
        error: "Google Places API key not configured"
      };
    }

    try {
      const { suburbInput } = args;
      // Step 1: Search for address-related places only (excludes businesses)
      const urls = [
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput
        )}&types=address&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput
        )}&types=geocode&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput
        )}&types=(regions)&components=country:au&key=${apiKey}`
      ];
      
      const [addressData, geocodeData, regionsData] = await Promise.all(
        urls.map(url => fetch(url).then(res => res.json()))
      );

      console.log('Enhanced Address-only API Response:', JSON.stringify(addressData, null, 2));

      // Helper function to get place details including geocode
      const getPlaceDetails = async (placeId: string) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,types&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === "OK" && detailsData.result) {
          return {
            lat: detailsData.result.geometry?.location?.lat || 0,
            lng: detailsData.result.geometry?.location?.lng || 0,
            types: detailsData.result.types || []
          };
        }
        return null;
      };

      // Step 2: If we get address results, filter for SUBURB-LEVEL results only
      if (addressData.status === "OK" && addressData.predictions && addressData.predictions.length > 0) {
        const suburbMatch = addressData.predictions.find((prediction: {types: string[], description: string, place_id: string}) => {
          // Only accept suburb-level types (not specific addresses or businesses)
          const isSuburbLevel = prediction.types.some(type => [
            'locality',
            'sublocality',
            'sublocality_level_1',
            'administrative_area_level_2',
            'political'
          ].includes(type));
          
          // Exclude specific addresses, businesses, and establishments
          const isSpecificPlace = prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must contain Australian state
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT contain specific place names (tunnels, bridges, etc.)
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground)\b/i.test(prediction.description);
          
          return isSuburbLevel && !isSpecificPlace && hasAustralianState && !hasSpecificPlaceName;
        });

        if (suburbMatch) {
          const placeDetails = await getPlaceDetails(suburbMatch.place_id);
          if (placeDetails) {
            return {
              success: true as const,
              canonicalSuburb: suburbMatch.description,
              placeId: suburbMatch.place_id,
              geocode: {
                lat: placeDetails.lat,
                lng: placeDetails.lng
              },
              types: placeDetails.types
            };
          }
        }
      }

      console.log('Enhanced Geocode API Response:', JSON.stringify(geocodeData, null, 2));

      if (geocodeData.status === "OK" && geocodeData.predictions && geocodeData.predictions.length > 0) {
        // Filter for suburb/locality types only - NO specific places
        const suburbanMatch = geocodeData.predictions.find((prediction: {types: string[], description: string, place_id: string}) => {
          // Must contain locality-related types
          const hasLocalityType = prediction.types.some(type => [
            'locality',
            'sublocality',
            'sublocality_level_1',
            'administrative_area_level_2',
            'political'
          ].includes(type));
          
          // Must NOT contain establishment, business, or specific place types
          const hasBusinessType = prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'shopping_mall',
            'park',
            'tourist_attraction',
            'transit_station',
            'train_station',
            'bus_station',
            'subway_station',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must contain Australian state abbreviation
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT contain specific infrastructure or landmark names
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel)\b/i.test(prediction.description);
          
          // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
          const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);
          
          return hasLocalityType && !hasBusinessType && hasAustralianState && !hasSpecificPlaceName && isSimpleSuburbFormat;
        });

        if (suburbanMatch) {
          const placeDetails = await getPlaceDetails(suburbanMatch.place_id);
          if (placeDetails) {
            return {
              success: true as const,
              canonicalSuburb: suburbanMatch.description,
              placeId: suburbanMatch.place_id,
              geocode: {
                lat: placeDetails.lat,
                lng: placeDetails.lng
              },
              types: placeDetails.types
            };
          }
        }
      }

      console.log('Enhanced Regions API Response:', JSON.stringify(regionsData, null, 2));

      if (regionsData.status === "OK" && regionsData.predictions && regionsData.predictions.length > 0) {
        // Very strict filtering for regions - ONLY genuine suburbs
        const validRegion = regionsData.predictions.find((prediction: {types: string[], description: string, place_id: string}) => {
          // Must be a genuine suburb/locality
          const isGenuineSuburb = prediction.types.some(type => [
            'locality',
            'sublocality',
            'administrative_area_level_2'
          ].includes(type));
          
          // Must contain Australian state
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT be any kind of specific place, business, or establishment
          const isNotBusiness = !prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'shopping_mall',
            'park',
            'tourist_attraction',
            'transit_station',
            'train_station',
            'bus_station',
            'subway_station',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must NOT contain specific infrastructure or landmark names
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(prediction.description);
          
          // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
          const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);
          
          return isGenuineSuburb && hasAustralianState && isNotBusiness && !hasSpecificPlaceName && isSimpleSuburbFormat;
        });

        if (validRegion) {
          const placeDetails = await getPlaceDetails(validRegion.place_id);
          if (placeDetails) {
            return {
              success: true as const,
              canonicalSuburb: validRegion.description,
              placeId: validRegion.place_id,
              geocode: {
                lat: placeDetails.lat,
                lng: placeDetails.lng
              },
              types: placeDetails.types
            };
          }
        }
      }

      return {
        success: false as const,
        error: `No valid Australian suburb found for "${args.suburbInput}". Please try a different suburb name or check the spelling.`
      };

    } catch (error) {
      console.error('Enhanced suburb lookup error:', error);
      return {
        success: false as const,
        error: "Failed to lookup suburb - please try again"
      };
    }
  },
});

export const lookupSuburbMultiple = action({
  args: {
    suburbInput: v.string(),
    maxResults: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      results: v.array(v.object({
        canonicalSuburb: v.string(),
        placeId: v.string(),
        geocode: v.object({
          lat: v.number(),
          lng: v.number(),
        }),
        types: v.array(v.string()),
      })),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const { suburbInput, maxResults = 5 } = args;
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    
    if (!apiKey) {
      return {
        success: false as const,
        error: "Google Places API key not configured"
      };
    }

    try {
      // Helper function to get place details including geocode
      const getPlaceDetails = async (placeId: string) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,types&key=${apiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === "OK" && detailsData.result) {
          return {
            lat: detailsData.result.geometry?.location?.lat || 0,
            lng: detailsData.result.geometry?.location?.lng || 0,
            types: detailsData.result.types || []
          };
        }
        return null;
      };

      const allResults: Array<{
        canonicalSuburb: string;
        placeId: string;
        geocode: { lat: number; lng: number };
        types: string[];
      }> = [];

      const urls = [
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=address&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=geocode&components=country:au&key=${apiKey}`,
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(suburbInput)}&types=(regions)&components=country:au&key=${apiKey}`
      ];

      const responses = await Promise.all(urls.map(url => fetch(url).then(res => res.json())));
      const [addressData, geocodeData, regionsData] = responses;
      
      console.log('Multiple Address-only API Response:', JSON.stringify(addressData, null, 2));

      if (addressData.status === "OK" && addressData.predictions) {
        // Filter ALL matching results, not just the first one
        const suburbMatches = addressData.predictions.filter((prediction: {types: string[], description: string, place_id: string}) => {
          // Only accept suburb-level types (not specific addresses or businesses)
          const isSuburbLevel = prediction.types.some(type => [
            'locality',
            'sublocality',
            'sublocality_level_1',
            'administrative_area_level_2',
            'political'
          ].includes(type));
          
          // Exclude specific addresses, businesses, and establishments
          const isSpecificPlace = prediction.types.some(type => [
            'establishment',
            'point_of_interest',
            'store',
            'food',
            'restaurant',
            'gas_station',
            'hospital',
            'school',
            'street_address',
            'route',
            'premise',
            'subpremise'
          ].includes(type));
          
          // Must contain Australian state
          const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
          
          // Must NOT contain specific place names (tunnels, bridges, etc.)
          const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground)\b/i.test(prediction.description);
          
          return isSuburbLevel && !isSpecificPlace && hasAustralianState && !hasSpecificPlaceName;
        });

        // Get details for all matches in parallel
        const detailPromises = suburbMatches
          .slice(0, maxResults)
          .map(async (match: GoogleAutocompletePrediction) => {
            const placeDetails = await getPlaceDetails(match.place_id);
            if (placeDetails) {
              return {
                canonicalSuburb: match.description,
                placeId: match.place_id,
                geocode: {
                  lat: placeDetails.lat,
                  lng: placeDetails.lng
                },
                types: placeDetails.types,
              };
            }
            return null;
          });

        const newResults = (await Promise.all(detailPromises)).filter(
          (result): result is NonNullable<typeof result> => result !== null
        );
        allResults.push(...newResults);
      }

      // Step 2: Search for geocoded locations if we don't have enough results
      if (allResults.length < maxResults) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput
        )}&types=geocode&components=country:au&key=${apiKey}`;

        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        console.log('Multiple Geocode API Response:', JSON.stringify(geocodeData, null, 2));

        if (geocodeData.status === "OK" && geocodeData.predictions) {
          // Filter for suburb/locality types only - NO specific places
          const suburbanMatches = geocodeData.predictions.filter((prediction: {types: string[], description: string, place_id: string}) => {
            // Skip if we already have this place ID
            if (allResults.some(result => result.placeId === prediction.place_id)) {
              return false;
            }

            // Must contain locality-related types
            const hasLocalityType = prediction.types.some(type => [
              'locality',
              'sublocality',
              'sublocality_level_1',
              'administrative_area_level_2',
              'political'
            ].includes(type));
            
            // Must NOT contain establishment, business, or specific place types
            const hasBusinessType = prediction.types.some(type => [
              'establishment',
              'point_of_interest',
              'store',
              'food',
              'restaurant',
              'gas_station',
              'hospital',
              'school',
              'shopping_mall',
              'park',
              'tourist_attraction',
              'transit_station',
              'train_station',
              'bus_station',
              'subway_station',
              'street_address',
              'route',
              'premise',
              'subpremise'
            ].includes(type));
            
            // Must contain Australian state abbreviation
            const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
            
            // Must NOT contain specific infrastructure or landmark names
            const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel)\b/i.test(prediction.description);
            
            // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
            const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);
            
            return hasLocalityType && !hasBusinessType && hasAustralianState && !hasSpecificPlaceName && isSimpleSuburbFormat;
          });

          // Get details for additional matches in parallel
          const detailPromises = suburbanMatches
            .slice(0, maxResults - allResults.length)
            .map(async (match: GoogleAutocompletePrediction) => {
              const placeDetails = await getPlaceDetails(match.place_id);
              if (placeDetails) {
                return {
                  canonicalSuburb: match.description,
                  placeId: match.place_id,
                  geocode: {
                    lat: placeDetails.lat,
                    lng: placeDetails.lng,
                  },
                  types: placeDetails.types,
                };
              }
              return null;
            });
          const newResults = (await Promise.all(detailPromises)).filter(
            (result): result is NonNullable<typeof result> => result !== null
          );
          allResults.push(...newResults);
        }
      }

      // Step 3: Search regions if we still don't have enough results
      if (allResults.length < maxResults) {
        const regionsUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          suburbInput
        )}&types=(regions)&components=country:au&key=${apiKey}`;

        const regionsResponse = await fetch(regionsUrl);
        const regionsData = await regionsResponse.json();

        console.log('Multiple Regions API Response:', JSON.stringify(regionsData, null, 2));

        if (regionsData.status === "OK" && regionsData.predictions) {
          // Very strict filtering for regions - ONLY genuine suburbs
          const validRegions = regionsData.predictions.filter((prediction: {types: string[], description: string, place_id: string}) => {
            // Skip if we already have this place ID
            if (allResults.some(result => result.placeId === prediction.place_id)) {
              return false;
            }

            // Must be a genuine suburb/locality
            const isGenuineSuburb = prediction.types.some(type => [
              'locality',
              'sublocality',
              'administrative_area_level_2'
            ].includes(type));
            
            // Must contain Australian state
            const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);
            
            // Must NOT be any kind of specific place, business, or establishment
            const isNotBusiness = !prediction.types.some(type => [
              'establishment',
              'point_of_interest',
              'store',
              'food',
              'restaurant',
              'gas_station',
              'hospital',
              'school',
              'shopping_mall',
              'park',
              'tourist_attraction',
              'transit_station',
              'train_station',
              'bus_station',
              'subway_station',
              'street_address',
              'route',
              'premise',
              'subpremise'
            ].includes(type));
            
            // Must NOT contain specific infrastructure or landmark names
            const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(prediction.description);
            
            // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
            const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);
            
            return isGenuineSuburb && hasAustralianState && isNotBusiness && !hasSpecificPlaceName && isSimpleSuburbFormat;
          });

          // Get details for remaining matches in parallel
          const detailPromises = validRegions
            .slice(0, maxResults - allResults.length)
            .map(async (match: GoogleAutocompletePrediction) => {
              const placeDetails = await getPlaceDetails(match.place_id);
              if (placeDetails) {
                return {
                  canonicalSuburb: match.description,
                  placeId: match.place_id,
                  geocode: {
                    lat: placeDetails.lat,
                    lng: placeDetails.lng,
                  },
                  types: placeDetails.types,
                };
              }
              return null;
            });
          const newResults = (await Promise.all(detailPromises)).filter(
            (result): result is NonNullable<typeof result> => result !== null
          );
          allResults.push(...newResults);
        }
      }

      if (allResults.length > 0) {
        return {
          success: true as const,
          results: allResults
        };
      }

      return {
        success: false as const,
        error: `No valid Australian suburbs found for "${suburbInput}". Please try a different suburb name or check the spelling.`
      };

    } catch (error) {
      console.error('Multiple suburb lookup error:', error);
      return {
        success: false as const,
        error: "Failed to lookup suburbs - please try again"
      };
    }
  },
});

// Add this interface after the existing interfaces
export interface AddressValidationResult {
  address: {
    formattedAddress: string;
    postalAddress: {
      addressLines: string[];
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
      regionCode: string;
    };
    addressComponents: Array<{
      componentName: {
        text: string;
        languageCode: string;
      };
      componentType: string;
      confirmationLevel: 'CONFIRMED' | 'UNCONFIRMED_BUT_PLAUSIBLE' | 'UNCONFIRMED_AND_SUSPICIOUS';
    }>;
  };
  geocode: {
    location: {
      latitude: number;
      longitude: number;
    };
    plusCode?: {
      globalCode: string;
      compoundCode?: string;
    };
    placeId: string;
  };
  verdict: {
    inputGranularity: 'PREMISE' | 'SUB_PREMISE' | 'ROUTE' | 'LOCALITY' | 'ADMINISTRATIVE_AREA' | 'COUNTRY' | 'OTHER';
    validationGranularity: 'PREMISE' | 'SUB_PREMISE' | 'ROUTE' | 'LOCALITY' | 'ADMINISTRATIVE_AREA' | 'COUNTRY' | 'OTHER';
    geocodeGranularity: 'PREMISE' | 'SUB_PREMISE' | 'ROUTE' | 'LOCALITY' | 'ADMINISTRATIVE_AREA' | 'COUNTRY' | 'OTHER';
    addressComplete: boolean;
    hasUnconfirmedComponents: boolean;
    hasInferredComponents: boolean;
    hasReplacedComponents: boolean;
  };
  uspsData?: {
    standardizedAddress: {
      firstAddressLine: string;
      cityStateZipAddressLine: string;
    };
    deliveryPointCode: string;
    deliveryPointCheckDigit: string;
    dpvConfirmation: 'Y' | 'N' | 'S' | 'D';
    dpvFootnote: string;
    cmra: 'Y' | 'N';
    vacant: 'Y' | 'N';
    pob: 'Y' | 'N';
  };
}

// Add this new action at the end of the file
export const validateAddress = action({
  args: {
    address: v.string(),
    placeId: v.optional(v.string()), // Optional place_id to help validation
    sessionToken: v.optional(v.string()), // Optional for billing
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      isValid: v.boolean(),
      result: v.any(), // Using v.any() as the result structure is complex and defined by Google
      error: v.optional(v.string()),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return { success: false as const, error: 'Google Places API key not configured' };
    }

    try {
      const requestBody: { address: { addressLines: string[] } } = {
        address: {
          addressLines: [args.address],
        },
      };

      const response = await fetch(
        `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[Address Validation] API request failed with status ${response.status}:`,
          errorBody,
        );
        return {
          success: false as const,
          error: `Google API Error: ${response.statusText}`,
        };
      }

      const responseData = await response.json();
      const result = responseData.result;
      const verdict = result.verdict || {};

      // 🎯 CORRECTED: Final, more nuanced validation logic.
      let isValid = true;
      let validationError = '';
      const validationGranularity = verdict.validationGranularity || '';

      // An address is fundamentally invalid if the API says it's not complete.
      if (!verdict.addressComplete) {
        isValid = false;
        validationError =
          'Address is considered incomplete by the validation service.';
      } else {
        // If address is complete, check granularity for high confidence
        const hasHouseNumber = /^\d+/.test(args.address.trim());
        if (hasHouseNumber) {
          // For addresses with house numbers, require PREMISE level validation.
          // PREMISE_PROXIMITY indicates Google is estimating the location, which we reject.
          if (validationGranularity !== 'PREMISE' && validationGranularity !== 'SUB_PREMISE') {
            isValid = false;
            validationError = `Address validation insufficient. Google could not confirm the exact location of the street number. Granularity: ${validationGranularity}.`;
          }
        }
        
        // If still valid, check for any explicitly suspicious components.
        if (isValid && result.address?.addressComponents) {
          for (const component of result.address.addressComponents) {
            if (component.confirmationLevel === 'UNCONFIRMED_AND_SUSPICIOUS') {
              isValid = false;
              validationError = `Address component '${component.componentName?.text}' was suspicious.`;
              break;
            }
          }
        }
      }

      return {
        success: true as const,
        isValid: isValid,
        result,
        error: validationError || undefined,
      };
    } catch (error: any) {
      console.error('[Address Validation] An unexpected error occurred:', error);
      return {
        success: false as const,
        error: `An unexpected error occurred: ${error.message}`,
      };
    }
  },
});

// Helper function for Step 1: Address validation only (returns simple valid/invalid + formatted address)
async function validateAddressOnly(address: string, apiKey: string): Promise<{
  isValid: boolean;
  formattedAddress?: string;
  error?: string;
  placeId?: string;
}> {
  try {
    console.log(`[Address Validation Only] Validating: "${address}"`);
    
    const requestBody = {
      address: {
        regionCode: "AU",
        addressLines: [address]
      },
      enableUspsCass: false
    };

    const response = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      return {
        isValid: false,
        error: `Address Validation API error: ${response.status}`
      };
    }

    const data = await response.json();
    
    if (!data.result || !data.result.address) {
      return {
        isValid: false,
        error: "Address not found or invalid"
      };
    }

    const result = data.result;
    const verdict = result.verdict || {};
    
    const addressComplete = verdict.addressComplete || false;
    const validationGranularity = verdict.validationGranularity || '';
    
    console.log(`[Address Validation Only] Verdict:`, {
      addressComplete,
      validationGranularity
    });

    if (!addressComplete) {
      console.log(`[Address Validation Only] 🚨 REJECTING ADDRESS: "${address}" - Address is considered incomplete by the validation service.`);
      return {
        isValid: false,
        error: 'Address is considered incomplete by the validation service.',
      };
    }
    
    const unacceptableGranularities = ['COUNTRY', 'ADMINISTRATIVE_AREA', 'OTHER'];
    if (unacceptableGranularities.includes(validationGranularity)) {
      return {
        isValid: false,
        error: `Address validation granularity too low: ${validationGranularity} (address is too general)`
      };
    }
    
    const hasHouseNumber = /^\d+/.test(address.trim());
    
    if (hasHouseNumber) {
      if (validationGranularity === 'LOCALITY') {
        return {
          isValid: false,
          error: "House number provided but address only validated to suburb level"
        };
      }
      
       if (validationGranularity !== 'PREMISE' && validationGranularity !== 'SUB_PREMISE') {
         console.log(`[Address Validation Only] 🚨 REJECTING ADDRESS: "${address}" - House number provided but validation granularity is ${validationGranularity} (not exact premise level)`);
         return {
           isValid: false,
           error: `House number validation insufficient - only validated to ${validationGranularity} level (house number location is estimated, not confirmed)`
         };
       }
      
      if (result.address?.addressComponents) {
        for (const component of result.address.addressComponents) {
          if (component.confirmationLevel === 'UNCONFIRMED_AND_SUSPICIOUS') {
            console.log(`[Address Validation Only] 🚨 REJECTING ADDRESS: "${address}" - Contains suspicious component: ${component.componentName?.text}`);
            return {
              isValid: false,
              error: `Address component '${component.componentName?.text}' was suspicious.`
            };
          }
        }
      }
    }
    
    const formattedAddress = result.address.formattedAddress;
    const inputWords = address.toLowerCase().split(/[\s,]+/).filter((w: string) => w.length > 0);
    const outputWords = formattedAddress.toLowerCase().split(/[\s,]+/).filter((w: string) => w.length > 0);
    
    const hasSignificantLocationChange = () => {
      const inputHasSuburb = inputWords.some((w: string) => !w.match(/^\d+$/) && !['st', 'street', 'rd', 'road', 'ave', 'avenue', 'ln', 'lane', 'dr', 'drive'].includes(w));
      const outputHasSuburb = outputWords.some((w: string) => !w.match(/^\d+$/) && !['st', 'street', 'rd', 'road', 'ave', 'avenue', 'ln', 'lane', 'dr', 'drive', 'australia'].includes(w));
      
      if (!inputHasSuburb && outputHasSuburb) {
        console.log(`[Address Validation Only] Input words: [${inputWords.join(', ')}]`);
        console.log(`[Address Validation Only] Output words: [${outputWords.join(', ')}]`);
        return true;
      }
      
      return false;
    };
    
    if (hasSignificantLocationChange()) {
      console.log(`[Address Validation Only] 🚨 REJECTING ADDRESS: "${address}" - Google auto-completed to different location: "${formattedAddress}"`);
      return {
        isValid: false,
        error: "Address appears incomplete - Google auto-completed to a different location. Please provide full address including suburb/city."
      };
    }
    
    console.log(`[Address Validation Only] Address is valid with granularity: ${validationGranularity}, hasHouseNumber: ${hasHouseNumber}`);
    
    return {
      isValid: true,
      formattedAddress: result.address.formattedAddress,
      placeId: result.geocode?.placeId
    };
    
  } catch (error) {
    console.error('[Address Validation Only] Error:', error);
    return {
      isValid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 🎯 NEW: Two-Step Address Validation Process
// Step 1: Validate address exists via Address Validation API
// Step 2: If valid, enrich with suburb names via Places API
async function validateThenEnrichAddress(
  query: string,
  maxResults: number,
  apiKey: string,
  location?: { lat: number; lng: number }
): Promise<{ success: true; suggestions: PlaceSuggestion[]; detectedIntent: LocationIntent } | { success: false; error: string }> {
  
  console.log(`[Two-Step Validation] 🎯 Starting validation and enrichment for: "${query}"`);
  
  // Step 1: Validate the address exists using Address Validation API
  console.log(`[Two-Step Validation] 🔍 Step 1: Calling validateAddressOnly...`);
  const validationResult = await validateAddressOnly(query, apiKey);
  console.log(`[Two-Step Validation] 📋 Step 1 Result:`, validationResult);
  
  if (!validationResult.isValid) {
    console.log(`[Two-Step Validation] Address validation failed: ${validationResult.error}`);
    return {
      success: false,
      error: `Address validation failed: ${validationResult.error || "Address does not exist or is invalid"}`
    };
  }
  
  console.log(`[Two-Step Validation] Address validated successfully. Formatted: "${validationResult.formattedAddress}"`);
  console.log(`[Two-Step Validation] Now enriching with Places API to get suburb names...`);
  
  // Step 2: Get full place details from Places API using the validated address
  // This gives us the suburb names that Address Validation API lacks
  const placesResult = await getPlacesApiSuggestions(
    validationResult.formattedAddress || query, 
    "address", 
    maxResults, 
    apiKey, 
    location
  );
  
  if (placesResult.success) {
    console.log(`[Two-Step Validation] Successfully enriched with ${placesResult.suggestions.length} Places API results`);
    
    // 🎯 NEW: Enhance suggestions with validation confidence boost AND suburb extraction
    const enhancedSuggestions = placesResult.suggestions.map(suggestion => {
      const extractedSuburb = extractSuburbFromPlacesSuggestion(suggestion);
      
      return {
        ...suggestion,
        confidence: Math.min(1, suggestion.confidence + 0.2), // Boost validated addresses
        types: [...suggestion.types, 'address_validated'], // Mark as validated
        resultType: "address" as const, // Ensure address type
        suburb: extractedSuburb // 🎯 NEW: Add extracted suburb
      };
    });
    
    console.log(`[Two-Step Validation] Enhanced ${enhancedSuggestions.length} suggestions with suburb extraction`);
    enhancedSuggestions.forEach((suggestion, index) => {
      if (suggestion.suburb) {
        console.log(`[Two-Step Validation] Suggestion ${index + 1}: "${suggestion.description}" -> Suburb: "${suggestion.suburb}"`);
      }
    });
    
    return {
      success: true,
      suggestions: enhancedSuggestions,
      detectedIntent: "address"
    };
  }
  
  console.log(
    `[Two-Step Validation] Places API enrichment failed: ${
      !placesResult.success ? placesResult.error : "Unknown error"
    }`
  );
  
  // If Places API fails, fall back to just the validation result (without suburb names)
  console.log(`[Two-Step Validation] Falling back to Address Validation API result only`);
  return await getAddressValidationSuggestions(query, maxResults, apiKey, "address", location);
}

// Convert Address Validation API result to PlaceSuggestion format
async function getAddressValidationSuggestions(
  query: string, 
  maxResults: number, 
  apiKey: string,
  actualIntent: LocationIntent,
  location?: { lat: number; lng: number }
): Promise<{ success: true; suggestions: PlaceSuggestion[]; detectedIntent: LocationIntent } | { success: false; error: string }> {
  try {
    console.log(`[Address Validation] Validating address: "${query}" with intent: ${actualIntent}`);
    
    const requestBody = {
      address: {
        regionCode: "AU",
        addressLines: [query]
      },
      enableUspsCass: false
    };

    const response = await fetch(
      `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      throw new Error(`Address validation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      return {
        success: false,
        error: "No validation result returned"
      };
    }

    const result = data.result;
    const suggestions: PlaceSuggestion[] = [];
    
    // Convert validation result to PlaceSuggestion format
    if (result.address?.formattedAddress) {
      const formattedAddress = result.address.formattedAddress;
      const addressParts = formattedAddress.split(',');
      
      // Calculate confidence based on validation verdict
      let confidence = 0.7; // Base confidence for validated address
      
      if (result.verdict?.addressComplete) confidence += 0.2;
      if (!result.verdict?.hasUnconfirmedComponents) confidence += 0.1;
      if (!result.verdict?.hasInferredComponents) confidence += 0.05;
      
      // Boost for high validation granularity
      if (result.verdict?.validationGranularity === 'PREMISE') confidence += 0.15;
      else if (result.verdict?.validationGranularity === 'SUB_PREMISE') confidence += 0.1;
      
      confidence = Math.min(1, confidence);
      
      const suggestion: PlaceSuggestion = {
        placeId: result.geocode?.placeId || `validated_${Date.now()}`,
        description: formattedAddress,
        types: ['street_address', 'validated_address'],
        matchedSubstrings: [],
        structuredFormatting: {
          mainText: addressParts[0]?.trim() || formattedAddress,
          secondaryText: addressParts.slice(1).join(',').trim() || '',
          main_text: addressParts[0]?.trim() || formattedAddress,
          secondary_text: addressParts.slice(1).join(',').trim() || ''
        },
        resultType: "address",
        confidence: confidence
      };
      
      // 🎯 NEW: Extract suburb from validation result
      const extractedSuburb = extractSuburbFromPlacesSuggestion(suggestion);
      suggestion.suburb = extractedSuburb;
      
      suggestions.push(suggestion);
      
      console.log(`[Address Validation] Converted to suggestion:`, suggestion);
    }
    
    return {
      success: true,
      suggestions: suggestions.slice(0, maxResults),
      detectedIntent: actualIntent
    };
    
  } catch (error) {
    console.error('[Address Validation] Error:', error);
    return {
      success: false,
      error: `Address validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Places API logic for suburb/street/general intents
async function getPlacesApiSuggestions(
  query: string,
  actualIntent: LocationIntent,
  maxResults: number,
  apiKey: string,
  location?: { lat: number; lng: number },
  radius?: number,
  sessionToken?: string
): Promise<{ success: true; suggestions: PlaceSuggestion[]; detectedIntent: LocationIntent } | { success: false; error: string }> {
  try {
    console.log(`[Places API] Getting suggestions for intent: ${actualIntent}`);
    
    // Configure API parameters based on intent - SINGLE call approach
    const getApiConfig = (intent: LocationIntent) => {
      switch (intent) {
        case "suburb":
          return {
            types: "(regions)",
            strictness: "high"
          };
        case "street":
          return {
            types: "geocode",
            strictness: "medium"
          };
        case "address":
          return {
            types: "address",
            strictness: "low"
          };
        default:
          return {
            types: "geocode",
            strictness: "medium"
          };
      }
    };

    const config = getApiConfig(actualIntent);
    const suggestions: PlaceSuggestion[] = [];
    
    // Location bias parameters
    let locationParam = "";
    if (location) {
      locationParam = `&location=${location.lat},${location.lng}`;
      if (radius) {
        locationParam += `&radius=${radius}`;
      }
    }

    // Build session token parameter for Google's billing optimization
    const sessionParam = sessionToken ? `&sessiontoken=${sessionToken}` : '';
    
    // Single consolidated API call to prevent duplicates
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=${config.types}&components=country:au${locationParam}${sessionParam}&key=${apiKey}`;
    
    console.log(`[Places API] Single call with types: ${config.types} for intent: ${actualIntent}${sessionToken ? ' with session token' : ''}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === "OK" && data.predictions) {
      for (const prediction of data.predictions) {
        const resultType = classifyResultType(prediction.types, prediction.description);
        const confidence = calculateConfidence(prediction, actualIntent, resultType);
        
        // Apply filtering based on intent and strictness
        if (shouldIncludeResult(prediction, actualIntent, config.strictness)) {
          const tempSuggestion: PlaceSuggestion = {
            placeId: prediction.place_id,
            description: prediction.description,
            types: prediction.types,
            matchedSubstrings: prediction.matched_substrings || [],
            structuredFormatting: {
              mainText: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
              secondaryText: prediction.structured_formatting?.secondary_text || prediction.description.split(',').slice(1).join(',').trim(),
              main_text: prediction.structured_formatting?.main_text,
              secondary_text: prediction.structured_formatting?.secondary_text,
              main_text_matched_substrings: prediction.structured_formatting?.main_text_matched_substrings
            },
            resultType,
            confidence
          };
          
          // Extract suburb for all suggestions
          const extractedSuburb = extractSuburbFromPlacesSuggestion(tempSuggestion);
          
          suggestions.push({
            ...tempSuggestion,
            suburb: extractedSuburb
          });
          
          // Stop when we have enough results
          if (suggestions.length >= maxResults) {
            break;
          }
        }
      }
    } else {
      console.log(`[Places API] No results or error: ${data.status}`);
    }
    
    // Sort by intent match priority and confidence
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        // First, prioritize by intent match
        const aMatchesIntent = doesResultMatchIntent(a.resultType, actualIntent);
        const bMatchesIntent = doesResultMatchIntent(b.resultType, actualIntent);
        
        if (aMatchesIntent && !bMatchesIntent) return -1;
        if (!aMatchesIntent && bMatchesIntent) return 1;
        
        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, maxResults);

    return {
      success: true,
      suggestions: sortedSuggestions,
      detectedIntent: actualIntent
    };
    
  } catch (error) {
    console.error('[Places API] Error:', error);
    return {
      success: false,
      error: `Places API failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Helper to determine if a prediction is a valid suburb
function isValidSuburbPrediction(prediction: { types: string[]; description: string }): boolean {
  // Only accept suburb-level types (not specific addresses or businesses)
  const isSuburbLevel = prediction.types.some(type => [
    'locality',
    'sublocality',
    'sublocality_level_1',
    'administrative_area_level_2',
    'political'
  ].includes(type));

  // Exclude specific addresses, businesses, and establishments
  const isSpecificPlace = prediction.types.some(type => [
    'establishment',
    'point_of_interest',
    'store',
    'food',
    'restaurant',
    'gas_station',
    'hospital',
    'school',
    'street_address',
    'route',
    'premise',
    'subpremise'
  ].includes(type));

  // Must contain Australian state
  const hasAustralianState = /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\b/i.test(prediction.description);

  // Must NOT contain specific place names (tunnels, bridges, etc.)
  const hasSpecificPlaceName = /\b(tunnel|bridge|station|mall|centre|center|park|reserve|oval|ground|hospital|school|university|airport|port|wharf|pier|marina|golf|club|hotel|motel|plaza|square|gardens|depot|terminal|junction)\b/i.test(prediction.description);

  // Must be a simple suburb format (e.g., "Richmond VIC, Australia")
  const isSimpleSuburbFormat = /^[A-Za-z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT),?\s*Australia?$/i.test(prediction.description);

  return isSuburbLevel && !isSpecificPlace && hasAustralianState && !hasSpecificPlaceName && isSimpleSuburbFormat;
}
