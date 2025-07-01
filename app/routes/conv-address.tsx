import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useRef, useEffect, useReducer } from 'react';
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { useSuburbAutocomplete, type SuburbResult } from "~/hooks/useSuburbAutocomplete";
import { useSpellingAutocomplete } from "~/hooks/useSpellingAutocomplete";
import { useEnhancedPlaceSuggestions, type EnhancedPlaceSuggestion } from "~/hooks/useEnhancedPlaceSuggestions";
import { EnhancedPlaceSuggestionsDisplay } from "~/components/EnhancedPlaceSuggestionsDisplay";
import { VoiceIndicator } from "~/components/conversation/VoiceIndicator";
import { ShinyButton } from "~/components/ui/magicui/shiny-button";
import { RainbowButton } from "~/components/ui/magicui/rainbow-button";
import { DebugTools } from "~/components/conversation/DebugTools";
import { useQueryClient } from '@tanstack/react-query';

// === CONSOLIDATED STATE MANAGEMENT ===

// Consolidated State Types
interface VoiceTranscription {
  text: string;
  timestamp: number;
  isSpelling?: boolean;
}

interface SearchHistoryItem {
  input: string;
  result: string | null;
  timestamp: number;
  isAgentCall?: boolean;
}

interface AgentToolCall {
  tool: string;
  input: string;
  result: string;
  timestamp: number;
}

interface PlaceData {
  description: string;
  mainText: string;
  secondaryText: string;
  placeId: string;
  resultType: string;
  confidence: number;
  types: string[];
  lat?: number;
  lng?: number;
}

// Core UI State (Consolidated)
interface CoreUIState {
  // Voice/Recording State
  isVoiceActive: boolean;
  isRecording: boolean;
  voiceTranscriptions: VoiceTranscription[];
  
  // Input State
  manualInput: string;
  testInput: string;
  
  // History State
  searchHistory: SearchHistoryItem[];
  agentToolCalls: AgentToolCall[];
  
  // Results State
  multipleResults: SuburbResult[];
  selectedResult: SuburbResult | null;
  showMultipleResults: boolean;
  currentPlaceData: PlaceData | null;
  
  // UI Control State
  isClientMounted: boolean;
  currentMode: 'idle' | 'searching' | 'selecting' | 'confirmed' | 'confirming';
  lastAction: string | null;
}

// State Actions
type CoreUIAction =
  | { type: 'SET_VOICE_ACTIVE'; payload: boolean }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'ADD_TRANSCRIPTION'; payload: VoiceTranscription }
  | { type: 'SET_MANUAL_INPUT'; payload: string }
  | { type: 'SET_TEST_INPUT'; payload: string }
  | { type: 'ADD_SEARCH_HISTORY'; payload: SearchHistoryItem }
  | { type: 'ADD_TOOL_CALL'; payload: AgentToolCall }
  | { type: 'SET_MULTIPLE_RESULTS'; payload: SuburbResult[] }
  | { type: 'SET_SELECTED_RESULT'; payload: SuburbResult | null }
  | { type: 'SET_SHOW_MULTIPLE_RESULTS'; payload: boolean }
  | { type: 'SET_CURRENT_PLACE_DATA'; payload: PlaceData | null }
  | { type: 'SET_CLIENT_MOUNTED'; payload: boolean }
  | { type: 'SET_MODE'; payload: { mode: CoreUIState['currentMode']; action: string } }
  | { type: 'RESET_RESULTS' }
  | { type: 'CLEAR_ALL' };

// Initial State
const initialCoreUIState: CoreUIState = {
  isVoiceActive: false,
  isRecording: false,
  voiceTranscriptions: [],
  manualInput: '',
  testInput: '',
  searchHistory: [],
  agentToolCalls: [],
  multipleResults: [],
  selectedResult: null,
  showMultipleResults: false,
  currentPlaceData: null,
  isClientMounted: false,
  currentMode: 'idle',
  lastAction: null,
};

// State Reducer
function coreUIReducer(state: CoreUIState, action: CoreUIAction): CoreUIState {
  switch (action.type) {
    case 'SET_VOICE_ACTIVE':
      return { ...state, isVoiceActive: action.payload };
    
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload,
        currentMode: action.payload ? 'searching' : 'idle',
        lastAction: action.payload ? 'start_recording' : 'stop_recording'
      };
    
    case 'ADD_TRANSCRIPTION':
      return {
        ...state,
        voiceTranscriptions: [...state.voiceTranscriptions, action.payload]
      };
    
    case 'SET_MANUAL_INPUT':
      return { ...state, manualInput: action.payload };
    
    case 'SET_TEST_INPUT':
      return { ...state, testInput: action.payload };
    
    case 'ADD_SEARCH_HISTORY':
      return {
        ...state,
        searchHistory: [action.payload, ...state.searchHistory.slice(0, 9)]
      };
    
    case 'ADD_TOOL_CALL':
      return {
        ...state,
        agentToolCalls: [action.payload, ...state.agentToolCalls.slice(0, 9)]
      };
    
    case 'SET_MULTIPLE_RESULTS':
      return {
        ...state,
        multipleResults: action.payload,
        showMultipleResults: action.payload.length > 0,
        currentMode: action.payload.length > 0 ? 'selecting' : 'idle',
        lastAction: 'show_multiple_results'
      };
    
    case 'SET_SELECTED_RESULT':
      return {
        ...state,
        selectedResult: action.payload,
        showMultipleResults: false,
        currentMode: action.payload ? 'confirmed' : 'idle',
        lastAction: action.payload ? 'select_result' : 'clear_selection'
      };
    
    case 'SET_SHOW_MULTIPLE_RESULTS':
      return { ...state, showMultipleResults: action.payload };
    
    case 'SET_CURRENT_PLACE_DATA':
      return { ...state, currentPlaceData: action.payload };
    
    case 'SET_CLIENT_MOUNTED':
      return { ...state, isClientMounted: action.payload };
    
    case 'SET_MODE':
      return {
        ...state,
        currentMode: action.payload.mode,
        lastAction: action.payload.action
      };
    
    case 'RESET_RESULTS':
      return {
        ...state,
        multipleResults: [],
        selectedResult: null,
        showMultipleResults: false,
        currentPlaceData: null,
        currentMode: 'idle',
        lastAction: 'reset_results'
      };
    
    case 'CLEAR_ALL':
      return {
        ...initialCoreUIState,
        isClientMounted: state.isClientMounted,
        lastAction: 'clear_all'
      };
    
    default:
      return state;
  }
}

// === END CONSOLIDATED STATE MANAGEMENT ===

// === UI STATE SYNCHRONIZATION HOOK ===

function useUIStateSync(
  coreState: CoreUIState, 
  externalState: { 
    suggestions: any[]; 
    canonicalSuburb: string | null;
  }
) {
  const syncToElevenLabs = useCallback(() => {
    try {
      const windowWithElevenLabs = window as typeof window & {
        setVariable?: (name: string, value: unknown) => void;
      };
      
      if (typeof windowWithElevenLabs.setVariable === 'function') {
        // Consolidated UI state for agent
        const derivedUIState = {
          isRecording: coreState.isRecording,
          isSpellingMode: externalState.suggestions.length > 0,
          hasResults: externalState.canonicalSuburb !== null || coreState.selectedResult !== null,
          hasMultipleResults: coreState.showMultipleResults,
          hasSelectedResult: coreState.selectedResult !== null,
          currentMode: coreState.currentMode,
          resultCount: coreState.multipleResults.length,
          spellingActive: externalState.suggestions.length > 0,
          lastUserAction: coreState.lastAction,
          timestamp: Date.now()
        };
        
        // Core UI state
        windowWithElevenLabs.setVariable("uiState", derivedUIState);
        
        // Individual flags for agent convenience
        windowWithElevenLabs.setVariable("isRecording", derivedUIState.isRecording);
        windowWithElevenLabs.setVariable("isSpellingMode", derivedUIState.isSpellingMode);
        windowWithElevenLabs.setVariable("hasResults", derivedUIState.hasResults);
        windowWithElevenLabs.setVariable("hasMultipleResults", derivedUIState.hasMultipleResults);
        windowWithElevenLabs.setVariable("hasSelectedResult", derivedUIState.hasSelectedResult);
        windowWithElevenLabs.setVariable("currentMode", derivedUIState.currentMode);
        
        // Result data
        windowWithElevenLabs.setVariable("currentFoundResult", externalState.canonicalSuburb);
        windowWithElevenLabs.setVariable("currentSelectedResult", coreState.selectedResult?.canonicalSuburb || null);
        windowWithElevenLabs.setVariable("currentMultipleResults", coreState.multipleResults.map(r => r.canonicalSuburb));
        windowWithElevenLabs.setVariable("currentSpellingCandidates", externalState.suggestions.map((s: any) => s.address));
        
        console.log('[UISync] Synced consolidated state to ElevenLabs:', derivedUIState);
      }
    } catch (error) {
      console.log('[UISync] ElevenLabs variables not available:', error);
    }
  }, [coreState, externalState]);

  return { syncToElevenLabs };
}

// === END UI STATE SYNCHRONIZATION HOOK ===


interface AddressMatch {
  address: string;
  confidence: number;
  matchType: string;
  placeId: string;
  addressType: string;
  googleRank: number;
  sessionToken?: string;
}

// === TYPE GUARD HELPERS ===

function isAddressSearchParams(params: unknown): params is { address: string } {
  if (typeof params !== 'object' || params === null) return false;
  if (!('address' in params)) return false;
  // Now params is an object with 'address' property
  const maybeObj = params as Record<string, unknown>;
  return typeof maybeObj.address === 'string';
}

function isConfirmPlaceParams(
  params: unknown
): params is { results: Array<{ type: string; place_id: string; label: string }> } {
  if (typeof params !== 'object' || params === null) return false;

  // Check if 'results' property exists and is an array
  const maybeObj = params as Record<string, unknown>;
  if (!('results' in maybeObj)) return false;
  const results = maybeObj.results;
  if (!Array.isArray(results)) return false;

  // Check that every element in the array has the required properties and types
  return results.every((r) => {
    if (typeof r !== 'object' || r === null) return false;
    const obj = r as Record<string, unknown>;
    return (
      typeof obj.type === 'string' &&
      typeof obj.place_id === 'string' &&
      typeof obj.label === 'string'
    );
  });
}

export default function ConvAddress() {
  // === CONSOLIDATED STATE WITH useReducer ===
  const [coreState, dispatch] = useReducer(coreUIReducer, initialCoreUIState);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const { 
    lookupSuburb, 
    lookupSuburbEnhanced, 
    lookupSuburbMultiple, 
    canonicalSuburb, 
    enhancedResult, 
    isLoading, 
    error, 
    reset,
    setResult 
  } = useSuburbAutocomplete();
  
  // Enhanced autocomplete action for AI agent
  const enhancedAutocompleteAction = useAction(api.autocomplete.autocompleteAddresses);

  // New enhanced autocomplete hook
  const { 
    suggestions,
    isLoading: isAutocompleteLoading, 
    error: autocompleteError,
    getSuggestions,
    debouncedGetSuggestions,
    resetSession,
    clearSuggestions
  } = useSpellingAutocomplete({
    // Add Melbourne location bias for better Australian results
    location: { lat: -37.8136, lng: 144.9631 },
    radius: 100000, // 100km radius around Melbourne
    minLength: 2,
    debounceMs: 300
  });

  // Enhanced place suggestions hook (new intent-based system)
  const {
    searchPlaces,
    isLoading: isEnhancedLoading,
    error: enhancedError,
    lastResult: enhancedPlaceResult,
    reset: resetEnhanced
  } = useEnhancedPlaceSuggestions({
    location: { lat: -37.8136, lng: 144.9631 },
    radius: 100000,
    maxResults: 8
  });

  // UI State Synchronization with extracted hook
  const { syncToElevenLabs } = useUIStateSync(coreState, { suggestions, canonicalSuburb });

  const queryClient = useQueryClient();

  // Optimized state update functions using dispatch
  const updateRecording = useCallback((recording: boolean) => {
    dispatch({ type: 'SET_RECORDING', payload: recording });
  }, []);

  const updateMultipleResults = useCallback((results: SuburbResult[]) => {
    dispatch({ type: 'SET_MULTIPLE_RESULTS', payload: results });
  }, []);

  const updateSelectedResult = useCallback((result: SuburbResult | null) => {
    dispatch({ type: 'SET_SELECTED_RESULT', payload: result });
  }, []);

  const addSearchHistory = useCallback((item: SearchHistoryItem) => {
    dispatch({ type: 'ADD_SEARCH_HISTORY', payload: item });
  }, []);

  const addToolCall = useCallback((call: AgentToolCall) => {
    dispatch({ type: 'ADD_TOOL_CALL', payload: call });
  }, []);



  const conversation = useConversation({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    onConnect: () => {
      console.log('Connected to ElevenLabs');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
    },
    
    clientTools: {
      // Tool 1: AddressSearch - Enhanced with UI state awareness
      AddressSearch: async (params: unknown) => {
        try {
          // Update UI state to show searching

          console.log('[ClientTool] AddressSearch called with params:', params);
          console.log('[ClientTool] Params type:', typeof params, 'Value:', JSON.stringify(params));
          
          // Handle different parameter formats that ElevenLabs might send
          let address: string = '';
          if (typeof params === 'string') {
            address = params;
          } else if (isAddressSearchParams(params)) {
            address = params.address;
          } else if (
            typeof params === 'object' &&
            params !== null
          ) {
            const paramObj = params as Record<string, unknown>;
            // Try multiple possible property names and also check nested objects
            const dataObj =
              typeof paramObj.data === 'object' && paramObj.data !== null
                ? (paramObj.data as Record<string, unknown>)
                : undefined;
            address = String(
              paramObj.address ||
                paramObj.suburb ||
                paramObj.location ||
                paramObj.query ||
                paramObj.text ||
                paramObj.input ||
                paramObj.value ||
                (dataObj &&
                  (dataObj.address ||
                    dataObj.suburb)) ||
                ''
            );
          } else {
            address = '';
          }
          
          console.log('[ClientTool] Extracted address:', address);
          
          if (!address || typeof address !== 'string' || address.trim() === '') {
            console.log('[ClientTool] Invalid address parameter. Received:', params);
            console.log('[ClientTool] Expected format: { address: "suburb name" } or just "suburb name"');
            
            // If we have existing multiple results, suggest the user clarify
            if (coreState.showMultipleResults && coreState.multipleResults.length > 0) {
              const locations = coreState.multipleResults.map((r: SuburbResult) => r.canonicalSuburb).join(', ');
              return `I have multiple results available: ${locations}. Please specify which one you mean by saying something like "the one in Victoria" or "the one in New South Wales".`;
            }
            
            return 'I need an address or suburb name to look up. Please try asking something like "look up Richmond" or "find Yarraville".';
          }
          
          // Visual indicator that agent is calling the tool
          const toolCallStart = Date.now();
          
          // Detect if this looks like a full address for Address Validation API
          const looksLikeFullAddress = /^\d+\s/.test(address.trim());
          if (looksLikeFullAddress) {
            console.log('[ClientTool] Detected full address - will use Address Validation API first');
          }
          
          // Check if this is a clarification for existing multiple results
          if (coreState.showMultipleResults && coreState.multipleResults.length > 0) {
            console.log('[ClientTool] Checking for clarification against existing results');
            
            // Enhanced intent-aware clarification matching
            let matchedResult = null;
            
            // First, try to match by intent keywords
            const intentKeywords = {
              suburb: ['suburb', 'area', 'locality', 'neighborhood', 'neighbourhood'],
              street: ['street', 'road', 'avenue', 'lane', 'drive', 'way'],
              address: ['address', 'building', 'house', 'number', 'unit']
            };
            
            const lowerInput = address.toLowerCase();
            
            // Check for intent clarification (e.g., "I meant the suburb")
            for (const [intent, keywords] of Object.entries(intentKeywords)) {
              if (keywords.some(keyword => lowerInput.includes(keyword))) {
                // Find the first result that matches this intent
                matchedResult = coreState.multipleResults.find((result: SuburbResult) => {
                  // Classify the result type based on its properties
                  const resultTypes = result.types || [];
                  if (intent === 'suburb' && (resultTypes.includes('locality') || resultTypes.includes('sublocality'))) {
                    return true;
                  }
                  if (intent === 'street' && resultTypes.includes('route')) {
                    return true;
                  }
                  if (intent === 'address' && resultTypes.includes('street_address')) {
                    return true;
                  }
                  return false;
                });
                
                if (matchedResult) {
                  console.log(`[ClientTool] Found intent-based match for ${intent}:`, matchedResult);
                  break;
                }
              }
            }
            
            // If no intent match, try location-based matching
            if (!matchedResult) {
              const locationKeywords = ['victoria', 'vic', 'nsw', 'new south wales', 'queensland', 'qld', 'south australia', 'sa', 'western australia', 'wa', 'tasmania', 'tas', 'act'];
              
              for (const keyword of locationKeywords) {
                if (lowerInput.includes(keyword)) {
                  matchedResult = coreState.multipleResults.find((result: SuburbResult) => 
                    result.canonicalSuburb.toLowerCase().includes(keyword)
                  );
                  if (matchedResult) {
                    console.log(`[ClientTool] Found location-based match for ${keyword}:`, matchedResult);
                    break;
                  }
                }
              }
            }
            
            // Fallback to original name-based matching
            if (!matchedResult) {
              matchedResult = coreState.multipleResults.find((result: SuburbResult) => {
                const canonical = result.canonicalSuburb.toLowerCase();
                
                // Check for exact match or if input contains key parts of the canonical name
                return canonical.includes(lowerInput) || 
                       lowerInput.includes(canonical) ||
                       canonical.split(' ').some((part: string) => lowerInput.includes(part.toLowerCase()) && part.length > 2) ||
                       canonical.split(',').some((part: string) => lowerInput.includes(part.trim().toLowerCase()));
              });
            }
            
            if (matchedResult) {
              console.log('[ClientTool] Found matching result for clarification:', matchedResult);
              
              // Clear previous results first, then set the confirmed result
              reset(); // Clear the old "Found:" section
              setResult(matchedResult);
              // Also set the selected result to show in Selected Result section
              updateSelectedResult(matchedResult);
              dispatch({ type: 'SET_SHOW_MULTIPLE_RESULTS', payload: false });
              resetEnhanced(); // Clear enhanced place suggestions to avoid UI conflicts
              
              // Create intent-aware confirmation response
              const resultType = matchedResult.types?.includes('locality') ? 'suburb' :
                               matchedResult.types?.includes('route') ? 'street' :
                               matchedResult.types?.includes('street_address') ? 'address' : 'location';
              
              const typeEmoji: Record<string, string> = {
                suburb: '🏘️',
                street: '🛣️',
                address: '🏠'
              };
              const emoji = typeEmoji[resultType] || '📍';
              
              const responseMessage = `Perfect! ${emoji} I've confirmed you meant ${matchedResult.canonicalSuburb}. ` +
                `This is a ${resultType} in the Google Places database. Thank you for clarifying!`;
              
              // Add to search history with the confirmed result
              addSearchHistory({
                input: `Clarified: ${address} → ${matchedResult.canonicalSuburb}`,
                result: matchedResult.canonicalSuburb,
                timestamp: toolCallStart,
                isAgentCall: true
              });
              
                        // Track the agent tool call
          addToolCall({
            tool: 'AddressSearch',
            input: address,
            result: responseMessage,
            timestamp: toolCallStart
          });
              
              return responseMessage;
            }
          }
          
          let responseMessage: string;

          // Enhanced address detection for residential addresses
          const addressPatterns = {
            // Full residential address patterns
            fullAddress: /^\d+[a-zA-Z]?\s+.+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|place|pl|court|ct|circuit|cct|crescent|cres|close|cl|boulevard|blvd|terrace|tce|parade|pde|grove|gr|walk|wlk|rise|highway|hwy|esplanade|esp)\s*,?\s*.+$/i,
            // Unit/apartment addresses
            unitAddress: /^(unit|apt|apartment|u|flat|f)\s*\d+[a-zA-Z]?\/?\s*\d+[a-zA-Z]?\s+.+\s+(street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|place|pl|court|ct|circuit|cct|crescent|cres|close|cl|boulevard|blvd|terrace|tce|parade|pde|grove|gr|walk|wlk|rise|highway|hwy|esplanade|esp)\s*,?\s*.+$/i,
            // Simple number + street pattern
            simpleAddress: /^\d+[a-zA-Z]?\s+\w+/
          };

          const isFullResidentialAddress = addressPatterns.fullAddress.test(address.trim()) || 
                                         addressPatterns.unitAddress.test(address.trim()) ||
                                         (addressPatterns.simpleAddress.test(address.trim()) && address.includes(','));

          console.log('[ClientTool] Address analysis:', {
            input: address,
            isFullResidentialAddress,
            fullAddressMatch: addressPatterns.fullAddress.test(address.trim()),
            unitAddressMatch: addressPatterns.unitAddress.test(address.trim()),
            simpleAddressMatch: addressPatterns.simpleAddress.test(address.trim())
          });

          // First try the Address Validation API for full residential addresses
          if (isFullResidentialAddress) {
            console.log('[ClientTool] Detected full residential address - using Address Validation API for validation');
            try {
              const autocompleteResults = await enhancedAutocompleteAction({
                partialInput: address,
                maxResults: 3,
                sessionToken: crypto.randomUUID()
              });
              console.log('[ClientTool] Address Validation API results:', autocompleteResults);

              if (autocompleteResults && autocompleteResults.length > 0) {
                const firstResult = autocompleteResults[0];
                
                // Check if Address Validation API was used
                const isAddressValidation = firstResult.matchType === 'address_validation';
                console.log('[ClientTool] Address Validation API used:', isAddressValidation);
                
                if (autocompleteResults.length === 1) {
                  // Single validated address result
                  responseMessage = `✅ Validated residential address: ${firstResult.address}. ` +
                    `${isAddressValidation ? '🏠 Confirmed using Google Address Validation API' : `📍 Found via ${firstResult.matchType}`} ` +
                    `with ${Math.round(firstResult.confidence * 100)}% confidence.`;
                  
                  console.log('[ClientTool] Single validated address result:', firstResult);
                  
                  // Convert to compatible format for UI
                  const compatibleResult = {
                    canonicalSuburb: firstResult.address,
                    placeId: firstResult.placeId,
                    geocode: { lat: 0, lng: 0 },
                    types: [firstResult.addressType]
                  };
                  
                  setResult(compatibleResult);
                  updateSelectedResult(compatibleResult);
                  
                  addSearchHistory({
                    input: `${address} (${isAddressValidation ? 'Address Validation API' : firstResult.matchType})`,
                    result: firstResult.address,
                    timestamp: toolCallStart,
                    isAgentCall: true
                  });
                  
                  // Track the agent tool call
                  addToolCall({
                    tool: 'AddressSearch',
                    input: address,
                    result: responseMessage,
                    timestamp: toolCallStart
                  });
                  
                  return responseMessage;
                }
                
                // Multiple validated addresses
                console.log('[ClientTool] Multiple address validation results - storing for selection:', autocompleteResults);
                
                const compatibleResults = autocompleteResults.map((result: any) => ({
                  canonicalSuburb: result.address,
                  placeId: result.placeId,
                  geocode: { lat: 0, lng: 0 },
                  types: [result.addressType]
                }));
                
                // Store results for ConfirmPlace tool to access
                const confirmPlaceResults = autocompleteResults.map((result: any) => ({
                  type: result.addressType,
                  place_id: result.placeId,
                  label: result.address
                }));
                
                // Store in ElevenLabs variables for agent access
                try {
                  const windowWithElevenLabs = window as typeof window & {
                    setVariable?: (name: string, value: unknown) => void;
                  };
                  if (typeof windowWithElevenLabs.setVariable === 'function') {
                    windowWithElevenLabs.setVariable("placeSuggestions", confirmPlaceResults);
                    windowWithElevenLabs.setVariable("lastSearchResults", confirmPlaceResults);
                    console.log('[AddressSearch] Stored multiple validated results in ElevenLabs variables:', confirmPlaceResults);
                  }
                } catch (varError) {
                  console.log('[AddressSearch] ElevenLabs variables not available:', varError);
                }
                
                // Update UI state
                updateMultipleResults(compatibleResults);
                
                addSearchHistory({
                  input: `${address} (Address Validation)`,
                  result: `${autocompleteResults.length} validated addresses`,
                  timestamp: toolCallStart,
                  isAgentCall: true
                });
                
                responseMessage = `Found ${autocompleteResults.length} validated addresses. I'll show you the options to choose from.`;
                
                // Track the agent tool call
                addToolCall({
                  tool: 'AddressSearch',
                  input: address,
                  result: responseMessage,
                  timestamp: toolCallStart
                });
                
                return responseMessage;
              }
              
              // Address Validation API rejected the address
              console.log('[ClientTool] Address Validation API rejected the residential address');
                             responseMessage = `❌ The address "${address}" could not be validated. The Google Address Validation API indicates this residential address does not exist or has invalid components. Please check the address format and try again.`;
              
              addSearchHistory({
                input: `${address} (Address Validation: Rejected)`,
                result: 'Invalid residential address',
                timestamp: toolCallStart,
                isAgentCall: true
              });
              
              // Track the agent tool call
              addToolCall({
                tool: 'AddressSearch',
                input: address,
                result: responseMessage,
                timestamp: toolCallStart
              });
              
              return responseMessage;
            } catch (validationError) {
              console.log('[ClientTool] Address Validation API error:', validationError);
              responseMessage = `⚠️ Address validation service is temporarily unavailable. Please try again later or contact support if the issue persists.`;
              
              addSearchHistory({
                input: `${address} (Validation Error)`,
                result: 'Service unavailable',
                timestamp: toolCallStart,
                isAgentCall: true
              });
              
              // Track the agent tool call
              addToolCall({
                tool: 'AddressSearch',
                input: address,
                result: responseMessage,
                timestamp: toolCallStart
              });
              
              return responseMessage;
            }
          }

          // For non-residential addresses (suburbs, streets, etc.), use the enhanced place suggestions system
          console.log('[ClientTool] Not a full residential address - using enhanced place suggestions for suburbs/streets...');

          // First try the new Address Validation API system for all addresses
          try {
            console.log('[ClientTool] Trying new autocomplete system with Address Validation API for:', address);
            const autocompleteResults = await enhancedAutocompleteAction({
              partialInput: address,
              maxResults: 8,
              sessionToken: crypto.randomUUID()
            });
            console.log('[ClientTool] Autocomplete results:', autocompleteResults);

            if (autocompleteResults && autocompleteResults.length > 0) {
              const firstResult = autocompleteResults[0];
              
              // Check if Address Validation API was used
              const isAddressValidation = firstResult.matchType === 'address_validation';
              console.log('[ClientTool] Address Validation API used:', isAddressValidation);
              
              if (autocompleteResults.length === 1) {
                // Single result from new system
                responseMessage = `Found ${isAddressValidation ? 'validated address' : 'address'}: ${firstResult.address}. ` +
                  `${isAddressValidation ? '✅ Validated using Address Validation API' : `📍 Found via ${firstResult.matchType}`} ` +
                  `with ${Math.round(firstResult.confidence * 100)}% confidence.`;
                
                console.log('[ClientTool] Single result from new system:', firstResult);
                
                // Convert to compatible format for UI
                const compatibleResult = {
                  canonicalSuburb: firstResult.address,
                  placeId: firstResult.placeId,
                  geocode: { lat: 0, lng: 0 },
                  types: [firstResult.addressType]
                };
                
                setResult(compatibleResult);
                updateSelectedResult(compatibleResult);
                
                addSearchHistory({
                  input: `${address} (${isAddressValidation ? 'Address Validation API' : firstResult.matchType})`,
                  result: firstResult.address,
                  timestamp: toolCallStart,
                  isAgentCall: true
                });
                
                return responseMessage;
              } else {
                // Multiple results from new system
                console.log('[ClientTool] Multiple results from new system - storing for ConfirmPlace:', autocompleteResults);
                
                interface AutocompleteResult {
                  address: string;
                  placeId: string;
                  addressType: string;
                }
                
                const compatibleResults = autocompleteResults.map((result: AutocompleteResult) => ({
                  canonicalSuburb: result.address,
                  placeId: result.placeId,
                  geocode: { lat: 0, lng: 0 },
                  types: [result.addressType]
                }));
                
                // Store results for ConfirmPlace tool to access
                const confirmPlaceResults = autocompleteResults.map((result: AutocompleteResult) => ({
                  type: result.addressType,
                  place_id: result.placeId,
                  label: result.address
                }));
                
                // Store in ElevenLabs variables for agent access
                try {
                  const windowWithElevenLabs = window as typeof window & {
                    setVariable?: (name: string, value: unknown) => void;
                  };
                  if (typeof windowWithElevenLabs.setVariable === 'function') {
                    windowWithElevenLabs.setVariable("placeSuggestions", confirmPlaceResults);
                    windowWithElevenLabs.setVariable("lastSearchResults", confirmPlaceResults);
                    console.log('[AddressSearch] Stored multiple results in ElevenLabs variables:', confirmPlaceResults);
                  }
                } catch (varError) {
                  console.log('[AddressSearch] ElevenLabs variables not available:', varError);
                }
                
                // Update UI state
                updateMultipleResults(compatibleResults);
                
                addSearchHistory({
                  input: `${address} (New System)`,
                  result: `${autocompleteResults.length} results`,
                  timestamp: toolCallStart,
                  isAgentCall: true
                });
                
                responseMessage = `Found ${autocompleteResults.length} addresses. I'll show you the options to choose from.`;
                
                return responseMessage;
              }
            }
            
            // For full addresses, if Address Validation API rejects them, don't fall back
            if (looksLikeFullAddress) {
              console.log('[ClientTool] Full address rejected by Address Validation API - not falling back');
              responseMessage = `I could not find "${address}". The Address Validation API indicates this address does not exist or has invalid components. Please check the address and try again.`;
              
              addSearchHistory({
                input: `${address} (Address Validation: Rejected)`,
                result: 'Invalid address',
                timestamp: toolCallStart,
                isAgentCall: true
              });
              
              // Track the agent tool call
              addToolCall({
                tool: 'AddressSearch',
                input: address,
                result: responseMessage,
                timestamp: toolCallStart
              });
              
              return responseMessage;
            }
            
            console.log('[ClientTool] Partial address - falling back to enhanced search for additional coverage...');
          } catch (autocompleteError) {
            console.log('[ClientTool] New autocomplete system failed:', autocompleteError);
            console.log('[ClientTool] Falling back to enhanced search...');
          }

          // Fallback to enhanced lookup using old intent-based place suggestions system
          try {
            console.log('[ClientTool] Calling enhanced place suggestions with:', address);
            const enhancedResults = await searchPlaces(address);
            console.log('[ClientTool] Enhanced place results:', enhancedResults);

            if (enhancedResults.success && enhancedResults.suggestions.length > 0) {
              const detectedIntent = enhancedResults.detectedIntent;
              const intentEmoji = {
                suburb: '🏘️',
                street: '🛣️', 
                address: '🏠',
                general: '📍'
              }[detectedIntent] || '📍';
              
              const intentLabel = {
                suburb: 'suburb',
                street: 'street',
                address: 'address', 
                general: 'location'
              }[detectedIntent] || 'location';

              if (enhancedResults.suggestions.length === 1) {
                // Single result - get full place details using Convex function
                const suggestion = enhancedResults.suggestions[0];
                console.log('[AddressSearch] Single result found, getting full details via Convex:', suggestion);
                
                try {
                  // Use the Convex function to get full place details including coordinates
                  const detailsResult = await lookupSuburbMultiple(suggestion.structuredFormatting.mainText, 1);
                  
                  if (detailsResult.success && 'results' in detailsResult && detailsResult.results.length > 0) {
                    // Got full place details with coordinates
                    const fullPlaceData = detailsResult.results[0];
                    console.log('[AddressSearch] Got full place details from Convex:', fullPlaceData);
                    
                    const confidence = Math.round(suggestion.confidence * 100);
                    
                    // Create structured place data with real coordinates
                    const structuredPlaceData = {
                      description: fullPlaceData.canonicalSuburb,
                      mainText: suggestion.structuredFormatting.mainText,
                      secondaryText: suggestion.structuredFormatting.secondaryText,
                      placeId: fullPlaceData.placeId,
                      resultType: suggestion.resultType,
                      confidence: confidence,
                      types: fullPlaceData.types,
                      lat: (fullPlaceData.geocode as { lat: number; lng: number } | undefined)?.lat ?? 0,
                      lng: (fullPlaceData.geocode as { lat: number; lng: number } | undefined)?.lng ?? 0
                    };

                    console.log('[AddressSearch] Creating structured place data with coordinates:', structuredPlaceData);

                    // Store place data in shared state for ConfirmPlace to access
                    dispatch({ type: 'SET_CURRENT_PLACE_DATA', payload: structuredPlaceData });
                    console.log('[AddressSearch] Stored place data in shared state:', structuredPlaceData);
                    
                    // Also store in ElevenLabs variables for agent access
                    try {
                      const windowWithElevenLabs = window as typeof window & {
                        setVariable?: (name: string, value: unknown) => void;
                      };
                      if (typeof windowWithElevenLabs.setVariable === 'function') {
                        windowWithElevenLabs.setVariable("placeSuggestions", structuredPlaceData);
                        windowWithElevenLabs.setVariable("lastSearchResult", structuredPlaceData);
                        console.log('[AddressSearch] Stored data in ElevenLabs variables');
                      }
                    } catch (varError) {
                      console.log('[AddressSearch] ElevenLabs variables not available:', varError);
                    }

                    // Create intent-aware response message
                    const geocode = fullPlaceData.geocode as { lat: number; lng: number } | undefined;
                    const coords = geocode && typeof geocode.lat === 'number' && typeof geocode.lng === 'number' ? `${geocode.lat.toFixed(6)}, ${geocode.lng.toFixed(6)}` : 'N/A';
                    responseMessage = `Perfect! I found the ${suggestion.resultType} you're looking for: ${suggestion.structuredFormatting.mainText}. ` +
                      `${intentEmoji} I detected you were searching for a ${intentLabel}, and this result matches with ${confidence}% confidence. ` +
                      `The full address is: ${fullPlaceData.canonicalSuburb}. ` +
                      `📍 Coordinates: ${coords}`;
                    
                    console.log('[AddressSearch] Response message:', responseMessage);
                    
                    // Update UI state with the full result including coordinates
                    setResult(fullPlaceData);
                    
                    // For single results, let ConfirmPlace handle the final confirmation
                    // Store the data for ConfirmPlace to access if needed
                    console.log('[AddressSearch] Found single result with coordinates:', fullPlaceData);
                    
                    addSearchHistory({
                      input: `${address} (${detectedIntent})`,
                      result: fullPlaceData.canonicalSuburb,
                      timestamp: toolCallStart,
                      isAgentCall: true
                    });
                    
                    return responseMessage;
                  }
                  
                  // Fallback if Convex lookup fails - use original autocomplete data
                  console.log('[AddressSearch] Convex lookup failed, using autocomplete data');
                  const confidence = Math.round(suggestion.confidence * 100);
                  
                  // Create structured place data for the agent to use with ConfirmPlace
                  const structuredPlaceData = {
                    description: suggestion.description,
                    mainText: suggestion.structuredFormatting.mainText,
                    secondaryText: suggestion.structuredFormatting.secondaryText,
                    placeId: suggestion.placeId,
                    resultType: suggestion.resultType,
                    confidence: confidence,
                    types: suggestion.types
                  };

                  console.log('[AddressSearch] Creating structured place data (no coordinates):', structuredPlaceData);

                  // Store place data in shared state for ConfirmPlace to access
                  dispatch({ type: 'SET_CURRENT_PLACE_DATA', payload: structuredPlaceData });
                  console.log('[AddressSearch] Stored fallback place data in shared state:', structuredPlaceData);

                  // Create intent-aware response message (clean)
                  responseMessage = `Perfect! I found the ${suggestion.resultType} you're looking for: ${suggestion.structuredFormatting.mainText}. ` +
                    `${intentEmoji} I detected you were searching for a ${intentLabel}, and this result matches with ${confidence}% confidence. ` +
                    `The full address is: ${suggestion.description}`;
                  
                  console.log('[AddressSearch] Response message (fallback):', responseMessage);
                  
                  // Update UI state with the found result so ConfirmPlace can access it
                  const compatibleResult = {
                    canonicalSuburb: suggestion.description,
                    placeId: suggestion.placeId,
                    geocode: {
                      lat: 0, // Coordinates not available from autocomplete API
                      lng: 0  // Would need Google Places Details API call
                    },
                    types: suggestion.types
                  };
                  
                  setResult(compatibleResult);
                  
                  // For single results, let ConfirmPlace handle the final confirmation
                  console.log('[AddressSearch] Found single result (fallback 1):', compatibleResult);
                  
                  addSearchHistory({
                    input: `${address} (${detectedIntent})`,
                    result: suggestion.description,
                    timestamp: toolCallStart,
                    isAgentCall: true
                  });
                  
                  return responseMessage;
                } catch (convexError) {
                  console.log('[AddressSearch] Convex lookup error:', convexError);
                  // Continue with fallback approach below
                  const confidence = Math.round(suggestion.confidence * 100);
                  
                  // Create structured place data for the agent to use with ConfirmPlace
                  const structuredPlaceData = {
                    description: suggestion.description,
                    mainText: suggestion.structuredFormatting.mainText,
                    secondaryText: suggestion.structuredFormatting.secondaryText,
                    placeId: suggestion.placeId,
                    resultType: suggestion.resultType,
                    confidence: confidence,
                    types: suggestion.types
                  };

                  console.log('[AddressSearch] Creating structured place data (error fallback):', structuredPlaceData);

                  // Store place data in shared state for ConfirmPlace to access
                  dispatch({ type: 'SET_CURRENT_PLACE_DATA', payload: structuredPlaceData });
                  console.log('[AddressSearch] Stored error fallback place data in shared state:', structuredPlaceData);

                  // Create intent-aware response message (clean)
                  responseMessage = `Perfect! I found the ${suggestion.resultType} you're looking for: ${suggestion.structuredFormatting.mainText}. ` +
                    `${intentEmoji} I detected you were searching for a ${intentLabel}, and this result matches with ${confidence}% confidence. ` +
                    `The full address is: ${suggestion.description}`;
                  
                  console.log('[AddressSearch] Response message (error fallback):', responseMessage);
                  
                  // Update UI state with the found result so ConfirmPlace can access it
                  const compatibleResult = {
                    canonicalSuburb: suggestion.description,
                    placeId: suggestion.placeId,
                    geocode: {
                      lat: 0, // Coordinates not available from autocomplete API
                      lng: 0  // Would need Google Places Details API call
                    },
                    types: suggestion.types
                  };
                  
                  setResult(compatibleResult);
                  
                  // For single results, let ConfirmPlace handle the final confirmation
                  console.log('[AddressSearch] Found single result (fallback 2):', compatibleResult);
                  
                  addSearchHistory({
                    input: `${address} (${detectedIntent})`,
                    result: suggestion.description,
                    timestamp: toolCallStart,
                    isAgentCall: true
                  });
                  
                  return responseMessage;
                }
              } else {
                // Multiple results - organize by result type for better response
                const resultsByType = enhancedResults.suggestions.reduce((acc: Record<string, any[]>, suggestion: any) => {
                  const type = suggestion.resultType;
                  if (!acc[type]) acc[type] = [];
                  acc[type].push(suggestion);
                  return acc;
                }, {} as Record<string, any[]>);
                
                // Create intent-aware multiple results response
                const typeDescriptions = Object.entries(resultsByType).map(([type, suggestions]) => {
                  const typeEmoji: Record<string, string> = {
                    suburb: '🏘️',
                    street: '🛣️',
                    address: '🏠',
                    general: '📍'
                  };
                  const emoji = typeEmoji[type] || '📍';
                  
                  const examples = (suggestions as any[]).slice(0, 2).map((s: any) => s.structuredFormatting.mainText).join(', ');
                  return `${emoji} ${(suggestions as any[]).length} ${type}${(suggestions as any[]).length > 1 ? 's' : ''} (${examples}${(suggestions as any[]).length > 2 ? '...' : ''})`;
                }).join(', ');
                
                responseMessage = `I found ${enhancedResults.suggestions.length} results for "${address}". ` +
                  `${intentEmoji} I detected you were looking for a ${intentLabel}. Here's what I found: ${typeDescriptions}. ` +
                  `Please specify which one you mean, or say something like "I meant the ${detectedIntent}" to clarify.`;
                
                // Convert to compatible format and show selection UI
                const compatibleResults = enhancedResults.suggestions.slice(0, 8).map((suggestion: any) => ({
                  canonicalSuburb: suggestion.description,
                  placeId: suggestion.placeId,
                  geocode: {
                    lat: 0, // Coordinates not available from autocomplete API
                    lng: 0  // Would need Google Places Details API call
                  },
                  types: suggestion.types
                }));
                
                // Show multiple results selection UI
                updateMultipleResults(compatibleResults);
                
                addSearchHistory({
                  input: `${address} (${detectedIntent})`,
                  result: `${enhancedResults.suggestions.length} ${detectedIntent}-focused matches`,
                  timestamp: toolCallStart,
                  isAgentCall: true
                });
              }
            } else {
              // Fallback to old suburb lookup if no enhanced results
              console.log('[ClientTool] No enhanced results, falling back to suburb lookup');
              const fallbackResult = await lookupSuburbMultiple(address, 5);
              
              if (fallbackResult.success && 'results' in fallbackResult && fallbackResult.results.length > 0) {
                if (fallbackResult.results.length === 1) {
                  const place = fallbackResult.results[0];
                  
                  // Create structured data for fallback results too
                  const fallbackPlaceData = {
                    description: place.canonicalSuburb,
                    mainText: place.canonicalSuburb.split(',')[0],
                    secondaryText: place.canonicalSuburb.split(',').slice(1).join(',').trim(),
                    placeId: place.placeId,
                    resultType: 'suburb',
                    confidence: 85,
                    types: place.types
                  };

                  console.log('[AddressSearch] Creating fallback place data:', fallbackPlaceData);

                  // Store place data in shared state for ConfirmPlace to access
                  dispatch({ type: 'SET_CURRENT_PLACE_DATA', payload: fallbackPlaceData });
                  console.log('[AddressSearch] Stored old lookup fallback place data in shared state:', fallbackPlaceData);

                  responseMessage = `Found suburb: ${place.canonicalSuburb} (Place ID: ${place.placeId}). If this is correct, I can confirm it for you.`;
                  
                  console.log('[AddressSearch] Old lookup fallback response message:', responseMessage);
                  
                  // Update UI state with the fallback result so ConfirmPlace can access it
                  setResult(place);
                  
                  // For single results, let ConfirmPlace handle the final confirmation
                  console.log('[AddressSearch] Found single result (old lookup):', place);
                } else {
                  const locations = fallbackResult.results.map((r: SuburbResult) => r.canonicalSuburb).join(', ');
                  responseMessage = `Found ${fallbackResult.results.length} suburbs: ${locations}.`;
                  updateMultipleResults(fallbackResult.results);
                }
              } else {
                responseMessage = `Could not find address: ${address}`;
              }
              
              addSearchHistory({
                input: address,
                result: fallbackResult.success ? 'Found via fallback' : null,
                timestamp: toolCallStart,
                isAgentCall: true
              });
            }
          } catch (enhancedError) {
            console.error('[ClientTool] Enhanced lookup failed:', enhancedError);
            responseMessage = `Address lookup failed: ${address}`;
            
            addSearchHistory({
              input: address,
              result: null,
              timestamp: toolCallStart,
              isAgentCall: true
            });
          }
          
          // Track the agent tool call
          addToolCall({
            tool: 'AddressSearch',
            input: address,
            result: responseMessage,
            timestamp: toolCallStart
          });
          
          return responseMessage;
        } catch (error) {
          console.log('AddressAutocomplete client tool error:', error);
          const errorMessage = 'Address lookup service is currently unavailable';
          
          // Track the failed tool call
          addToolCall({
            tool: 'AddressSearch',
            input: String(params || 'unknown'),
            result: errorMessage,
            timestamp: Date.now()
          });
          
          return errorMessage;
        }
      },

      // Tool 2: ConfirmPlace - Enhanced with UI state awareness
      ConfirmPlace: async (params: unknown) => {
        try {

          console.log('[ClientTool] ConfirmPlace called with params:', params);
          
          // Parse the results array from ElevenLabs
          let results: Array<{
            type: string;
            place_id: string;
            label: string;
          }> = [];
          
          if (isConfirmPlaceParams(params)) {
            results = params.results;
          } else if (Array.isArray(params)) {
            results = params as typeof results;
          } else if (
            typeof params === 'object' &&
            params !== null &&
            'results' in params &&
            typeof (params as any).results === 'object'
          ) {
            // Single result wrapped in object
            const singleResult = (params as any).results;
            if (
              singleResult &&
              typeof singleResult.type === 'string' &&
              typeof singleResult.place_id === 'string' &&
              typeof singleResult.label === 'string'
            ) {
              results = [singleResult];
            }
          }

          console.log('[ConfirmPlace] Parsed results array:', results);

          // If no results in parameters, try to get them from ElevenLabs variables
          if (results.length === 0) {
            console.log('[ConfirmPlace] No results in params, checking ElevenLabs variables...');
            try {
              const windowWithElevenLabs = window as typeof window & {
                getVariable?: (name: string) => unknown;
              };
              if (typeof windowWithElevenLabs.getVariable === 'function') {
                const storedResults = windowWithElevenLabs.getVariable("lastSearchResults") as typeof results | undefined;
                if (storedResults && Array.isArray(storedResults) && storedResults.length > 0) {
                  results = storedResults;
                  console.log('[ConfirmPlace] Retrieved results from ElevenLabs variables:', results);
                }
              }
            } catch (varError) {
              console.log('[ConfirmPlace] Could not access ElevenLabs variables:', varError);
            }
          }

          // Handle the new array-based interface
          if (results.length === 0) {
            console.log('[ConfirmPlace] No results available from params or variables');
            return 'No place suggestions available. Please search for a place first.';
          }

          if (results.length === 1) {
            // Single result - automatically confirm it
            const place = results[0];
            console.log('[ConfirmPlace] Single result provided, auto-confirming:', place);

                         // Create a compatible SuburbResult object
             const confirmedResult = {
               canonicalSuburb: place.label,
               placeId: place.place_id,
               geocode: { lat: 0, lng: 0 }, // Not used for Places API
               types: [place.type] // Convert type string to array
             };

            // Clear competing UI elements and update Selected Result
            dispatch({ type: 'SET_SHOW_MULTIPLE_RESULTS', payload: false });
            resetEnhanced();
            updateSelectedResult(confirmedResult);
            
            console.log('[ConfirmPlace] Updated Selected Result with single result:', confirmedResult);

            // Add to search history
            addSearchHistory({
              input: `Confirmed: ${place.label}`,
              result: place.label,
              timestamp: Date.now(),
              isAgentCall: true
            });

            return `✅ Confirmed: ${place.label} (${place.type}). Place ID: ${place.place_id}`;
          }

          // Multiple results - show selection UI
          console.log('[ConfirmPlace] Multiple results provided, showing selection UI');

                     // Convert ElevenLabs results to our SuburbResult format
           const compatibleResults = results.map(place => ({
             canonicalSuburb: place.label,
             placeId: place.place_id,
             geocode: { lat: 0, lng: 0 }, // Not used for Places API
             types: [place.type]
           }));

          // Show multiple results selection UI
          updateMultipleResults(compatibleResults);
          
          // Clear any existing single result
          updateSelectedResult(null);

          console.log('[ConfirmPlace] Displayed multiple results for user selection:', compatibleResults);

          // Add to search history
          addSearchHistory({
            input: `Multiple suggestions: ${results.length} places`,
            result: `${results.length} options shown`,
            timestamp: Date.now(),
            isAgentCall: true
          });

          const placeLabels = results.map(r => r.label).join(', ');
          return `📍 I found ${results.length} places for you to choose from: ${placeLabels}. Please select the one you want.`;
        } catch (error) {
          console.log('ConfirmPlace client tool error:', error);
          return 'Failed to confirm place selection';
        }
      },

      // Tool 3: GetUIState - Let agent query current UI state
      GetUIState: async () => {
        const currentState = {
          isRecording: coreState.isRecording,
          isSpellingMode: suggestions.length > 0,
          hasResults: canonicalSuburb !== null || coreState.selectedResult !== null,
          hasMultipleResults: coreState.showMultipleResults,
          hasSelectedResult: coreState.selectedResult !== null,
          resultCount: coreState.multipleResults.length,
          spellingActive: suggestions.length > 0,
          currentMode: coreState.currentMode,
          lastAction: coreState.lastAction,
          timestamp: Date.now(),
          
          // Include actual result data for agent awareness
          foundResult: canonicalSuburb ? {
            address: canonicalSuburb,
            placeId: enhancedResult?.placeId || null,
            types: enhancedResult?.types || [],
            coordinates: enhancedResult?.geocode || null
          } : null,
          
          selectedResult: coreState.selectedResult ? {
            address: coreState.selectedResult.canonicalSuburb,
            placeId: coreState.selectedResult.placeId,
            types: coreState.selectedResult.types,
            coordinates: coreState.selectedResult.geocode
          } : null,
          
          multipleOptions: coreState.showMultipleResults ? coreState.multipleResults.map((result: SuburbResult) => ({
            address: result.canonicalSuburb,
            placeId: result.placeId,
            types: result.types
          })) : [],
          
          spellingCandidates: suggestions.length > 0 ? suggestions.map(s => ({
            address: s.address,
            confidence: s.confidence,
            matchType: s.matchType
          })) : []
        };
        
        console.log('[GetUIState] Current UI state:', currentState);
        return `UI State: ${JSON.stringify(currentState, null, 2)}`;
      },

      // Tool 4: ClearResults - Let agent clear UI state
      ClearResults: async () => {
        reset();
        updateSelectedResult(null);
        updateMultipleResults([]);
        resetEnhanced();
        clearSuggestions();
        resetSession();
        
        return 'All results cleared. Ready for new search.';
      }
    },
    
    // Enhanced callbacks with state synchronization
    onMessage: (message) => {
      console.log('[onMessage] Message received:', message);
      if (message.source === 'user' && message.message.trim()) {
        handleTranscription(message.message.trim(), 'onMessage');
      }
    },
    
    onTranscription: (text: string) => {
      if (text.trim()) {
        handleTranscription(text.trim(), 'onTranscription');
      }
    },
    
    onUserMessage: (message: string) => {
      if (message.trim()) {
        handleTranscription(message.trim(), 'onUserMessage');
      }
    },
    
    onError: (error) => {
      console.log('ElevenLabs Error:', error);
    },
    
    textOnly: false,
  });

  // Set up audio analysis for voice activity detection
  const setupAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkAudioLevel = () => {
        if (!analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const isActive = average > 15; // Audio threshold
        const now = Date.now();
        
        if (isActive !== coreState.isVoiceActive && 
            (isActive || now - lastUpdateRef.current > 200)) {
          dispatch({ type: 'SET_VOICE_ACTIVE', payload: isActive });
          lastUpdateRef.current = now;
        }
        
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      
      checkAudioLevel();
    } catch (error) {
      console.error('Failed to set up audio analysis:', error);
      throw error;
    }
  }, [coreState.isVoiceActive]);

  const startRecording = useCallback(async () => {
    try {
      await setupAudioAnalysis();
      await conversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || "default_agent_id",
        textOnly: false,
      });
      updateRecording(true);
      reset(); // Reset previous suburb lookup results
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [conversation, setupAudioAnalysis, reset, updateRecording]);

  const stopRecording = useCallback(async () => {
    try {
      await conversation.endSession();
      updateRecording(false);
      dispatch({ type: 'SET_VOICE_ACTIVE', payload: false });
      
      // Clean up audio resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [conversation, updateRecording]);

  // Enhanced suburb lookup with intelligent spelling requests
  const handleSuburbLookup = useCallback(async (suburbInput: string, isSpellingAttempt = false) => {
    let inputToSearch = suburbInput;
    let searchResult: string | null = null;
    
    // If this is a spelling attempt, process the spelled input and get suggestions
          if (isSpellingAttempt) {
        console.log('[DEBUG] Processing spelling attempt:', suburbInput);
        await getSuggestions(suburbInput);
        console.log('[DEBUG] Processed spelling - Suggestions:', suggestions);
        inputToSearch = suburbInput; // Use original input since getSuggestions doesn't return processed spelling
      
      // If we have good autocomplete suggestions, try the best match
      if (suggestions.length > 0) {
        const bestMatch = suggestions[0];
        if (bestMatch.confidence > 0.7) {
          // High confidence match - use the address name directly
          const addressName = bestMatch.address.split(' ')[0]; // Get first part of address
          const lookupResult = await lookupSuburb(addressName);
          
          if (lookupResult.success && 'canonicalSuburb' in lookupResult) {
            searchResult = lookupResult.canonicalSuburb;
            // Success! Stop spelling mode
            resetSession();
            addSearchHistory({
              input: `${suburbInput} → ${bestMatch.address} (${bestMatch.addressType}, autocomplete)`,
              result: searchResult,
              timestamp: Date.now()
            });
            return searchResult;
          }
        }
      }
      
      console.log('[Spelling] Processed input:', inputToSearch);
    }
    
    // Regular lookup attempt using enhanced version
    const enhancedSearchResult = await lookupSuburbEnhanced(inputToSearch);
    searchResult = (enhancedSearchResult.success && 'canonicalSuburb' in enhancedSearchResult) 
      ? enhancedSearchResult.canonicalSuburb 
      : null;
    
    // Add to search history
    addSearchHistory({
      input: isSpellingAttempt ? `${suburbInput} (spelled)` : suburbInput,
      result: searchResult,
      timestamp: Date.now()
    });
    
    // If lookup failed and we're not already in spelling mode, start spelling
    if (!searchResult && !suggestions.length && !isSpellingAttempt) {
      resetSession();
      
      // Send message to agent to ask for spelling
      if (conversation.status === 'connected') {
        try {
          await conversation.sendUserMessage(
            `I couldn't find "${suburbInput}". Could you please spell it out letter by letter? For example: Y-A-R-R-A-V-I-L-L-E`
          );
        } catch (error) {
          console.error('Failed to send spelling request:', error);
        }
      }
    } else if (searchResult && suggestions.length) {
      // Success after spelling - stop spelling mode
      resetSession();
    }
    
    return searchResult;
  }, [lookupSuburb, lookupSuburbEnhanced, suggestions, getSuggestions, resetSession, conversation]);

  // Enhanced transcription handler - Only logs transcriptions, lets AI agent handle lookups
  const handleTranscription = useCallback(async (text: string, source: string) => {
    console.log(`[${source}] Transcription:`, text);
    
    const transcription: VoiceTranscription = { 
      text: text.trim(), 
      timestamp: Date.now(),
      isSpelling: suggestions.length > 0
    };
    
    dispatch({ type: 'ADD_TRANSCRIPTION', payload: transcription });
    
    // Only handle spelling mode autocomplete, let AI agent handle regular address lookups
    if (suggestions.length > 0) {
      console.log('[Spelling] Processing spelled input with autocomplete:', text);
      // Use the debounced version here for better UX as user speaks
      debouncedGetSuggestions(text.trim());
    }
    
    // Note: Regular address lookups are now handled by the AI agent via AddressAutocomplete tool
  }, [suggestions, debouncedGetSuggestions]);

  // Handle autocomplete suggestion selection
  const handleAutocompleteSelect = useCallback(async (suggestion: {address: string; confidence: number; matchType: string; placeId: string; addressType: string}) => {
    console.log('[Autocomplete] Selected:', suggestion);
    
    // Extract the main address component for lookup
    const addressName = suggestion.address.split(' ')[0]; // Get first part of address
    const result = await lookupSuburbEnhanced(addressName);
    
    if (result.success && 'canonicalSuburb' in result) {
      addSearchHistory({
        input: `${suggestions[0].address} → ${suggestion.address} (${suggestion.addressType}, selected)`,
        result: result.canonicalSuburb,
        timestamp: Date.now()
      });
      resetSession();

      // Send summary message to agent about the autocomplete selection
      if (conversation.status === 'connected') {
        const selectionSummary = `User has selected: "${suggestion.address}" from autocomplete suggestions during spelling mode. ` +
          `This was a ${suggestion.matchType} match with ${Math.round(suggestion.confidence * 100)}% confidence. ` +
          `Address Type: ${suggestion.addressType}, ` +
          `Place ID: ${suggestion.placeId}, ` +
          `Final result: "${result.canonicalSuburb}". ` +
          `Spelling mode has been cleared and selection is now active in the UI.`;
        
        try {
          await conversation.sendUserMessage(selectionSummary);
        } catch (error) {
          console.log('Failed to send autocomplete selection summary to agent:', error);
        }
      }
    }
  }, [lookupSuburbEnhanced, suggestions, resetSession, conversation]);

  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (coreState.manualInput.trim()) {
      try {
        // Use enhanced place suggestions for manual input
        const result = await searchPlaces(coreState.manualInput.trim());
        // Update React Query cache for agent tools
        if (result && result.suggestions) {
          queryClient.setQueryData([
            'addressSearch',
            coreState.manualInput.trim()
          ], result.suggestions);
          // Trigger state sync for agent
          syncToElevenLabs();
        }
        dispatch({ type: 'SET_MANUAL_INPUT', payload: '' });
      } catch (error) {
        console.error('Failed to search places:', error);
        // Fallback to sending to AI agent if connected
        if (conversation.status === 'connected') {
          try {
            await conversation.sendUserMessage(`Please look up this address: ${coreState.manualInput.trim()}`);
            dispatch({ type: 'SET_MANUAL_INPUT', payload: '' });
          } catch (agentError) {
            console.error('Failed to send message to agent:', agentError);
          }
        }
      }
    }
  }, [coreState.manualInput, searchPlaces, queryClient, syncToElevenLabs, conversation, dispatch]);

  // Test multiple results lookup
  const testMultipleResults = async (testInput: string) => {
    console.log(`[DEBUG] Testing multiple results for: ${testInput}`);
    try {
      const result = await lookupSuburbMultiple(testInput, 8);
      console.log('[DEBUG] Multiple results:', result);
      
      if (result.success && 'results' in result) {
        updateMultipleResults(result.results);
        console.log(`[DEBUG] Found ${result.results.length} results:`, result.results.map((r: SuburbResult) => r.canonicalSuburb));
      } else {
        console.log('[DEBUG] No multiple results found:', 'error' in result ? result.error : 'Unknown error');
        updateMultipleResults([]);
      }
    } catch (error) {
      console.error('[DEBUG] Multiple results error:', error);
      updateMultipleResults([]);
    }
  };

  // Test Address Validation API with a full address
  const testAddressValidation = async (fullAddress: string) => {
    console.log(`[AddressValidation Test] Testing with: ${fullAddress}`);
    try {
      const result = await enhancedAutocompleteAction({
        partialInput: fullAddress,
        maxResults: 3,
        sessionToken: crypto.randomUUID()
      });
      console.log('[AddressValidation Test] Result:', result);
      
      if (result.length > 0) {
        const validatedAddress = result[0];
        console.log('[AddressValidation Test] Validated Address:', validatedAddress);
        
        // Check if Address Validation API was used
        const isAddressValidation = validatedAddress.matchType === 'address_validation';
        console.log('[AddressValidation Test] Address Validation API used:', isAddressValidation);
        
        // Show result in UI by updating search history
        addSearchHistory({
          input: `${fullAddress} (Address Validation Test)`,
          result: `${validatedAddress.address} - ${isAddressValidation ? 'Address Validation API' : validatedAddress.matchType}`,
          timestamp: Date.now(),
          isAgentCall: false
        });
      } else {
        console.log('[AddressValidation Test] No results found');
        addSearchHistory({
          input: `${fullAddress} (Address Validation Test)`,
          result: 'No results found',
          timestamp: Date.now(),
          isAgentCall: false
        });
      }
    } catch (error) {
      console.error('[AddressValidation Test] Error:', error);
      addSearchHistory({
        input: `${fullAddress} (Address Validation Test)`,
        result: `Error: ${error}`,
        timestamp: Date.now(),
        isAgentCall: false
      });
    }
  };

  // Handle selection of a specific result from multiple results
  const handleResultSelection = async (result: SuburbResult) => {
    updateSelectedResult(result);
    setResult(result);
    
    // Add to search history
    addSearchHistory({
      input: `Selected: ${result.canonicalSuburb}`,
      result: result.canonicalSuburb,
      timestamp: Date.now()
    });

    // Send summary message to agent about the selection
    if (conversation.status === 'connected') {
      const selectionSummary = `User has selected: "${result.canonicalSuburb}" from multiple options. ` +
        `This location has Place ID: ${result.placeId}, ` +
        `Place Types: ${result.types.join(', ')}, ` +
        `Coordinates: ${result.geocode && typeof result.geocode.lat === 'number' && typeof result.geocode.lng === 'number' ? `${result.geocode.lat.toFixed(6)}, ${result.geocode.lng.toFixed(6)}` : 'N/A'}. ` +
        `Selection is now confirmed and active in the UI.`;
      
      try {
        await conversation.sendUserMessage(selectionSummary);
      } catch (error) {
        console.log('Failed to send selection summary to agent:', error);
      }
    }
  };

  // Handle selection of enhanced place suggestions
  const handleEnhancedPlaceSelection = async (suggestion: EnhancedPlaceSuggestion) => {
    // Convert to compatible format for existing UI
    const compatibleResult = {
      canonicalSuburb: suggestion.description,
      placeId: suggestion.placeId,
      geocode: {
        lat: 0, // Coordinates not available from autocomplete API
        lng: 0  // Would need Google Places Details API call
      },
      types: suggestion.types
    };
    
    updateSelectedResult(compatibleResult);
    setResult(compatibleResult);
    resetEnhanced(); // Clear the enhanced suggestions
    
    // Add to search history
    addSearchHistory({
      input: `Enhanced: ${suggestion.structuredFormatting.mainText} (${suggestion.resultType})`,
      result: suggestion.description,
      timestamp: Date.now()
    });

    // Send summary message to agent about the enhanced selection
    if (conversation.status === 'connected') {
      const selectionSummary = `User has selected: "${suggestion.description}" from enhanced place suggestions. ` +
        `This ${suggestion.resultType} was detected with ${Math.round(suggestion.confidence * 100)}% confidence. ` +
        `Main text: "${suggestion.structuredFormatting.mainText}", ` +
        `Secondary text: "${suggestion.structuredFormatting.secondaryText}", ` +
        `Place ID: ${suggestion.placeId}, ` +
        `Place Types: ${suggestion.types.join(', ')}. ` +
        `Selection is now confirmed and active in the UI.`;
      
      try {
        await conversation.sendUserMessage(selectionSummary);
      } catch (error) {
        console.log('Failed to send enhanced selection summary to agent:', error);
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Set client mounted state after hydration
  useEffect(() => {
    dispatch({ type: 'SET_CLIENT_MOUNTED', payload: true });
  }, []);

  // Sync UI state to ElevenLabs when state changes
  useEffect(() => {
    if (coreState.isClientMounted) {
      syncToElevenLabs();
    }
  }, [
    coreState.isVoiceActive, 
    coreState.isClientMounted,
    coreState.selectedResult,
    coreState.showMultipleResults,
    isLoading, 
    isEnhancedLoading, 
    isAutocompleteLoading, 
    suggestions.length, 
    canonicalSuburb,
    syncToElevenLabs
  ]);

  // For enhancedResult.geocode display (insert before the JSX block that renders coordinates):
  const enhancedGeocode = enhancedResult && enhancedResult.geocode as { lat: number; lng: number } | undefined;
  const enhancedCoords = enhancedGeocode && typeof enhancedGeocode.lat === 'number' && typeof enhancedGeocode.lng === 'number' ? `${enhancedGeocode.lat.toFixed(6)}, ${enhancedGeocode.lng.toFixed(6)}` : 'N/A';

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Voice Address Lookup</h1>
          <p className="text-muted-foreground">
            Speak or type an address, street name, or suburb to get validated results from Google Places
          </p>
        </div>

        {/* Debug Test Buttons - Now a separate component */}
        <DebugTools
          testInput={coreState.testInput}
          setTestInput={(value: string) => dispatch({ type: 'SET_TEST_INPUT', payload: value })}
          getSuggestions={getSuggestions}
          isAutocompleteLoading={isAutocompleteLoading}
          clearSuggestions={clearSuggestions}
          autocompleteError={autocompleteError}
          suggestions={suggestions}
          conversation={{
            status: conversation.status,
            sendUserMessage: async (message: string) => {
              try {
                await conversation.sendUserMessage(message);
              } catch (error) {
                console.log('Failed to send message to agent:', error);
              }
            }
          }}
          isLoading={isLoading}
          isEnhancedLoading={isEnhancedLoading}
          resetSession={resetSession}
          testMultipleResults={testMultipleResults}
          searchPlaces={searchPlaces}
          testAddressValidation={testAddressValidation}
        />

        {/* Main Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Suburb Lookup</span>
              <div className="flex items-center gap-2">
                {coreState.isRecording && (
                  <Badge variant="secondary" className="animate-pulse">
                    Recording
                  </Badge>
                )}
                {suggestions.length > 0 && (
                  <Badge variant="default">
                    Spelling Mode Active
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Voice Controls */}
            <div className="flex items-center justify-center gap-4">
              {!coreState.isRecording ? (
                <ShinyButton
                  onClick={startRecording}
                  className="px-6 py-3"
                >
                  🎤 Start Voice Input
                </ShinyButton>
              ) : (
                <RainbowButton
                  onClick={stopRecording}
                  className="px-6 py-3"
                >
                  🛑 Stop Recording
                </RainbowButton>
              )}
              
              {coreState.isRecording && (
                <VoiceIndicator 
                  isVoiceActive={coreState.isVoiceActive}
                />
              )}
            </div>

            <Separator />

            {/* Manual Input */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Or type a suburb name..."
                value={coreState.manualInput}
                onChange={(e) => dispatch({ type: 'SET_MANUAL_INPUT', payload: e.target.value })}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !coreState.manualInput.trim()}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </form>

            <Separator />

            {/* Loading State */}
            {(isLoading || isEnhancedLoading) && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <span className="ml-2">
                  {isEnhancedLoading ? 'Searching for places...' : 'Looking up suburb...'}
                </span>
              </div>
            )}

            {/* Results */}
            {canonicalSuburb && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">Found:</p>
                      <p className="text-green-700 font-medium">{canonicalSuburb}</p>
                      
                      {/* Enhanced Details */}
                      {enhancedResult && (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="bg-white p-2 rounded border">
                              <p className="font-medium text-green-800">Place ID:</p>
                              <p className="text-green-600 font-mono text-xs break-all">{enhancedResult.placeId}</p>
                            </div>
                            <div className="bg-white p-2 rounded border">
                              <p className="font-medium text-green-800">Coordinates:</p>
                              <p className="text-green-600 font-mono">{enhancedCoords}</p>
                            </div>
                          </div>
                          
                          {enhancedResult.types.length > 0 && (
                            <div className="bg-white p-2 rounded border">
                              <p className="font-medium text-green-800 mb-1">Google Place Types:</p>
                              <div className="flex flex-wrap gap-1">
                                {enhancedResult.types.map((type) => (
                                  <Badge key={type} variant="outline" className="text-xs bg-green-100 text-green-700">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="bg-white p-2 rounded border">
                            <p className="font-medium text-green-800">Google Maps Link:</p>
                            <a 
                              href={`https://www.google.com/maps/place/?q=place_id:${enhancedResult.placeId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-xs"
                            >
                              View on Google Maps →
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error State */}
            {(error || enhancedError) && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">❌</span>
                    <p className="text-red-700">{error || enhancedError}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Place Suggestions */}
        {enhancedPlaceResult?.success && enhancedPlaceResult.suggestions.length > 0 && (
          <EnhancedPlaceSuggestionsDisplay
            suggestions={enhancedPlaceResult.suggestions}
            detectedIntent={enhancedPlaceResult.detectedIntent}
            onSelect={handleEnhancedPlaceSelection}
            onCancel={() => resetEnhanced()}
            isLoading={isEnhancedLoading}
          />
        )}

        {/* Multiple Results */}
        {coreState.showMultipleResults && coreState.multipleResults.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>🔍 Multiple Results Found</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-700">
                  {coreState.multipleResults.length} results
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-700 mb-4">
                Found multiple places with similar names. Select the one you're looking for:
              </p>
              <div className="space-y-2">
                {coreState.multipleResults.map((result: SuburbResult, index: number) => {
                  const resultGeocode = result.geocode as { lat: number; lng: number } | undefined;
                  const resultCoords = resultGeocode && typeof resultGeocode.lat === 'number' && typeof resultGeocode.lng === 'number' ? `${resultGeocode.lat.toFixed(4)}, ${resultGeocode.lng.toFixed(4)}` : 'N/A';
                  return (
                    <Button
                      key={`${result.placeId}-${index}`}
                      variant="outline"
                      className="w-full justify-start p-4 h-auto bg-white hover:bg-blue-50 border-blue-200"
                      onClick={() => handleResultSelection(result)}
                    >
                      <div className="text-left flex-1">
                        <p className="font-medium text-blue-900">{result.canonicalSuburb}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-blue-600 font-mono">{resultCoords}</p>
                          <div className="flex flex-wrap gap-1">
                            {result.types.slice(0, 3).map((type: string) => (
                              <Badge key={type} variant="outline" className="text-xs bg-blue-100 text-blue-600">
                                {type}
                              </Badge>
                            ))}
                            {result.types.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-blue-100 text-blue-600">
                                +{result.types.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-blue-600">→</span>
                    </Button>
                  );
                })}
              </div>
              <Button 
                variant="outline" 
                onClick={() => dispatch({ type: 'SET_SHOW_MULTIPLE_RESULTS', payload: false })}
                className="w-full mt-4"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Debug: Current Selected Result State */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              🐛 Debug: State & Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono space-y-2">
              <div>
                <p><strong>selectedResult:</strong> {coreState.selectedResult ? 'HAS DATA' : 'NULL'}</p>
                {coreState.selectedResult && (
                  <>
                    <p><strong>Location:</strong> {coreState.selectedResult.canonicalSuburb}</p>
                    <p><strong>Place ID:</strong> {coreState.selectedResult.placeId}</p>
                  </>
                )}
              </div>
              
              <div className="border-t pt-2">
                <p><strong>currentPlaceData:</strong> {coreState.currentPlaceData ? 'HAS DATA' : 'NULL'}</p>
                {coreState.currentPlaceData && (
                  <>
                    <p><strong>Description:</strong> {coreState.currentPlaceData.description}</p>
                    <p><strong>Place ID:</strong> {coreState.currentPlaceData.placeId}</p>
                  </>
                )}
              </div>
              
              <div className="border-t pt-2">
                <p><strong>ElevenLabs Variables:</strong></p>
                <p><strong>placeSuggestions:</strong> {!coreState.isClientMounted ? 'Loading...' : (() => {
                  try {
                    const windowWithElevenLabs = window as typeof window & {
                      getVariable?: (name: string) => unknown;
                    };
                    const value = windowWithElevenLabs.getVariable?.("placeSuggestions");
                    return value ? 'HAS DATA' : 'NULL';
                  } catch {
                    return 'ERROR';
                  }
                })()}</p>
                <p><strong>lastSearchResult:</strong> {!coreState.isClientMounted ? 'Loading...' : (() => {
                  try {
                    const windowWithElevenLabs = window as typeof window & {
                      getVariable?: (name: string) => unknown;
                    };
                    const value = windowWithElevenLabs.getVariable?.("lastSearchResult");
                    return value ? 'HAS DATA' : 'NULL';
                  } catch {
                    return 'ERROR';
                  }
                })()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Result Display */}
        {(() => { console.log('[UI Render] selectedResult state:', coreState.selectedResult); return null; })()}
        {coreState.selectedResult && (
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎯</span>
                <span>Selected Result</span>
                <Badge variant="outline" className="ml-2 text-xs bg-green-100 text-green-700">ACTIVE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-purple-800">Location:</p>
                  <p className="text-purple-700 font-medium">{coreState.selectedResult.canonicalSuburb}</p>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-purple-800">Place ID:</p>
                  <p className="text-purple-600 font-mono text-xs break-all">{coreState.selectedResult.placeId}</p>
                </div>
                
                {coreState.selectedResult.types.length > 0 && (
                  <div className="bg-white p-3 rounded border">
                    <p className="font-medium text-purple-800 mb-2">Google Place Types:</p>
                    <div className="flex flex-wrap gap-1">
                      {coreState.selectedResult.types.map((type: string) => (
                        <Badge key={type} variant="outline" className="text-xs bg-purple-100 text-purple-700">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-purple-800">Google Maps Link:</p>
                  <a 
                    href={`https://www.google.com/maps/place/?q=place_id:${coreState.selectedResult.placeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spelling Mode & Autocomplete Suggestions */}
        {suggestions.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🔤</span>
                <span>Spelling Mode Active</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetSession}
                  className="ml-auto"
                >
                  Cancel Spelling
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions[0].address && (
                <div className="bg-white p-3 rounded border">
                  <p className="text-sm text-muted-foreground">Current spelling:</p>
                  <p className="font-mono text-lg tracking-wider">{suggestions[0].address.toUpperCase()}</p>
                </div>
              )}

              {/* Debug Info */}
              <div className="bg-gray-100 p-2 rounded text-xs">
                <p><strong>Debug:</strong> isSpelling={suggestions.length > 0 ? 'true' : 'false'}, suggestions={suggestions.length}, currentSpelling="{suggestions[0].address}"</p>
              </div>
              
              {suggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Autocomplete suggestions:</p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={`${suggestion.address}-${suggestion.confidence}`}
                        variant="outline"
                        className="w-full justify-between p-3 h-auto"
                        onClick={() => handleAutocompleteSelect(suggestion)}
                      >
                        <div className="text-left">
                          <p className="font-medium">{suggestion.address}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.addressType} · {
                            suggestion.matchType === 'address_validation' 
                              ? 'Address Validation API' 
                              : `${suggestion.matchType} match`
                          } · {Math.round(suggestion.confidence * 100)}% confidence
                          </p>
                        </div>
                        <span className="text-xs">→</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground bg-white p-2 rounded border">
                <p><strong>Tip:</strong> Speak each letter clearly with pauses: "Y... A... R... R... A... V... I... L... L... E"</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Transcriptions */}
        {coreState.voiceTranscriptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Voice Transcriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {coreState.voiceTranscriptions.map((transcription: VoiceTranscription) => (
                  <div 
                    key={transcription.timestamp} 
                    className={cn(
                      "flex items-center justify-between p-2 rounded",
                      transcription.isSpelling ? "bg-yellow-100 border border-yellow-200" : "bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {transcription.isSpelling && <span className="text-yellow-600">🔤</span>}
                      <span>"{transcription.text}"</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(transcription.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent Tool Calls */}
        {coreState.agentToolCalls.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🤖 Agent Tool Calls
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">{coreState.agentToolCalls.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {coreState.agentToolCalls.map((call: AgentToolCall, index: number) => (
                  <div key={`${call.timestamp}-${index}`} className="flex justify-between items-start p-3 bg-blue-100 rounded-lg border border-blue-300">
                    <div className="flex-1">
                      <p className="font-medium text-sm flex items-center gap-2">
                        <span className="text-blue-600">🔧 {call.tool}</span>
                        <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded font-mono">"{call.input}"</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(call.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="ml-3 max-w-48">
                      <Badge variant="outline" className="bg-blue-200 text-blue-800 text-xs truncate">
                        {call.result}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search History */}
        {coreState.searchHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {coreState.searchHistory.map((search: SearchHistoryItem) => (
                  <div key={search.timestamp} className={cn(
                    "flex items-center justify-between p-3 rounded",
                    search.isAgentCall ? "bg-blue-50 border border-blue-200" : "bg-muted"
                  )}>
                    <div className="flex-1">
                      <p className="font-medium flex items-center gap-2">
                        {search.isAgentCall && <span className="text-blue-600">🤖</span>}
                        "{search.input}"
                        {search.isAgentCall && <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">Agent</Badge>}
                      </p>
                      {search.result ? (
                        <p className="text-sm text-green-600">→ {search.result}</p>
                      ) : (
                        <p className="text-sm text-red-600">→ No match found</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-4">
                      {new Date(search.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              1. <strong>Voice Input:</strong> Click "Start Voice Input" and speak an address, street name, or suburb clearly
            </p>
            <p className="text-sm text-muted-foreground">
              2. <strong>Manual Input:</strong> Type a full address, street name, or suburb in the text field and click "Search"
            </p>
            <p className="text-sm text-muted-foreground">
              3. <strong>Intent Detection:</strong> The system automatically detects whether you're looking for a suburb, street, or full address and optimizes results accordingly
            </p>
            <p className="text-sm text-muted-foreground">
              4. <strong>Enhanced Results:</strong> Results are organized by type (🏘️ Suburbs, 🛣️ Streets, 🏠 Addresses) with confidence scores and proper classification
            </p>
            <p className="text-sm text-muted-foreground">
              5. <strong>Smart Spelling:</strong> If an address isn't found, the system will ask you to spell it letter by letter with autocomplete suggestions
            </p>
            <p className="text-sm text-muted-foreground">
              6. The system queries Google Places API with intelligent filtering to return the most relevant results based on your intent
            </p>
            <p className="text-sm text-muted-foreground">
              7. All results are automatically saved to your search history with proper classification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Debug Section with UI State Sync Info */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            🔄 UI State Synchronization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs font-mono space-y-2">
            <div>
              <p><strong>Current Mode:</strong> {coreState.currentMode}</p>
              <p><strong>Last Action:</strong> {coreState.lastAction}</p>
              <p><strong>Recording:</strong> {coreState.isRecording ? 'YES' : 'NO'}</p>
              <p><strong>Voice Active:</strong> {coreState.isVoiceActive ? 'YES' : 'NO'}</p>
              <p><strong>Spelling Mode:</strong> {suggestions.length > 0 ? 'YES' : 'NO'}</p>
              <p><strong>Has Results:</strong> {(canonicalSuburb || coreState.selectedResult) ? 'YES' : 'NO'}</p>
              <p><strong>Multiple Results:</strong> {coreState.showMultipleResults ? 'YES' : 'NO'}</p>
              <p><strong>Selected Result:</strong> {coreState.selectedResult ? 'YES' : 'NO'}</p>
            </div>
            
            <div className="border-t pt-2">
              <p><strong>Agent Sync Status:</strong></p>
              <p className="text-green-600">✅ UI state continuously synced to ElevenLabs variables</p>
              <p className="text-blue-600">🔄 Agent can query UI state anytime via GetUIState tool</p>
              <p className="text-purple-600">🎯 Agent receives real-time updates on all UI changes</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 