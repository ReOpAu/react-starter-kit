import { type Suggestion, type LocationIntent } from '~/stores/addressFinderStore';

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