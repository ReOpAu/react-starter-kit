"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Intent classification types
export type LocationIntent = "suburb" | "street" | "address" | "general";

// Result types for better UI display
export interface PlaceSuggestion {
  placeId: string;
  description: string;
  types: string[];
  matchedSubstrings: Array<{ length: number; offset: number }>;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
    main_text?: string;
    secondary_text?: string;
    main_text_matched_substrings?: Array<{ length: number; offset: number }>;
  };
  resultType: "suburb" | "street" | "address" | "general";
  confidence: number;
  suburb?: string; // 🎯 NEW: Extracted suburb/town from Places API
}

// 🎯 NEW: Helper function to extract suburb/town from Places API response
function extractSuburbFromPlacesSuggestion(suggestion: PlaceSuggestion): string | undefined {
  console.log(`[Suburb Extraction] Extracting suburb from: "${suggestion.description}"`);
  
  // Method 1: Extract from secondaryText (most reliable)
  if (suggestion.structuredFormatting.secondaryText) {
    const secondaryText = suggestion.structuredFormatting.secondaryText;
    
    // Extract the first part before the state (suburb is usually first)
    // Example: "Melbourne VIC, Australia" -> "Melbourne"
    const parts = secondaryText.split(',').map(part => part.trim());
    if (parts.length > 0) {
      const firstPart = parts[0];
      
      // Remove state abbreviations to get clean suburb name
      const suburb = firstPart.replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, '').trim();
      if (suburb && suburb !== firstPart) {
        console.log(`[Suburb Extraction] Found suburb in secondaryText: "${suburb}"`);
        return suburb;
      }
    }
  }
  
  // Method 2: Extract from full description
  if (suggestion.description) {
    const parts = suggestion.description.split(',').map(part => part.trim());
    
    // For addresses, suburb is typically in the second part
    // Example: "123 Collins Street, Melbourne VIC 3000, Australia"
    if (parts.length >= 2) {
      const possibleSuburb = parts[1];
      
      // Remove state and postcode to get clean suburb
      const suburb = possibleSuburb
        .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s*\d{4}?/i, '')
        .replace(/\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)$/i, '')
        .replace(/\s+\d{4}$/, '') // Remove postcode
        .trim();
        
      if (suburb && suburb.length > 0) {
        console.log(`[Suburb Extraction] Found suburb in description: "${suburb}"`);
        return suburb;
      }
    }
  }
  
  // Method 3: Check if the result itself is a suburb
  if (suggestion.resultType === "suburb" && suggestion.structuredFormatting.mainText) {
    const suburb = suggestion.structuredFormatting.mainText.trim();
    console.log(`[Suburb Extraction] Result is suburb type: "${suburb}"`);
    return suburb;
  }
  
  console.log(`[Suburb Extraction] Could not extract suburb from suggestion`);
  return undefined;
}

