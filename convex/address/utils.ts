// Shared helpers for address-related Convex actions
// (Moved from location.ts)

import type { PlaceSuggestion, LocationIntent } from "./types";

// --- classifyLocationIntent ---
export function classifyLocationIntent(query: string): LocationIntent {
  const lowerQuery = query.toLowerCase().trim();
  const streetKeywords = [
    "street","st","road","rd","avenue","ave","lane","ln","drive","dr","way","crescent","cres","court","ct","place","pl","terrace","tce","grove","close","boulevard","blvd","parade","pde","circuit","cct","walk","mews","row","square","sq","esplanade","esp",
  ];
  const hasStreetType = streetKeywords.some((keyword) => {
    const wordBoundaryRegex = new RegExp(`\\b${keyword}\\b`, "i");
    return wordBoundaryRegex.test(lowerQuery);
  });
  const hasHouseNumber = /^\d+[a-z]?\s+/.test(lowerQuery);
  const hasUnitNumber = /^(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery);
  if ((hasHouseNumber || hasUnitNumber) && hasStreetType) {
    const hasSuburbInfo =
      /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(lowerQuery) ||
      /\b\d{4}\b/.test(lowerQuery) ||
      lowerQuery.split(",").length >= 2;
    if (!hasSuburbInfo && lowerQuery.length < 50) {
      return "street";
    }
    return "address";
  }
  if (hasStreetType && !hasHouseNumber && !hasUnitNumber) {
    return "street";
  }
  if (/(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery) && !hasStreetType) {
    return "general";
  }
  const hasPostcode = /\b\d{4}\b/.test(lowerQuery);
  const hasAustralianState = /\b(vic|nsw|qld|wa|sa|tas|nt|act|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(lowerQuery);
  if ((hasPostcode || hasAustralianState) && !hasStreetType) {
    return "suburb";
  }
  const isSimpleText = /^[a-z\s\-']+$/i.test(lowerQuery);
  if (isSimpleText && !hasStreetType) {
    return "suburb";
  }
  const ruralKeywords = ["hwy","highway","rd","road","lane","track","station","farm","mount","creek","way","drive","dr","ln","springmount"];
  const ruralKeywordRegexes = ruralKeywords.map((keyword) => new RegExp(`\\b${keyword}\\b`, "i"));
  const hasRuralType = ruralKeywordRegexes.some((regex) => regex.test(lowerQuery));
  if ((hasHouseNumber || hasUnitNumber) && (hasStreetType || hasRuralType)) {
    const hasSuburbInfo =
      /\b(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(lowerQuery) ||
      /\b\d{4}\b/.test(lowerQuery) ||
      lowerQuery.split(",").length >= 2;
    if (!hasSuburbInfo && lowerQuery.length < 50) {
      return "street";
    }
    return "address";
  }
  return "general";
}

// Helper to clean suburb strings
function cleanSuburbString(str: string): string {
  return str
    .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, "")
    .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, "")
    .replace(/\s+\d{4}$/, "")
    .trim();
}

// --- extractSuburbFromPlacesSuggestion ---
export function extractSuburbFromPlacesSuggestion(suggestion: PlaceSuggestion): string | undefined {
  if (
    suggestion.resultType === "suburb" &&
    suggestion.structuredFormatting.mainText
  ) {
    return suggestion.structuredFormatting.mainText.trim();
  }
  if (suggestion.structuredFormatting.secondaryText) {
    const secondaryText = suggestion.structuredFormatting.secondaryText;
    const parts = secondaryText.split(",").map((part) => part.trim());
    if (parts.length > 0) {
      const firstPart = parts[0];
      const suburb = cleanSuburbString(firstPart);
      if (suburb) {
        return suburb;
      }
    }
  }
  if (suggestion.description) {
    const parts = suggestion.description.split(",").map((part) => part.trim());
    let potentialSuburbPart: string | undefined;
    if (
      suggestion.types.includes("street_address") ||
      suggestion.types.includes("premise")
    ) {
      if (parts.length >= 2) {
        potentialSuburbPart = parts[1];
      }
    } else {
      if (parts.length > 0) {
        potentialSuburbPart = parts[0];
      }
    }
    if (potentialSuburbPart) {
      const suburb = cleanSuburbString(potentialSuburbPart);
      if (suburb && suburb.length > 0 && suburb.toLowerCase() !== "australia") {
        return suburb;
      }
    }
  }
  return undefined;
}

// --- getPlacesApiSuggestions ---
function classifyResultType(
  types: string[],
  description: string,
): "suburb" | "street" | "address" | "general" {
  if (
    types.includes("street_address") ||
    types.includes("premise") ||
    /^\d+/.test(description)
  ) {
    return "address";
  }
  if (
    types.includes("route") ||
    /\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|crescent|cres|court|ct|place|pl)\b/i.test(description)
  ) {
    return "street";
  }
  if (
    types.includes("locality") ||
    types.includes("sublocality") ||
    types.includes("administrative_area_level_2")
  ) {
    return "suburb";
  }
  return "general";
}

function calculateConfidence(
  prediction: any,
  detectedIntent: LocationIntent,
  resultType: "suburb" | "street" | "address" | "general",
): number {
  let confidence = 0.5;
  if (doesResultMatchIntent(resultType, detectedIntent)) {
    confidence += 0.3;
  }
  if (
    (detectedIntent === "suburb" && prediction.types.includes("locality")) ||
    (detectedIntent === "street" && prediction.types.includes("route")) ||
    (detectedIntent === "address" && prediction.types.includes("street_address"))
  ) {
    confidence += 0.2;
  }
  if (
    (detectedIntent === "suburb" || detectedIntent === "street") &&
    prediction.types.some((type: string) => type.includes("establishment"))
  ) {
    confidence -= 0.3;
  }
  if (/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|Australia)/.test(prediction.description)) {
    confidence += 0.1;
  }
  return Math.max(0, Math.min(1, confidence));
}

function doesResultMatchIntent(
  resultType: "suburb" | "street" | "address" | "general",
  intent: LocationIntent,
): boolean {
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

function shouldIncludeResult(
  prediction: any,
  intent: LocationIntent,
  strictness: string,
): boolean {
  const description = prediction.description.toLowerCase();
  const types = prediction.types;
  if (!/(VIC|NSW|QLD|WA|SA|TAS|NT|ACT|Australia)/i.test(prediction.description)) {
    return false;
  }
  const unwantedTypes = [
    "establishment","point_of_interest","store","food","restaurant","gas_station","hospital","school","shopping_mall","university","bank","pharmacy","gym","beauty_salon","car_dealer","real_estate_agency","lawyer","dentist","doctor","tourist_attraction","park","amusement_park","zoo","museum","art_gallery","aquarium","casino","natural_feature","hiking_area","camping_cabin","campground","national_park","state_park","botanical_garden","beach","mountain_peak","lake","river","waterfall","trail","movie_theater","bowling_alley","night_club","bar","stadium","sports_complex","golf_course","ski_resort","marina","water_park","theme_park","transit_station","airport","bus_station","train_station","subway_station","walking_track","hiking_trail","nature_trail","walking_path","pedestrian_path","bike_path","cycling_path","trail_head","playground","picnic_ground","observation_deck","lookout","scenic_lookout","visitor_center","information_center",
  ];
  const hasUnwantedType = types.some((type: string) => unwantedTypes.includes(type));
  const unwantedKeywords = [
    "tunnel","bridge","mall","centre","center","station","hospital","school","university","airport","port","wharf","pier","marina","golf","club","hotel","motel","plaza","depot","terminal","walk","trail","track","path","falls","waterfall","lookout","reserve","park","garden","beach","creek","river","lake","mountain","hill","valley","gorge","scenic","viewpoint","camping","campground","caravan","picnic","bbq","playground",
  ];
  const hasUnwantedKeyword = unwantedKeywords.some((keyword) => description.includes(keyword));
  if (strictness === "high") {
    if (intent === "suburb") {
      const isGenuineSuburb = types.some((type: string) => ["locality", "sublocality", "administrative_area_level_2"].includes(type));
      return isGenuineSuburb && !hasUnwantedType;
    }
  }
  return !hasUnwantedType;
}

export async function getPlacesApiSuggestions(
  query: string,
  actualIntent: LocationIntent,
  maxResults: number,
  apiKey: string,
  location?: { lat: number; lng: number },
  radius?: number,
  sessionToken?: string,
): Promise<
  | {
      success: true;
      suggestions: PlaceSuggestion[];
      detectedIntent: LocationIntent;
    }
  | { success: false; error: string }
> {
  const getApiConfig = (intent: LocationIntent) => {
    switch (intent) {
      case "suburb":
        return { types: "(regions)", strictness: "high" };
      case "street":
        return { types: "geocode", strictness: "medium" };
      case "address":
        return { types: "address", strictness: "low" };
      default:
        return { types: "geocode", strictness: "medium" };
    }
  };
  const config = getApiConfig(actualIntent);
  const suggestions: PlaceSuggestion[] = [];
  let locationParam = "";
  if (location) {
    locationParam = `&location=${location.lat},${location.lng}`;
    if (radius) {
      locationParam += `&radius=${radius}`;
    }
  }
  const sessionParam = sessionToken ? `&sessiontoken=${sessionToken}` : "";
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=${config.types}&components=country:au${locationParam}${sessionParam}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.status === "OK" && data.predictions) {
    for (const prediction of data.predictions) {
      const resultType = classifyResultType(
        prediction.types,
        prediction.description,
      );
      const confidence = calculateConfidence(
        prediction,
        actualIntent,
        resultType,
      );
      if (shouldIncludeResult(prediction, actualIntent, config.strictness)) {
        const tempSuggestion: PlaceSuggestion = {
          placeId: prediction.place_id,
          description: prediction.description,
          types: prediction.types,
          matchedSubstrings: prediction.matched_substrings || [],
          structuredFormatting: {
            mainText:
              prediction.structured_formatting?.main_text ||
              prediction.description.split(",")[0],
            secondaryText:
              prediction.structured_formatting?.secondary_text ||
              prediction.description.split(",").slice(1).join(",").trim(),
            main_text: prediction.structured_formatting?.main_text,
            secondary_text: prediction.structured_formatting?.secondary_text,
            main_text_matched_substrings:
              prediction.structured_formatting?.main_text_matched_substrings,
          },
          resultType,
          confidence,
        };
        const extractedSuburb = extractSuburbFromPlacesSuggestion(tempSuggestion);
        suggestions.push({
          ...tempSuggestion,
          suburb: extractedSuburb,
        });
        if (suggestions.length >= maxResults) {
          break;
        }
      }
    }
  }
  const sortedSuggestions = suggestions
    .sort((a, b) => {
      const aMatchesIntent = doesResultMatchIntent(
        a.resultType,
        actualIntent,
      );
      const bMatchesIntent = doesResultMatchIntent(
        b.resultType,
        actualIntent,
      );
      if (aMatchesIntent && !bMatchesIntent) return -1;
      if (!aMatchesIntent && bMatchesIntent) return 1;
      return b.confidence - a.confidence;
    })
    .slice(0, maxResults);

  // STRICT FILTERING: Only include results matching intent, unless intent is 'general'
  const strictlyFiltered = actualIntent !== "general"
    ? sortedSuggestions.filter(s => s.resultType === actualIntent)
    : sortedSuggestions;

  // --- STRICT SUBURB FILTERING FOR SINGLE-WORD QUERIES ---
  // See UNIFIED_ADDRESS_SYSTEM.md and state-management-strategy.md for rationale.
  const isSingleWord = !query.includes(" ");
  if (actualIntent === "suburb" && isSingleWord) {
    const suburbOrLocality = strictlyFiltered.filter(
      s => s.resultType === "suburb" || s.types.includes("locality")
    );
    if (suburbOrLocality.length > 0) {
      return {
        success: true,
        suggestions: suburbOrLocality,
        detectedIntent: actualIntent,
      };
    } else {
      return {
        success: false,
        error: "No suburb or locality found for this query.",
      };
    }
  }

  return {
    success: true,
    suggestions: strictlyFiltered,
    detectedIntent: actualIntent,
  };
}

// --- validateThenEnrichAddress ---
async function validateAddressOnly(
  address: string,
  apiKey: string,
): Promise<{
  isValid: boolean;
  formattedAddress?: string;
  error?: string;
  placeId?: string;
  isRuralException?: boolean;
  validationGranularity?: string;
}> {
  const requestBody = {
    address: {
      regionCode: "AU",
      addressLines: [address],
    },
    enableUspsCass: false,
  };
  const response = await fetch(
    `https://addressvalidation.googleapis.com/v1:validateAddress?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );
  if (!response.ok) {
    return {
      isValid: false,
      error: `Address Validation API error: ${response.status}`,
    };
  }
  const data = await response.json();
  if (!data.result || !data.result.address) {
    return {
      isValid: false,
      error: "Address not found or invalid",
    };
  }
  const result = data.result;
  const verdict = result.verdict || {};
  const addressComplete = verdict.addressComplete || false;
  const validationGranularity = verdict.validationGranularity || "";
  if (!addressComplete) {
    return {
      isValid: false,
      error: "Address is considered incomplete by the validation service.",
      isRuralException: true,
      validationGranularity,
      formattedAddress: result.address?.formattedAddress,
      placeId: result.geocode?.placeId || "",
    };
  }
  const unacceptableGranularities = [
    "COUNTRY",
    "ADMINISTRATIVE_AREA",
    "OTHER",
  ];
  if (unacceptableGranularities.includes(validationGranularity)) {
    return {
      isValid: false,
      error: `Address validation granularity too low: ${validationGranularity} (address is too general)`,
    };
  }
  const hasHouseNumber = /^\d+/.test(address.trim());
  function addressLooksRural(address: string): boolean {
    return /hwy|highway|rd|road|lane|track|springmount|mount|creek|farm|station/i.test(address);
  }
  if (hasHouseNumber) {
    if (
      (validationGranularity === "ROUTE" ||
        validationGranularity === "LOCALITY") &&
      addressLooksRural(address)
    ) {
      return {
        isValid: false,
        error:
          "This address could not be confirmed at the property level, but appears to be a rural address. You may allow the user to confirm this manually.",
        isRuralException: true,
        validationGranularity,
        formattedAddress: result.address?.formattedAddress,
        placeId: result.geocode?.placeId || "",
      };
    }
    if (validationGranularity === "LOCALITY") {
      return {
        isValid: false,
        error: "House number provided but address only validated to suburb level",
      };
    }
    if (
      validationGranularity !== "PREMISE" &&
      validationGranularity !== "SUB_PREMISE"
    ) {
      return {
        isValid: false,
        error: `House number validation insufficient - only validated to ${validationGranularity} level (house number location is estimated, not confirmed)`,
      };
    }
    if (result.address?.addressComponents) {
      for (const component of result.address.addressComponents) {
        if (component.confirmationLevel === "UNCONFIRMED_AND_SUSPICIOUS") {
          return {
            isValid: false,
            error: `Address component '${component.componentName?.text}' was suspicious.`,
          };
        }
      }
    }
  }
  const formattedAddress = result.address.formattedAddress;
  const inputWords = address
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w: string) => w.length > 0);
  const outputWords = formattedAddress
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w: string) => w.length > 0);
  const hasSignificantLocationChange = () => {
    const inputHasSuburb = inputWords.some(
      (w: string) =>
        !w.match(/^\d+$/) &&
        ![
          "st",
          "street",
          "rd",
          "road",
          "ave",
          "avenue",
          "ln",
          "lane",
          "dr",
          "drive",
        ].includes(w),
    );
    const outputHasSuburb = outputWords.some(
      (w: string) =>
        !w.match(/^\d+$/) &&
        ![
          "st",
          "street",
          "rd",
          "road",
          "ave",
          "avenue",
          "ln",
          "lane",
          "dr",
          "drive",
          "australia",
        ].includes(w),
    );
    if (!inputHasSuburb && outputHasSuburb) {
      return true;
    }
    return false;
  };
  if (hasSignificantLocationChange()) {
    return {
      isValid: false,
      error:
        "Address appears incomplete - Google auto-completed to a different location. Please provide full address including suburb/city.",
    };
  }
  return {
    isValid: true,
    formattedAddress: result.address.formattedAddress,
    placeId: result.geocode?.placeId,
  };
}

export async function validateThenEnrichAddress(
  query: string,
  maxResults: number,
  apiKey: string,
  location?: { lat: number; lng: number },
): Promise<
  | {
      success: true;
      suggestions: PlaceSuggestion[];
      detectedIntent: LocationIntent;
    }
  | { success: false; error: string }
> {
  const validationResult = await validateAddressOnly(query, apiKey);
  if (!validationResult.isValid) {
    return {
      success: false,
      error: `Address validation failed: ${validationResult.error || "Address does not exist or is invalid"}`,
    };
  }
  const placesResult = await getPlacesApiSuggestions(
    validationResult.formattedAddress || query,
    "address",
    maxResults,
    apiKey,
    location,
  );
  if (placesResult.success) {
    const enhancedSuggestions = placesResult.suggestions.map((suggestion) => {
      const extractedSuburb = extractSuburbFromPlacesSuggestion(suggestion);
      return {
        ...suggestion,
        confidence: Math.min(1, suggestion.confidence + 0.2),
        types: [...suggestion.types, "address_validated"],
        resultType: "address" as const,
        suburb: extractedSuburb,
      };
    });
    return {
      success: true,
      suggestions: enhancedSuggestions,
      detectedIntent: "address",
    };
  }
  return {
    success: false,
    error: placesResult.error || "Unknown error during enrichment",
  };
} 