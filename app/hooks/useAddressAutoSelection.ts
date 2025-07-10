import { useCallback, useEffect, useState } from "react";
import { useIntentStore } from "~/stores/intentStore";
import { useUIStore } from "~/stores/uiStore";
import type { Suggestion } from "~/stores/types";

interface AutoCorrectionData {
	hasCorrection: boolean;
	suburbChanged: boolean;
	postcodeChanged: boolean;
	stateChanged: boolean;
	originalSuburb: string | null;
	correctedSuburb: string | null;
	originalPostcode: string | null;
	correctedPostcode: string | null;
	originalState: string | null;
	correctedState: string | null;
}

interface UseAddressAutoSelectionProps {
	suggestions: Suggestion[];
	isLoading: boolean;
	isError: boolean;
	onSelectResult: (result: Suggestion) => void;
}

/**
 * Custom hook for handling automatic address selection with auto-correction detection
 * Manages confidence scoring, auto-correction penalties, and smart selection logic
 */
export function useAddressAutoSelection({
	suggestions,
	isLoading,
	isError,
	onSelectResult,
}: UseAddressAutoSelectionProps) {
	const { searchQuery, selectedResult, currentIntent } = useIntentStore();
	const { isRecording } = useUIStore();
	
	const [showLowConfidence, setShowLowConfidence] = useState(false);
	const [currentAutoCorrection, setCurrentAutoCorrection] = useState<AutoCorrectionData | null>(null);

	// Logging utility
	const log = useCallback((...args: unknown[]) => {
		if (useUIStore.getState().isLoggingEnabled) {
			console.log("[useAddressAutoSelection]", ...args);
		}
	}, []);

	// Helper functions for text extraction
	const extractState = useCallback((str: string): string | null => {
		const match = str.match(/\b(NSW|VIC|QLD|WA|SA|TAS|NT|ACT)\b/i);
		return match ? match[1].toUpperCase() : null;
	}, []);

	const extractSuburb = useCallback((str: string): string | null => {
		const parts = str.split(',');
		if (parts.length >= 2) {
			// Handle different address formats:
			// Format 1: "Footscray, Victoria" -> suburb is first part
			// Format 2: "123 Main St, Footscray, VIC 3011" -> suburb is second part
			
			if (parts.length === 2) {
				// Two parts: likely "suburb, state" format
				const firstPart = parts[0].trim();
				const secondPart = parts[1].trim();
				
				// Check if second part is a state abbreviation
				const stateMatch = secondPart.match(/^\s*(NSW|VIC|QLD|WA|SA|TAS|NT|ACT|Victoria|Queensland|Tasmania|Australia)\b/i);
				if (stateMatch) {
					// Second part is state/country, so suburb is first part
					return firstPart;
				}
				
				// Fallback to second part (original behavior)
				return secondPart.split(' ')[0];
			} else {
				// Three or more parts: likely "street, suburb, state postcode" format
				const suburbPart = parts[1].trim();
				return suburbPart.split(' ')[0];
			}
		}
		return null;
	}, []);

	const extractPostcode = useCallback((str: string): string | null => {
		const match = str.match(/\b\d{4}\b/);
		return match ? match[0] : null;
	}, []);

	// Auto-correction detection logic
	const detectAutoCorrection = useCallback((input: string, output: string): AutoCorrectionData => {
		const inputSuburb = extractSuburb(input);
		const outputSuburb = extractSuburb(output);
		const inputPostcode = extractPostcode(input);
		const outputPostcode = extractPostcode(output);
		const inputState = extractState(input);
		const outputState = extractState(output);

		// Check for suburb changes (low consequence)
		const suburbChanged = Boolean(inputSuburb && outputSuburb && 
			inputSuburb.toLowerCase() !== outputSuburb.toLowerCase());

		// Check for postcode changes (medium consequence)  
		const postcodeChanged = Boolean(inputPostcode && outputPostcode && 
			inputPostcode !== outputPostcode);

		// Check for state changes (high consequence)
		const stateChanged = Boolean(inputState && outputState && 
			inputState !== outputState);

		// Check for significant address reformatting
		const inputWords = input.toLowerCase().split(/\s+/);
		const outputWords = output.toLowerCase().split(/\s+/);
		const sharedWords = inputWords.filter(word => 
			outputWords.some(outWord => outWord.includes(word) || word.includes(outWord))
		);
		const similarityRatio = sharedWords.length / Math.max(inputWords.length, 1);
		const significantReformatting = similarityRatio < 0.6;

		return {
			hasCorrection: suburbChanged || postcodeChanged || stateChanged || significantReformatting,
			suburbChanged,
			postcodeChanged,
			stateChanged,
			originalSuburb: inputSuburb,
			correctedSuburb: outputSuburb,
			originalPostcode: inputPostcode,
			correctedPostcode: outputPostcode,
			originalState: inputState,
			correctedState: outputState,
		};
	}, [extractSuburb, extractPostcode, extractState]);

	// Confidence threshold calculation
	const getConfidenceThreshold = useCallback(() => {
		const baseThreshold = isRecording ? 0.65 : 0.72; // Voice vs manual

		// Intent-based adjustments
		switch (currentIntent) {
			case "address":
				return baseThreshold + 0.05; // Higher bar for addresses
			case "suburb":
				return baseThreshold - 0.03; // More tolerant for suburbs
			case "street":
				return baseThreshold; // Standard threshold
			case "general":
				return baseThreshold - 0.08; // Most tolerant for general
			default:
				return baseThreshold;
		}
	}, [isRecording, currentIntent]);

	// Enhanced auto-select logic with auto-correction detection
	useEffect(() => {
		if (
			isRecording &&
			!selectedResult &&
			suggestions.length === 1 &&
			!isLoading &&
			!isError
		) {
			const suggestion = suggestions[0];
			const userState = extractState(searchQuery);
			const resultState = extractState(suggestion.description);

			// === DETECT AUTO-CORRECTIONS ===
			const autoCorrection = detectAutoCorrection(searchQuery, suggestion.description);
			
			// === ADAPTIVE CONFIDENCE THRESHOLDS ===
			const baseConfidence = suggestion.confidence ?? 0.5;
			const confidenceThreshold = getConfidenceThreshold();
			
			// === APPLY AUTO-CORRECTION PENALTIES ===
			let adjustedConfidence = baseConfidence;
			
			if (autoCorrection.hasCorrection) {
				// Apply penalties based on consequence level
				if (autoCorrection.stateChanged) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.4); // Heavy penalty for state changes (high consequence)
					log(`🔄 State auto-correction detected: ${autoCorrection.originalState} → ${autoCorrection.correctedState}`);
				}
				
				if (autoCorrection.postcodeChanged) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.1); // Medium penalty for postcode changes
					log(`🔄 Postcode auto-correction detected: ${autoCorrection.originalPostcode} → ${autoCorrection.correctedPostcode}`);
				}
				
				if (autoCorrection.suburbChanged) {
					adjustedConfidence = Math.max(0.1, adjustedConfidence - 0.05); // Light penalty for suburb changes (low consequence)
					log(`🔄 Suburb auto-correction detected: ${autoCorrection.originalSuburb} → ${autoCorrection.correctedSuburb}`);
				}
			}

			const highConfidence = adjustedConfidence >= confidenceThreshold;
			const stateMatches = !userState || !resultState || userState === resultState;

			// === ENHANCED AUTO-SELECTION LOGIC ===
			if (highConfidence && stateMatches) {
				// Store auto-correction information
				setCurrentAutoCorrection(autoCorrection);
				
				// Check if suburb was corrected - show confirmation instead of auto-selecting
				if (autoCorrection.suburbChanged) {
					log(`🔄 Suburb correction detected: ${autoCorrection.originalSuburb} → ${autoCorrection.correctedSuburb} - showing confirmation`);
					setShowLowConfidence(true); // Show confirmation UI for suburb changes
				} else {
					// Auto-select without suburb corrections
					const logMessage = autoCorrection.hasCorrection 
						? `🎯 Auto-selecting with minor correction (confidence ${Math.round(adjustedConfidence * 100)}%)` 
						: `🎯 Auto-selecting with confidence ${Math.round(adjustedConfidence * 100)}% (threshold: ${Math.round(confidenceThreshold * 100)}%)`;
					
					log(logMessage);
					
					// Create a suggestion with the corrected description as the display text
					const suggestionWithDescription = {
						...suggestion,
						// Use the Google-corrected description instead of the original transcription
						displayText: suggestion.description
					};
					
					log(`🔧 Auto-correction: Setting displayText to "${suggestion.description}" for input "${searchQuery}"`);
					onSelectResult(suggestionWithDescription);
					setShowLowConfidence(false);
				}
			} else {
				// Show low confidence UI with detailed reasoning
				const reasons = [];
				if (adjustedConfidence < confidenceThreshold) {
					reasons.push(`confidence ${Math.round(adjustedConfidence * 100)}% < ${Math.round(confidenceThreshold * 100)}%`);
				}
				if (!stateMatches) {
					reasons.push(`state mismatch (${userState} vs ${resultState})`);
				}
				if (autoCorrection.hasCorrection) {
					reasons.push('auto-correction detected');
				}
				
				log(`⚠️ Low confidence: ${reasons.join(', ')}`);
				setShowLowConfidence(true);
			}
		} else {
			setShowLowConfidence(false);
			setCurrentAutoCorrection(null); // Clear auto-correction when not showing suggestions
		}
	}, [
		isRecording,
		selectedResult,
		suggestions,
		isLoading,
		isError,
		onSelectResult,
		searchQuery,
		extractState,
		detectAutoCorrection,
		getConfidenceThreshold,
		log,
	]);

	return {
		showLowConfidence,
		autoCorrection: currentAutoCorrection,
	};
}