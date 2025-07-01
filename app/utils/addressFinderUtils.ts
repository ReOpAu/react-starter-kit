import { type Suggestion } from '~/stores/addressFinderStore';
import type { LocationIntent } from '~/stores/types';

/**
 * Helper function to classify intent based on what user actually selected
 */
export const classifySelectedResult = (suggestion: Suggestion): LocationIntent => {
    const types = suggestion.types || [];
    const description = suggestion.description;

    // Check for full addresses
    if (types.includes('street_address') || 
        types.includes('premise') || 
        /^(unit\s+|apt\s+|apartment\s+|shop\s+|suite\s+)?\d+[a-z]?([/-]\d+[a-z]?(-\d+[a-z]?)?)?\s+/i.test(description.trim())) {
      return 'address';
    }

    // Check for streets
    if (types.includes('route')) {
      return 'street';
    }

    // Check for suburbs/localities
    if (types.includes('locality') || types.includes('sublocality')) {
      return 'suburb';
    }

    // Default fallback
    return 'general';
};

/**
 * Helper function to de-duplicate suggestions by placeId with source priority
 */
export const deduplicateSuggestions = <T extends Suggestion & { source: string }>(
  suggestions: T[]
): T[] => {
  // Define source priority: agentCache > unified > ai > autocomplete
  const sourcePriority = { 
    agentCache: 4, 
    unified: 3, 
    ai: 2, 
    autocomplete: 1 
  };
  
  return suggestions.reduce((acc, current) => {
    const existingIndex = acc.findIndex(item => item.placeId === current.placeId);
    
    if (existingIndex === -1) {
      // No duplicate found, add the suggestion
      acc.push(current);
    } else {
      // Duplicate found, keep the one with higher priority source
      const currentPriority = sourcePriority[current.source as keyof typeof sourcePriority] || 0;
      const existingPriority = sourcePriority[acc[existingIndex].source as keyof typeof sourcePriority] || 0;
      
      if (currentPriority > existingPriority) {
        acc[existingIndex] = current;
      }
    }
    
    return acc;
  }, [] as T[]);
};

/**
 * Returns a Tailwind CSS class string for styling based on location intent.
 */
export const getIntentColor = (intent: LocationIntent): string => {
  switch (intent) {
    case 'suburb': return 'bg-blue-100 text-blue-800';
    case 'street': return 'bg-green-100 text-green-800';
    case 'address': return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 border-gray-200 text-gray-700';
  }
};

// Street indicators
const streetKeywords = [
  'street', 'st', 'road', 'rd', 'avenue', 'ave', 'lane', 'ln', 'drive', 'dr', 
  'way', 'crescent', 'cres', 'court', 'ct', 'place', 'pl', 'terrace', 'tce',
  'grove', 'close', 'boulevard', 'blvd', 'parade', 'pde', 'circuit', 'cct',
  'walk', 'mews', 'row', 'square', 'sq', 'esplanade', 'esp'
];

// Pre-compile regex patterns for street keywords (word boundaries)
const streetKeywordRegexes = streetKeywords.map(
  keyword => new RegExp(`\\b${keyword}\\b`, 'i')
);

// Rural indicators
const ruralKeywords = [
  'hwy', 'highway', 'rd', 'road', 'lane', 'track', 'station', 'farm', 'mount', 'creek', 'way', 'drive', 'dr', 'ln', 'springmount'
];
const ruralKeywordRegexes = ruralKeywords.map(
  keyword => new RegExp(`\\b${keyword}\\b`, 'i')
);

export function classifyIntent(query: string): LocationIntent {
  const lowerQuery = query.toLowerCase().trim();

  // Check if query has street type indicator
  const hasStreetType = streetKeywordRegexes.some(regex => regex.test(lowerQuery));

  // Check for house number at the beginning (true address)
  const hasHouseNumber = /^\d+[a-z]?\s+/.test(lowerQuery);

  // Check for unit/apartment patterns at the beginning
  const hasUnitNumber = /^(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery);

  // Rural address pattern: house number + rural keyword
  const hasRuralType = ruralKeywordRegexes.some(regex => regex.test(lowerQuery));
  if ((hasHouseNumber || hasUnitNumber) && (hasStreetType || hasRuralType)) {
    return "address";
  }

  // Street name pattern (street type but no house number at start)
  if (hasStreetType && !hasHouseNumber && !hasUnitNumber) {
    return "street";
  }

  // Unit/apartment patterns anywhere in the query (fallback)
  if (/\b(unit|apt|apartment|suite|shop|level|floor|u)\s*\d+/i.test(lowerQuery)) {
    return "address";
  }

  // Check for postcode patterns (4 digits) - these are usually suburbs
  const hasPostcode = /\b\d{4}\b/.test(lowerQuery);

  // Check for Australian state abbreviations
  const hasAustralianState = /\b(vic|nsw|qld|wa|sa|tas|nt|act|victoria|new south wales|queensland|western australia|south australia|tasmania|northern territory|australian capital territory)\b/i.test(lowerQuery);

  // If it has postcode or state but no street indicators, likely a suburb
  if ((hasPostcode || hasAustralianState) && !hasStreetType && !hasRuralType) {
    return "suburb";
  }

  // Suburb patterns (simple text without numbers or street types)
  const isSimpleText = /^[a-z\s\-']+$/i.test(lowerQuery);

  // If it's just simple text without street indicators, assume suburb
  if (isSimpleText && !hasStreetType && !hasRuralType) {
    return "suburb";
  }

  return "general";
} 