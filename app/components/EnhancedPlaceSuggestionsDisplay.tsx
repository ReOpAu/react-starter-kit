import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { EnhancedPlaceSuggestion, LocationIntent } from "~/hooks/useEnhancedPlaceSuggestions";

interface EnhancedPlaceSuggestionsDisplayProps {
  suggestions: EnhancedPlaceSuggestion[];
  detectedIntent: LocationIntent;
  onSelect: (suggestion: EnhancedPlaceSuggestion) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const getIntentDisplay = (intent: LocationIntent) => {
  switch (intent) {
    case "suburb":
      return { label: "Suburb", icon: "🏘️", color: "bg-blue-50 border-blue-200 text-blue-700" };
    case "street":
      return { label: "Street", icon: "🛣️", color: "bg-green-50 border-green-200 text-green-700" };
    case "address":
      return { label: "Address", icon: "🏠", color: "bg-purple-50 border-purple-200 text-purple-700" };
    case "general":
      return { label: "General", icon: "📍", color: "bg-gray-50 border-gray-200 text-gray-700" };
    default:
      return { label: "Unknown", icon: "❓", color: "bg-gray-50 border-gray-200 text-gray-700" };
  }
};

const getResultTypeColors = (resultType: string) => {
  switch (resultType) {
    case "suburb":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-900",
        hover: "hover:bg-blue-100",
        badge: "bg-blue-100 text-blue-800 border-blue-300"
      };
    case "street":
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-900",
        hover: "hover:bg-green-100",
        badge: "bg-green-100 text-green-800 border-green-300"
      };
    case "address":
      return {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-900",
        hover: "hover:bg-purple-100",
        badge: "bg-purple-100 text-purple-800 border-purple-300"
      };
    case "general":
      return {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-900",
        hover: "hover:bg-gray-100",
        badge: "bg-gray-100 text-gray-800 border-gray-300"
      };
    default:
      return {
        bg: "bg-slate-50",
        border: "border-slate-200",
        text: "text-slate-900",
        hover: "hover:bg-slate-100",
        badge: "bg-slate-100 text-slate-800 border-slate-300"
      };
  }
};

const getResultTypeIcon = (resultType: string) => {
  switch (resultType) {
    case "suburb": return "🏘️";
    case "street": return "🛣️";
    case "address": return "🏠";
    case "general": return "📍";
    default: return "❓";
  }
};

export function EnhancedPlaceSuggestionsDisplay({
  suggestions,
  detectedIntent,
  onSelect,
  onCancel,
  isLoading = false
}: EnhancedPlaceSuggestionsDisplayProps) {
  if (isLoading) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <span className="ml-2 text-blue-700">Searching for places...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const intentDisplay = getIntentDisplay(detectedIntent);

  // Group suggestions by result type for better organization
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    const type = suggestion.resultType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(suggestion);
    return acc;
  }, {} as Record<string, EnhancedPlaceSuggestion[]>);

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🔍 Place Suggestions</span>
            <Badge variant="outline" className={cn("text-xs", intentDisplay.color)}>
              {intentDisplay.icon} Detected: {intentDisplay.label}
            </Badge>
          </div>
          <Badge variant="outline" className="bg-slate-100 text-slate-700">
            {suggestions.length} results
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Found {suggestions.length} places. Results are organized by type and ranked by relevance:
        </p>

        {/* Display grouped results */}
        {Object.entries(groupedSuggestions).map(([resultType, typeSuggestions]) => {
          const colors = getResultTypeColors(resultType);
          const icon = getResultTypeIcon(resultType);
          
          return (
            <div key={resultType} className="space-y-2">
              {/* Section header */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <h4 className="font-medium text-sm capitalize">
                  {resultType}s ({typeSuggestions.length})
                </h4>
              </div>
              
              {/* Suggestions for this type */}
              <div className="space-y-2 ml-6">
                {typeSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion.placeId}
                    variant="outline"
                    className={cn(
                      "w-full justify-start p-4 h-auto text-left",
                      colors.bg,
                      colors.border,
                      colors.hover,
                      "transition-all duration-200 hover:shadow-md"
                    )}
                    onClick={() => onSelect(suggestion)}
                  >
                    <div className="flex-1 space-y-2">
                      {/* Main content */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={cn("font-medium", colors.text)}>
                            {suggestion.structuredFormatting.mainText}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.structuredFormatting.secondaryText}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Badge variant="outline" className={cn("text-xs", colors.badge)}>
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                          <span className="text-slate-500">→</span>
                        </div>
                      </div>
                      
                      {/* Place details */}
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={cn("text-xs", colors.badge)}>
                          {suggestion.resultType}
                        </Badge>
                        {suggestion.types.slice(0, 2).map((type) => (
                          <Badge key={type} variant="outline" className="text-xs bg-slate-100 text-slate-600">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {suggestion.types.length > 2 && (
                          <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600">
                            +{suggestion.types.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Place ID for debugging */}
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {suggestion.placeId.substring(0, 16)}...
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Cancel button */}
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full mt-4"
          >
            Cancel
          </Button>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground bg-white p-3 rounded border">
          <p><strong>Types explained:</strong></p>
          <ul className="mt-1 space-y-1">
            <li>🏘️ <strong>Suburb:</strong> Residential areas and localities</li>
            <li>🛣️ <strong>Street:</strong> Roads, streets, and thoroughfares</li>
            <li>🏠 <strong>Address:</strong> Specific building addresses</li>
            <li>📍 <strong>General:</strong> Other geographic locations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 