import { useCallback } from "react";
import type { Suggestion } from "~/stores/types";

export function useAddressValidation() {
	const extractState = useCallback((str: string): string | null => {
		const match = str.match(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
		return match ? match[1].toUpperCase() : null;
	}, []);
	
	const validateSingleSuggestion = useCallback((
		suggestion: Suggestion,
		searchQuery: string
	): { shouldAutoSelect: boolean; showLowConfidence: boolean } => {
		const userState = extractState(searchQuery);
		const resultState = extractState(suggestion.description);
		
		const highConfidence = (suggestion.confidence ?? 1) >= 0.8;
		const stateMatches = !userState || !resultState || userState === resultState;
		
		if (highConfidence && stateMatches) {
			return { shouldAutoSelect: true, showLowConfidence: false };
		}
		
		return { shouldAutoSelect: false, showLowConfidence: true };
	}, [extractState]);
	
	const validateAddressFormat = useCallback((address: string): boolean => {
		// Basic Australian address format validation
		const australianAddressPattern = /^[\d\w\s\-\/,.']+,?\s*(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}$/i;
		return australianAddressPattern.test(address.trim());
	}, []);
	
	const validatePostcode = useCallback((postcode: string, state?: string): boolean => {
		const postcodeNum = parseInt(postcode, 10);
		if (isNaN(postcodeNum) || postcode.length !== 4) return false;
		
		// Australian postcode ranges by state
		const stateRanges: Record<string, [number, number][]> = {
			NSW: [[1000, 1999], [2000, 2599], [2619, 2899], [2921, 2999]],
			ACT: [[200, 299], [2600, 2618], [2900, 2920]],
			VIC: [[3000, 3999], [8000, 8999]],
			QLD: [[4000, 4999], [9000, 9999]],
			SA: [[5000, 5999]],
			WA: [[6000, 6797], [6800, 6999]],
			TAS: [[7000, 7999]],
			NT: [[800, 999]],
		};
		
		if (!state) return true; // Can't validate without state
		
		const ranges = stateRanges[state.toUpperCase()];
		if (!ranges) return false;
		
		return ranges.some(([min, max]) => postcodeNum >= min && postcodeNum <= max);
	}, []);
	
	return {
		extractState,
		validateSingleSuggestion,
		validateAddressFormat,
		validatePostcode,
	};
}