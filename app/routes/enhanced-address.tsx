import { EnhancedPlaceSuggestions } from "~/components/EnhancedPlaceSuggestions";
import { GoogleMapsAutocomplete } from "~/components/GoogleMapsAutocomplete";

export default function EnhancedAddress() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Place Suggestions</h1>
          <p className="text-gray-600 mt-2">
            Advanced address lookup with automatic intent classification and result type filtering
          </p>
        </div>
        
        <EnhancedPlaceSuggestions />
        
        <div className="mt-8">
          <GoogleMapsAutocomplete />
        </div>
      </div>
    </div>
  );
} 