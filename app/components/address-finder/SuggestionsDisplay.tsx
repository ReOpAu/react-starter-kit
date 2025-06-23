import React from 'react';
import { Card, CardContent } from '~/components/ui/card';
import { type Suggestion } from '~/stores/addressFinderStore';
import { Button } from '~/components/ui/button';

interface SuggestionsDisplayProps {
  suggestions?: Suggestion[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onSelect: (suggestion: Suggestion) => void;
}

const SuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
  suggestions,
  isLoading,
  isError,
  error,
  onSelect,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        <span className="ml-2">Searching...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">❌</span>
            <p className="text-red-700">{error?.message || 'An unknown error occurred'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null; // Or a "No results" message
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <ul className="space-y-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion.placeId}>
              <Button
                variant="ghost"
                className="w-full justify-start text-left h-auto"
                onClick={() => onSelect(suggestion)}
              >
                {suggestion.description}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default SuggestionsDisplay; 