import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useSuburbAutocomplete, type LocationIntent } from "~/hooks/useSuburbAutocomplete";

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

// Types based on Google Maps JavaScript API documentation
interface AddressValidationResult {
  verdict: {
    inputGranularity: string;
    validationGranularity: string;
    geocodeGranularity: string;
    addressComplete: boolean;
    hasUnconfirmedComponents: boolean;
    hasInferredComponents: boolean;
  };
  address: {
    formattedAddress: string;
    addressComponents: Array<{
      componentName: { text: string };
      componentType: string;
      confirmationLevel: string;
    }>;
  };
  geocode: {
    location: { latitude: number; longitude: number };
    placeId: string;
  };
}

interface ValidationState {
  isLoading: boolean;
  result: AddressValidationResult | null;
  error: string | null;
  selectedPrediction: any | null;
}

interface UnifiedSuggestion {
  placeId: string;
  description: string;
  displayText: string;
  subtitle: string;
  source: 'convex' | 'google_places' | 'google_autocomplete';
  confidence: number;
  resultType: LocationIntent;
  suburb?: string;
  types?: string[];
}

export function GoogleMapsAutocomplete() {
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    isLoading: false,
    result: null,
    error: null,
    selectedPrediction: null
  });

  // Unified input system state
  const [inputValue, setInputValue] = useState('');
  const [currentIntent, setCurrentIntent] = useState<LocationIntent>('general');
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [debouncedValue, setDebouncedValue] = useState('');
  const [isAddressSelected, setIsAddressSelected] = useState(false);

  // Use existing Convex system
  const { classifyIntent, getPlaceSuggestions } = useSuburbAutocomplete();

  // Helper function to completely reset component state
  const resetAllState = () => {
    setInputValue('');
    setValidation({
      isLoading: false,
      result: null,
      error: null,
      selectedPrediction: null
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setCurrentIntent('general');
    setIsAddressSelected(false);
    setDebouncedValue('');
  };

  // Debouncing for input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Debounced effect for autocomplete (no premature intent classification)
  useEffect(() => {
    if (isAddressSelected) {
      return;
    }

    if (debouncedValue.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setCurrentIntent('general');
      return;
    }

    // NO PREMATURE INTENT CLASSIFICATION
    // Show all valid location types (suburbs, streets, addresses) together
    // Let user choose what they want, then classify intent after selection
    setCurrentIntent('general'); // Always show as general during autocomplete
    handleUniversalAutocomplete(debouncedValue);
  }, [debouncedValue, isAddressSelected]);

  // Universal autocomplete handler - shows all valid location types together - memoized for performance
  const handleUniversalAutocomplete = useCallback(async (query: string) => {
    const allSuggestions: UnifiedSuggestion[] = [];

    try {
      // Getting all valid location types

      // Call Convex with general intent to get broad results
      const convexResult = await getPlaceSuggestions(query, 'general', {
        maxResults: 8,
        location: { lat: -37.8136, lng: 144.9631 },
        radius: 100000,
        isAutocomplete: true
      });

      if (convexResult.success && 'suggestions' in convexResult) {
        const filteredSuggestions = convexResult.suggestions
          .filter((s: any) => isValidLocationType(s.types || [], s.description))
          .map((s: any) => ({
            placeId: s.placeId,
            description: s.description,
            displayText: s.structuredFormatting.mainText,
            subtitle: s.structuredFormatting.secondaryText || `${s.resultType} • ${s.suburb || 'Australia'}`,
            source: 'convex' as const,
            confidence: s.confidence,
            resultType: s.resultType as LocationIntent,
            suburb: s.suburb,
            types: s.types
          }));
        
        allSuggestions.push(...filteredSuggestions);
      }

      // Sort by confidence and limit results (no deduplication needed with single source)
      allSuggestions.sort((a, b) => b.confidence - a.confidence);
      setSuggestions(allSuggestions.slice(0, 8));
      setShowSuggestions(allSuggestions.length > 0);

    } catch (error) {
      console.error('Universal autocomplete error:', error);
    }
  }, [getPlaceSuggestions]);

  // Helper function to filter valid location types (suburbs, streets, addresses) - memoized for performance
  const isValidLocationType = useCallback((types: string[], description?: string): boolean => {
    // Keep: suburbs, streets, addresses
    const goodTypes = [
      'locality',                    // suburbs
      'sublocality',                // suburb areas  
      'route',                      // street names
      'street_address',             // full addresses
      'premise',                    // specific addresses
      'postal_code',                // postcode areas
      'administrative_area_level_2', // local government areas
      'political'                   // political boundaries (often suburbs)
    ];
    
    // Reject: businesses, POIs, recreational areas, and tourist attractions
    const badTypes = [
      // Business establishments
      'establishment', 'point_of_interest', 'store', 'restaurant',
      'gas_station', 'hospital', 'school', 'shopping_mall', 
      'university', 'bank', 'pharmacy', 'gym', 'beauty_salon', 
      'car_dealer', 'real_estate_agency', 'lawyer', 'dentist', 'doctor',
      
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
      
      // Walking tracks, trails, and outdoor paths
      'walking_track', 'hiking_trail', 'nature_trail', 'walking_path',
      'pedestrian_path', 'bike_path', 'cycling_path', 'trail_head',
      
      // Other recreational facilities
      'playground', 'picnic_ground', 'observation_deck', 'lookout',
      'scenic_lookout', 'visitor_center', 'information_center'
    ];
    
    const hasGoodType = types.some(type => goodTypes.includes(type));
    const hasBadType = types.some(type => badTypes.includes(type));
    
    // Only log when filtering out problematic results for debugging
    if (description && description.toLowerCase().includes('falls')) {
      console.log(`[Filter Debug] "${description}" - Types: [${types.join(', ')}] - Valid: ${hasGoodType && !hasBadType}`);
    }
    
    // Additional description-based filtering for walking trails and recreational areas
    if (description) {
      const lowerDesc = description.toLowerCase();
      const badDescriptionKeywords = [
        'walk', 'trail', 'track', 'path', 'falls', 'waterfall', 'lookout',
        'reserve', 'garden', 'beach', 'creek', 'river', 'lake',
        'mountain', 'hill', 'valley', 'gorge', 'scenic', 'viewpoint',
        'camping', 'campground', 'caravan', 'picnic', 'bbq', 'playground',
        'memorial', 'monument', 'statue', 'fountain', 'rotunda'
      ];
      
      const hasDescriptionKeyword = badDescriptionKeywords.some(keyword => 
        lowerDesc.includes(keyword)
      );
      
      if (hasDescriptionKeyword) {
        return false;
      }
    }
    
    return hasGoodType && !hasBadType;
  }, []);

  // Load Google Maps JavaScript API with beta channel
  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (window.google?.maps) {
        // Google Maps API already loaded
        setIsLoaded(true);
        return;
      }

      // Loading Google Maps API
      
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('VITE_GOOGLE_MAPS_API_KEY is not set');
        setValidation(prev => ({ 
          ...prev, 
          error: 'Google Maps API key is not configured. Please check your environment variables.' 
        }));
        return;
      }

      // Using API key for Google Maps

      // Create a global callback function
      window.initGoogleMaps = () => {
        setIsLoaded(true);
      };

      const script = document.createElement('script');
      // Use proper async loading pattern as recommended by Google
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API:', error);
        setValidation(prev => ({ 
          ...prev, 
          error: 'Failed to load Google Maps API. Please check your API key and network connection.' 
        }));
      };

      // Loading Google Maps script
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Initialize autocomplete when API is loaded
  useEffect(() => {
    if (!isLoaded || !autocompleteRef.current) return;

    const initializeAutocomplete = async () => {
      try {
        // Initializing Google Maps autocomplete
        
        // Create autocomplete instance with proper configuration
        const autocomplete = new window.google.maps.places.Autocomplete(
          autocompleteRef.current!,
          {
            componentRestrictions: { country: "au" },
            fields: ["place_id", "formatted_address", "address_components", "geometry"],
            types: ["address"]
          }
        );

        // Autocomplete instance created

        // Listen for place selection
        autocomplete.addListener("place_changed", async () => {
          const place = autocomplete.getPlace();
          
          // Place selected from autocomplete
          
          if (!place.place_id || !place.formatted_address) {
            // No valid place selected
            setValidation(prev => ({ 
              ...prev, 
              error: "Please select a valid address from the dropdown" 
            }));
            return;
          }

          // Clear previous errors
          setValidation(prev => ({ ...prev, error: null }));
          
          // Validate the selected address
          await validateSelectedAddress(place.formatted_address);
        });

      } catch (error) {
        console.error("Error initializing autocomplete:", error);
        setValidation(prev => ({ 
          ...prev, 
          error: `Failed to initialize autocomplete: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }));
      }
    };

    initializeAutocomplete();
  }, [isLoaded]);

  // Validate address using Address Validation API
  const validateSelectedAddress = async (address: string) => {
    setValidation(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const apiUrl = '/api/validate-address';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ address })
      });

      // Check validation response

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Validation error response:', errorText);
        
        // Try to parse as JSON first, fallback to text
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorText;
        } catch {
          errorMessage = errorText;
        }
        
        throw new Error(`Validation failed: ${response.status} - ${errorMessage}`);
      }

      const result = await response.json();
      
      setValidation({
        isLoading: false,
        result,
        error: null,
        selectedPrediction: null
      });

    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        isLoading: false,
        result: null,
        error: error instanceof Error ? error.message : 'Validation failed',
        selectedPrediction: null
      });
    }
  };

  const validationStatus = useMemo(() => {
    if (!validation.result) return null;
    
    const { verdict } = validation.result;
    
    // Addresses with unconfirmed components are considered invalid
    if (verdict.hasUnconfirmedComponents) {
      return "Invalid";
    }
    
    if (!verdict.addressComplete) {
      return "Incomplete";
    }
    
    return "Valid";
  }, [validation.result]);

  const getValidationColor = () => {
    if (!validation.result) return "secondary";
    
    const { verdict } = validation.result;
    
    if (verdict.addressComplete && !verdict.hasUnconfirmedComponents) {
      return "default"; // Green
    }
    if (verdict.hasUnconfirmedComponents) {
      return "destructive"; // Red
    }
    return "secondary"; // Gray
  };

  // Helper functions
  const getIntentColor = (intent: LocationIntent) => {
    switch (intent) {
      case 'suburb': return 'bg-blue-100 text-blue-800';
      case 'street': return 'bg-green-100 text-green-800';
      case 'address': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntentDescription = (intent: LocationIntent) => {
    switch (intent) {
      case 'suburb': return 'Searching for suburbs and localities';
      case 'street': return 'Searching for street names';
      case 'address': return 'Will validate full addresses';
      default: return 'General location search';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: UnifiedSuggestion) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setIsAddressSelected(true);

    // 🎯 CLASSIFY INTENT AFTER USER SELECTION
    const selectedIntent = classifySelectedResult(suggestion);
    console.log(`[Post-Selection] User selected: "${suggestion.description}" → Classified as: ${selectedIntent}`);
    
    setCurrentIntent(selectedIntent);

    // Route based on classified intent
    if (selectedIntent === 'address') {
      // Full addresses need validation
      console.log(`[Post-Selection] Validating address: ${suggestion.description}`);
      await validateSelectedAddress(suggestion.description);
    } else {
      // Suburbs and streets just get displayed
      console.log(`[Post-Selection] Displaying ${selectedIntent}: ${suggestion.description}`);
      setValidation({
        isLoading: false,
        result: null,
        error: null,
        selectedPrediction: {
          formatted_address: suggestion.description,
          place_id: suggestion.placeId,
          types: suggestion.types || [suggestion.resultType],
          suburb: suggestion.suburb,
          resultType: selectedIntent
        }
      });
    }
  };

  // Helper function to classify intent based on what user actually selected
  const classifySelectedResult = (suggestion: UnifiedSuggestion): LocationIntent => {
    const types = suggestion.types || [];
    const description = suggestion.description;

    // Check for full addresses (have street numbers)
    if (types.includes('street_address') || 
        types.includes('premise') || 
        /^\d+[a-z]?\s+/.test(description.trim())) {
      return 'address';
    }

    // Check for streets (routes without numbers at start)
    if (types.includes('route') || 
        /\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|crescent|cres|court|ct|place|pl|terrace|tce)\b/i.test(description)) {
      return 'street';
    }

    // Check for suburbs/localities
    if (types.includes('locality') || 
        types.includes('sublocality') || 
        types.includes('administrative_area_level_2') ||
        types.includes('postal_code')) {
      return 'suburb';
    }

    // Default fallback
    return 'general';
  };

  // Debug function to test API directly
  const testApiDirectly = async () => {
    await validateSelectedAddress("123 Collins Street, Melbourne VIC 3000, Australia");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🚀 Unified Intelligent Address System
          <Badge variant="outline" className="text-xs">Intent + Autocomplete + Validation</Badge>
        </CardTitle>
        <CardDescription>
          Single input field with intelligent intent detection, multi-source autocomplete, and address validation
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Debug Section */}
        <div className="bg-yellow-50 p-3 rounded-md">
          <h4 className="font-medium text-sm text-yellow-900 mb-2">
            System Status:
          </h4>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span>API Key:</span>
              <Badge variant={import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? "default" : "destructive"} className="text-xs">
                {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? '✅ Set' : '❌ Missing'}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <span>Google Maps:</span>
              <Badge variant={isLoaded ? "default" : "secondary"} className="text-xs">
                {isLoaded ? '✅ Ready' : '⏳ Loading'}
              </Badge>
            </div>
            <Button 
              onClick={testApiDirectly}
              variant="outline" 
              size="sm"
              disabled={validation.isLoading}
            >
              Test API
            </Button>
          </div>
        </div>

        {/* Intent Indicator */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getIntentColor(currentIntent)}>
            Intent: {currentIntent}
          </Badge>
          <span className="text-xs text-gray-500">
            {getIntentDescription(currentIntent)}
          </span>
        </div>

        {/* Unified Input Field */}
        <div className="relative">
          <label htmlFor="unified-input" className="text-sm font-medium block mb-2">
            Enter any location - suburb, street, or full address:
          </label>
          <div className="relative">
            <input
              id="unified-input"
              type="text"
              value={inputValue}
              onChange={(e) => {
                const newValue = e.target.value;
                const trimmedOldValue = inputValue.trim();
                const trimmedNewValue = newValue.trim();
                
                setInputValue(newValue);
                setSelectedIndex(-1);
                
                // Only reset address selection if the actual content changed (not just whitespace)
                if (trimmedOldValue !== trimmedNewValue) {
                  setIsAddressSelected(false);
                }
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(suggestions.length > 0 && !isAddressSelected)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Try: 'Richmond', 'Collins Street', or '123 Collins St, Melbourne'..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
              spellCheck="false"
            />
            
            {/* Clear Address Icon */}
            {(inputValue.length > 0 || validation.result || validation.selectedPrediction) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault(); // Prevent any form submission
                  e.stopPropagation(); // Stop event bubbling
                  
                  // Clear all state
                  resetAllState();
                  
                  // Focus the input field to prevent page jumping
                  setTimeout(() => {
                    const input = document.getElementById('unified-input') as HTMLInputElement;
                    if (input) {
                      input.focus();
                    }
                  }, 0);
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
                title="Clear address"
                aria-label="Clear address"
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Intelligent Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.source}-${suggestion.placeId}`}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    index === selectedIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{suggestion.displayText}</div>
                      <div className="text-xs text-gray-500">{suggestion.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.resultType}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loading State */}
        {validation.isLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Validating address...</span>
          </div>
        )}

        {/* Error State */}
        {validation.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">❌ {validation.error}</p>
          </div>
        )}

        {/* Results Display */}
        {(validation.result || validation.selectedPrediction) && (
          <div className="space-y-4">
            {/* Result Header */}
            <div className="flex items-center gap-2">
              {validation.result ? (
                <Badge variant={getValidationColor()}>
                  {validationStatus}
                </Badge>
              ) : (
                <Badge variant="default">
                  {currentIntent} Selected
                </Badge>
              )}
            </div>

            {/* Invalid Address Warning */}
            {validation.result && validationStatus === "Invalid" && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">❌</span>
                  <div>
                    <h4 className="font-medium text-sm text-red-800 mb-1">Address Invalid</h4>
                    <p className="text-sm text-red-700 mb-2">
                      This address cannot be validated because it contains unconfirmed components.
                    </p>
                    <div className="text-xs text-red-600 space-y-1">
                      {validation.result.verdict.hasUnconfirmedComponents && (
                        <div>• <strong>Unconfirmed components:</strong> Parts of this address could not be verified against postal records</div>
                      )}
                      <div className="mt-2 pt-1 border-t border-red-300">
                        <strong>Please try:</strong> Enter a more complete or specific address, or verify the address exists.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address Display */}
            <div className={`p-3 rounded-md ${
              validation.result && validationStatus === "Invalid" 
                ? "bg-red-50 border border-red-200" 
                : "bg-gray-50"
            }`}>
              <h4 className={`font-medium text-sm mb-2 ${
                validation.result && validationStatus === "Invalid" 
                  ? "text-red-800" 
                  : ""
              }`}>
                {validation.result && validationStatus === "Invalid" ? "Invalid Address:" : "Selected Location:"}
              </h4>
              <p className={`text-sm ${
                validation.result && validationStatus === "Invalid" 
                  ? "text-red-700 line-through" 
                  : ""
              }`}>
                {validation.result?.address.formattedAddress || validation.selectedPrediction?.formatted_address}
              </p>
              {validation.selectedPrediction?.suburb && (
                <p className="text-xs text-gray-600 mt-1">
                  Suburb: {validation.selectedPrediction.suburb}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 p-3 rounded-md">
          <h4 className="font-medium text-sm text-blue-900 mb-1">
            How the Unified System Works:
          </h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• <strong>Real-time Intent Detection:</strong> Automatically classifies input as suburb, street, or address</li>
            <li>• <strong>Multi-source Autocomplete:</strong> Combines Convex Places API + Google Places for comprehensive suggestions</li>
            <li>• <strong>Smart Validation Routing:</strong> Full addresses validated with Address Validation API</li>
            <li>• <strong>Confidence Scoring:</strong> Shows reliability of each suggestion with source attribution</li>
            <li>• <strong>Keyboard Navigation:</strong> Arrow keys to navigate, Enter to select, Escape to close</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 