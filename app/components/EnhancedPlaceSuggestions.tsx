import { useState } from 'react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { useSuburbAutocomplete, type LocationIntent } from "~/hooks/useSuburbAutocomplete";
import type { PlaceSuggestion } from "../../convex/location";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

// Helper function to get result type color
const getResultTypeColor = (resultType: string) => {
  switch (resultType) {
    case 'suburb':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'street':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'address':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Helper function to get intent color
const getIntentColor = (intent: LocationIntent) => {
  switch (intent) {
    case 'suburb':
      return 'bg-blue-50 border-blue-200 text-blue-700';
    case 'street':
      return 'bg-green-50 border-green-200 text-green-700';
    case 'address':
      return 'bg-purple-50 border-purple-200 text-purple-700';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-700';
  }
};

interface EnhancedPlaceSuggestionsProps {
  aiSuggestions?: PlaceSuggestion[];
  isInputDisabled?: boolean;
}

export function EnhancedPlaceSuggestions({ 
  aiSuggestions = [], 
  isInputDisabled = false 
}: EnhancedPlaceSuggestionsProps) {
  const [query, setQuery] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<LocationIntent | undefined>(undefined);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlaceSuggestion | null>(null);
  
  // Add address validation state
  const [validationQuery, setValidationQuery] = useState('');
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    result?: {
      formattedAddress: string;
      geocode: {
        latitude: number;
        longitude: number;
      };
      verdict: {
        addressComplete: boolean;
        hasUnconfirmedComponents: boolean;
        hasInferredComponents: boolean;
      };
      addressComponents: Array<{
        componentName: string;
        componentType: string;
        confirmationLevel: string;
      }>;
    };
    error?: string;
    issues?: Array<{
      component: string;
      issue: string;
      severity: string;
    }>;
  } | null>(null);

  const { 
    getPlaceSuggestions,
    validateFullAddress,
    classifyIntent,
    suggestions,
    detectedIntent,
    isLoading,
    error,
    reset
  } = useSuburbAutocomplete();

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    await getPlaceSuggestions(
      query,
      currentIntent || undefined,
      {
        maxResults: 8
      }
    );
  };

  const handleAddressValidation = async () => {
    if (!validationQuery.trim()) return;
    
    const result = await validateFullAddress(validationQuery);
    setValidationResult(result);
  };

  const handleSuggestionSelect = (suggestion: PlaceSuggestion) => {
    setSelectedSuggestion(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedIntent(undefined);
    setSelectedSuggestion(null);
    setValidationQuery('');
    setValidationResult(null);
    reset();
  };

  const autoDetectedIntent = query ? classifyIntent(query) : null;
  const currentIntent = selectedIntent || autoDetectedIntent;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Enhanced Place Suggestions
            <Badge variant="outline" className="text-xs">Intent-Based Search</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            {isInputDisabled && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-orange-700 text-sm font-medium">
                  🎤 AI Mode Active - Manual search disabled. Use voice commands to populate suggestions.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Enter suburb, street, or address (e.g., 'Richmond', 'Smith Street', '123 Smith St')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                disabled={isInputDisabled}
              />
              <Button onClick={handleSearch} disabled={isLoading || !query.trim() || isInputDisabled}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={isInputDisabled}>
                Clear
              </Button>
            </div>
            
            {/* Intent Information */}
            <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-md">
              💡 <strong>Smart Two-Step Validation:</strong> Full addresses (with numbers) are first validated for existence, 
              then enriched with suburb names via Places API. Suburbs and streets use Places API directly.
            </div>
            
            {/* Intent Override */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Override intent:</span>
              <Select value={selectedIntent} onValueChange={(value) => setSelectedIntent(value as LocationIntent)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suburb">Suburb</SelectItem>
                  <SelectItem value="street">Street</SelectItem>
                  <SelectItem value="address">Address</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              {query && currentIntent && (
                <Badge variant="outline" className={getIntentColor(currentIntent)}>
                  {selectedIntent ? `Override: ${currentIntent}` : `Auto: ${currentIntent}`}
                </Badge>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Validation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ✅ Address Validation & Enrichment
            <Badge variant="outline" className="text-xs">Two-Step Process</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter complete address (e.g., '123 Collins Street, Melbourne VIC 3000')"
              value={validationQuery}
              onChange={(e) => setValidationQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddressValidation()}
              className="flex-1"
            />
            <Button onClick={handleAddressValidation} disabled={isLoading || !validationQuery.trim()}>
              {isLoading ? 'Validating...' : 'Validate'}
            </Button>
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div className="mt-4">
              {validationResult.success && validationResult.result ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">✅ Validation Result</span>
                    <Badge variant={validationResult.result.verdict.addressComplete ? "default" : "destructive"}>
                      {validationResult.result.verdict.addressComplete ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium mb-2">Formatted Address:</h4>
                    <p className="text-sm">{validationResult.result.formattedAddress}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-md">
                      <h4 className="font-medium mb-2">Coordinates:</h4>
                      <p className="text-sm">
                        Lat: {validationResult.result.geocode.latitude.toFixed(6)}<br/>
                        Lng: {validationResult.result.geocode.longitude.toFixed(6)}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-3 rounded-md">
                      <h4 className="font-medium mb-2">Validation Status:</h4>
                      <div className="text-sm space-y-1">
                        <div>Complete: {validationResult.result.verdict.addressComplete ? '✅' : '❌'}</div>
                        <div>Unconfirmed: {validationResult.result.verdict.hasUnconfirmedComponents ? '⚠️' : '✅'}</div>
                        <div>Inferred: {validationResult.result.verdict.hasInferredComponents ? '⚠️' : '✅'}</div>
                      </div>
                    </div>
                  </div>

                  {validationResult.result.addressComponents.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium mb-2">Address Components:</h4>
                      <div className="flex flex-wrap gap-2">
                        {validationResult.result.addressComponents.map((comp, index) => (
                          <Badge 
                            key={`${comp.componentType}-${comp.componentName}-${index}`}
                            variant={
                              comp.confirmationLevel === 'CONFIRMED' ? 'default' : 
                              comp.confirmationLevel === 'UNCONFIRMED_BUT_PLAUSIBLE' ? 'secondary' : 
                              'destructive'
                            }
                            className="text-xs"
                          >
                            {comp.componentType}: {comp.componentName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-600 font-medium">❌ Validation Failed</span>
                  </div>
                  <p className="text-red-700 text-sm">{validationResult.error}</p>
                  {validationResult.issues && validationResult.issues.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-medium text-red-700 mb-2">Issues Found:</h4>
                      <div className="space-y-1">
                        {validationResult.issues.map((issue, index) => (
                          <div key={`${issue.component}-${issue.severity}-${index}`} className="text-sm text-red-600">
                            <Badge variant={issue.severity === 'ERROR' ? 'destructive' : 'secondary'} className="mr-2">
                              {issue.severity}
                            </Badge>
                            {issue.issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI-Generated Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                🤖 AI-Generated Suggestions
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {aiSuggestions.length} results
                </Badge>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className="w-full p-4 border border-blue-200 rounded-lg cursor-pointer transition-colors text-left bg-white hover:bg-blue-50"
                  onClick={() => handleSuggestionSelect(suggestion)}
                  aria-label={`Select ${suggestion.description}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{suggestion.structuredFormatting.mainText}</h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getResultTypeColor(suggestion.resultType)}`}
                        >
                          {suggestion.resultType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.structuredFormatting.secondaryText}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        {suggestion.description}
                      </p>
                      
                      {/* Technical Details */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="bg-gray-50">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        <Badge variant="outline" className="bg-gray-50">
                          AI Generated
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Ranking */}
                    <div className="ml-4 text-center">
                      <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                      <div className="text-xs text-muted-foreground">rank</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Search Results */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Search Results</span>
              <div className="flex items-center gap-2">
                {detectedIntent && (
                  <Badge variant="outline" className={getIntentColor(detectedIntent)}>
                    Used: {detectedIntent}
                  </Badge>
                )}
                {selectedIntent && autoDetectedIntent && selectedIntent !== autoDetectedIntent && (
                  <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700 text-xs">
                    Overridden (Auto: {autoDetectedIntent})
                  </Badge>
                )}
                {detectedIntent === "address" && (
                  <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 text-xs">
                    Address Validation API
                  </Badge>
                )}
                {detectedIntent !== "address" && (
                  <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-xs">
                    Places API
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {suggestions.length} results
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className={`w-full p-4 border rounded-lg cursor-pointer transition-colors text-left ${
                    selectedSuggestion?.placeId === suggestion.placeId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  aria-label={`Select ${suggestion.description}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-lg">{suggestion.structuredFormatting.mainText}</h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getResultTypeColor(suggestion.resultType)}`}
                        >
                          {suggestion.resultType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {suggestion.structuredFormatting.secondaryText}
                      </p>
                      <p className="text-xs text-gray-600 mb-2">
                        {suggestion.description}
                      </p>
                      
                      {/* 🎯 NEW: Suburb Information */}
                      {suggestion.suburb && (
                        <div className="mb-2">
                          <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 text-sm">
                            📍 Suburb: {suggestion.suburb}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Technical Details */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline" className="bg-gray-50">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                        <Badge variant="outline" className="bg-gray-50">
                          ID: {suggestion.placeId.slice(0, 10)}...
                        </Badge>
                        {suggestion.types.slice(0, 3).map((type: string) => (
                          <Badge key={type} variant="outline" className="bg-gray-50 text-xs">
                            {type}
                          </Badge>
                        ))}
                        {suggestion.types.length > 3 && (
                          <Badge variant="outline" className="bg-gray-50 text-xs">
                            +{suggestion.types.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Ranking */}
                    <div className="ml-4 text-center">
                      <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                      <div className="text-xs text-muted-foreground">rank</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Result Details */}
      {selectedSuggestion && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">Selected Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-blue-700">Full Description:</p>
                <p className="text-lg">{selectedSuggestion.description}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-blue-700">Classification:</p>
                <Badge className={getResultTypeColor(selectedSuggestion.resultType)}>
                  {selectedSuggestion.resultType}
                </Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium text-blue-700">Confidence Score:</p>
                <p>{Math.round(selectedSuggestion.confidence * 100)}%</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-blue-700">Place ID:</p>
                <p className="font-mono text-xs break-all">{selectedSuggestion.placeId}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-blue-700">Google Types:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSuggestion.types.map((type: string) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intent Classification Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Intent Classification Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium mb-2">Suburb Examples:</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">suburb</Badge>
                    "Richmond"
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">suburb</Badge>
                    "South Yarra"
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">suburb</Badge>
                    "Yarraville"
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Street Examples:</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">street</Badge>
                    "Smith Street"
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">street</Badge>
                    "Chapel St"
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">street</Badge>
                    "Collins Road"
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Address Examples:</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">address</Badge>
                    "123 Smith Street"
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">address</Badge>
                    "45 Chapel St"
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">address</Badge>
                    "Unit 2, 15 Collins Road"
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 