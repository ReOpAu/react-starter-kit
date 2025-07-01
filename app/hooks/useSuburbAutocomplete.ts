import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { AddressValidationResult, PlaceSuggestion } from "../../convex/location";

// Types
export type LocationIntent = "suburb" | "street" | "address" | "general";

// Legacy interfaces needed by conversation interface
export interface SuburbResult {
  canonicalSuburb: string;
  placeId: string;
  geocode: {
    lat: number;
    lng: number;
  };
  types: string[];
}

interface EnhancedSuburbResult {
  canonicalSuburb: string;
  placeId: string;
  // Geocode is optional and may be undefined if not implemented
  geocode?: {
    lat: number;
    lng: number;
  };
  types: string[];
}

export function useSuburbAutocomplete() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state for new system
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [detectedIntent, setDetectedIntent] = useState<LocationIntent | null>(null);
  
  // Legacy state needed by conversation interface
  const [canonicalSuburb, setCanonicalSuburb] = useState<string | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<EnhancedSuburbResult | null>(null);
  
  const getPlaceSuggestions = useAction(api.location.getPlaceSuggestions);
  const validateAddress = useAction(api.location.validateAddress);

  // Legacy functions for conversation interface (simplified versions)
  const lookupSuburb = async (suburbInput: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPlaceSuggestions({
        query: suburbInput,
        intent: "suburb",
        maxResults: 1
      });

      if (result.success && result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        const canonicalName = suggestion.description;
        setCanonicalSuburb(canonicalName);
        return {
          success: true as const,
          canonicalSuburb: canonicalName
        };
      }

      setError("No suburb found");
      return {
        success: false as const,
        error: "No suburb found"
      };
    } catch (err) {
      setError("Lookup failed - please try again");
      console.error('Suburb lookup error:', err);
      return { success: false as const, error: 'Failed to lookup suburb' };
    } finally {
      setIsLoading(false);
    }
  };

  const lookupSuburbEnhanced = async (suburbInput: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPlaceSuggestions({
        query: suburbInput,
        intent: "suburb",
        maxResults: 1
      });

      if (result.success && result.suggestions.length > 0) {
        const suggestion = result.suggestions[0];
        const enhancedData = {
          canonicalSuburb: suggestion.description,
          placeId: suggestion.placeId,
          // Geocode fetching not implemented yet; set to undefined
          geocode: undefined,
          types: suggestion.types
        };
        
        setCanonicalSuburb(enhancedData.canonicalSuburb);
        setEnhancedResult(enhancedData);
        
        return {
          success: true as const,
          ...enhancedData
        };
      }

      setError("No suburb found");
      return {
        success: false as const,
        error: "No suburb found"
      };
    } catch (err) {
      setError("Enhanced lookup failed - please try again");
      console.error('Enhanced suburb lookup error:', err);
      return { success: false as const, error: 'Failed to lookup suburb details' };
    } finally {
      setIsLoading(false);
    }
  };

  const lookupSuburbMultiple = async (suburbInput: string, maxResults = 5) => {
    try {
      const result = await getPlaceSuggestions({
        query: suburbInput,
        intent: "suburb",
        maxResults
      });

      if (result.success && result.suggestions.length > 0) {
        const results = result.suggestions.map(suggestion => ({
          canonicalSuburb: suggestion.description,
          placeId: suggestion.placeId,
          // Geocode fetching not implemented yet; set to undefined
          geocode: undefined,
          types: suggestion.types
        }));

        return {
          success: true as const,
          results
        };
      }

      return {
        success: false as const,
        error: "No suburbs found"
      };
    } catch (err) {
      console.error('Multiple suburb lookup error:', err);
      return { success: false as const, error: 'Failed to lookup suburbs' };
    }
  };

  // New enhanced place suggestions method
  const validateFullAddress = async (address: string, enableUspsCass = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await validateAddress({ 
        address, 
        enableUspsCass,
        regionCode: "AU" 
      });
      
      return result;
    } catch (err) {
      setError("Address validation failed - please try again");
      console.error('Address validation error:', err);
      return { success: false as const, error: 'Failed to validate address' };
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceSuggestionsWithIntent = async (
    query: string, 
    intent?: LocationIntent,
    options?: {
      maxResults?: number;
      location?: { lat: number; lng: number };
      radius?: number;
      isAutocomplete?: boolean;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    setDetectedIntent(null);

    try {
      const result = await getPlaceSuggestions({
        query,
        intent,
        maxResults: options?.maxResults,
        location: options?.location,
        radius: options?.radius,
        isAutocomplete: options?.isAutocomplete
      });

      if (result.success) {
        setSuggestions(result.suggestions);
        setDetectedIntent(result.detectedIntent);
        return result;
      }
      
      setError(result.error);
      return result;
    } catch (err) {
      setError("Place suggestions failed - please try again");
      console.error('Place suggestions error:', err);
      return { success: false, error: 'Failed to get place suggestions' };
    } finally {
      setIsLoading(false);
    }
  };

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSuggestions([]);
    setDetectedIntent(null);
    setCanonicalSuburb(null);
    setEnhancedResult(null);
  }, []);

  // Function to directly set results (for when agent confirms a selection)
  const setResult = useCallback((result: SuburbResult) => {
    setCanonicalSuburb(result.canonicalSuburb);
    setEnhancedResult({
      canonicalSuburb: result.canonicalSuburb,
      placeId: result.placeId,
      geocode: result.geocode,
      types: result.types
    });
  }, []);

  // Helper function to classify user intent from raw input
  const classifyIntent = useCallback((query: string): LocationIntent => {
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
    
    // Full address pattern (house number + street type)
    if ((hasHouseNumber || hasUnitNumber) && hasStreetType) {
      return "address";
    }
    
    // Street name pattern (street type but no house number at start)
    // Examples: "Clive street", "Smith Road, Richmond", "Collins St, Melbourne"
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
  }, []);

  return {
    // Legacy methods for conversation interface
    lookupSuburb,
    lookupSuburbEnhanced,
    lookupSuburbMultiple,
    
    // New enhanced methods
    getPlaceSuggestions: getPlaceSuggestionsWithIntent,
    validateFullAddress,
    classifyIntent,
    
    // Legacy state for conversation interface
    canonicalSuburb,
    enhancedResult,
    
    // New state
    suggestions,
    detectedIntent,
    isLoading,
    error,
    
    // Utilities
    reset,
    setResult
  };
} 