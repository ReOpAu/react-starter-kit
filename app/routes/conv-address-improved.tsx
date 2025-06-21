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

// Consolidated State
interface AppState {
  // Voice/Recording State
  isVoiceActive: boolean;
  isRecording: boolean;
  voiceTranscriptions: VoiceTranscription[];
  
  // Search State
  manualInput: string;
  searchHistory: SearchHistoryItem[];
  agentToolCalls: AgentToolCall[];
  
  // Results State
  multipleResults: SuburbResult[];
  selectedResult: SuburbResult | null;
  showMultipleResults: boolean;
  currentPlaceData: PlaceData | null;
  
  // UI State
  isClientMounted: boolean;
  testInput: string;
  
  // Mode State
  currentMode: 'idle' | 'searching' | 'selecting' | 'confirmed' | 'confirming';
  lastAction: string | null;
}

// State Actions
type AppAction =
  | { type: 'SET_VOICE_ACTIVE'; payload: boolean }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'ADD_TRANSCRIPTION'; payload: VoiceTranscription }
  | { type: 'SET_MANUAL_INPUT'; payload: string }
  | { type: 'ADD_SEARCH_HISTORY'; payload: SearchHistoryItem }
  | { type: 'ADD_TOOL_CALL'; payload: AgentToolCall }
  | { type: 'SET_MULTIPLE_RESULTS'; payload: SuburbResult[] }
  | { type: 'SET_SELECTED_RESULT'; payload: SuburbResult | null }
  | { type: 'SET_SHOW_MULTIPLE_RESULTS'; payload: boolean }
  | { type: 'SET_CURRENT_PLACE_DATA'; payload: PlaceData | null }
  | { type: 'SET_CLIENT_MOUNTED'; payload: boolean }
  | { type: 'SET_TEST_INPUT'; payload: string }
  | { type: 'SET_MODE'; payload: { mode: AppState['currentMode']; action: string } }
  | { type: 'RESET_RESULTS' }
  | { type: 'CLEAR_ALL' };

// Initial State
const initialState: AppState = {
  isVoiceActive: false,
  isRecording: false,
  voiceTranscriptions: [],
  manualInput: '',
  searchHistory: [],
  agentToolCalls: [],
  multipleResults: [],
  selectedResult: null,
  showMultipleResults: false,
  currentPlaceData: null,
  isClientMounted: false,
  testInput: '',
  currentMode: 'idle',
  lastAction: null,
};

// State Reducer
function appReducer(state: AppState, action: AppAction): AppState {
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
    
    case 'SET_TEST_INPUT':
      return { ...state, testInput: action.payload };
    
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
        ...initialState,
        isClientMounted: state.isClientMounted,
        lastAction: 'clear_all'
      };
    
    default:
      return state;
  }
}

// UI State Synchronization Hook
function useUIStateSync(state: AppState, suggestions: any[], canonicalSuburb: string | null) {
  const syncToElevenLabs = useCallback((updates?: Partial<AppState>) => {
    const currentState = updates ? { ...state, ...updates } : state;
    
    try {
      const windowWithElevenLabs = window as typeof window & {
        setVariable?: (name: string, value: unknown) => void;
      };
      
      if (typeof windowWithElevenLabs.setVariable === 'function') {
        // Sync complete UI state
        windowWithElevenLabs.setVariable("uiState", {
          isRecording: currentState.isRecording,
          isSpellingMode: suggestions.length > 0,
          hasResults: canonicalSuburb !== null || currentState.selectedResult !== null,
          hasMultipleResults: currentState.showMultipleResults,
          hasSelectedResult: currentState.selectedResult !== null,
          currentMode: currentState.currentMode,
          resultCount: currentState.multipleResults.length,
          spellingActive: suggestions.length > 0,
          lastUserAction: currentState.lastAction,
          timestamp: Date.now()
        });
        
        // Sync result data
        windowWithElevenLabs.setVariable("currentFoundResult", canonicalSuburb);
        windowWithElevenLabs.setVariable("currentSelectedResult", currentState.selectedResult?.canonicalSuburb || null);
        windowWithElevenLabs.setVariable("currentMultipleResults", currentState.multipleResults.map(r => r.canonicalSuburb));
        windowWithElevenLabs.setVariable("currentSpellingCandidates", suggestions.map((s: any) => s.address));
        
        console.log('[UISync] Synced state to ElevenLabs');
      }
    } catch (error) {
      console.log('[UISync] ElevenLabs variables not available:', error);
    }
  }, [state, suggestions, canonicalSuburb]);

  return { syncToElevenLabs };
}

export default function ConvAddress() {
  // Consolidated state with useReducer
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  // Custom hooks (keep these for business logic)
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
  
  const { 
    suggestions,
    isLoading: isAutocompleteLoading, 
    error: autocompleteError,
    getSuggestions,
    debouncedGetSuggestions,
    resetSession,
    clearSuggestions
  } = useSpellingAutocomplete({
    location: { lat: -37.8136, lng: 144.9631 },
    radius: 100000,
    minLength: 2,
    debounceMs: 300
  });

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

  // Enhanced autocomplete action
  const enhancedAutocompleteAction = useAction(api.autocomplete.autocompleteAddresses);

  // UI State Synchronization
  const { syncToElevenLabs } = useUIStateSync(state, suggestions, canonicalSuburb);

  // Optimized state update functions
  const updateRecording = useCallback((recording: boolean) => {
    dispatch({ type: 'SET_RECORDING', payload: recording });
    syncToElevenLabs();
  }, [syncToElevenLabs]);

  const updateMultipleResults = useCallback((results: SuburbResult[]) => {
    dispatch({ type: 'SET_MULTIPLE_RESULTS', payload: results });
    syncToElevenLabs();
  }, [syncToElevenLabs]);

  const updateSelectedResult = useCallback((result: SuburbResult | null) => {
    dispatch({ type: 'SET_SELECTED_RESULT', payload: result });
    syncToElevenLabs();
  }, [syncToElevenLabs]);

  // Conversation setup (simplified clientTools for demo)
  const conversation = useConversation({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      dispatch({ type: 'SET_MODE', payload: { mode: 'idle', action: 'connected' } });
      syncToElevenLabs();
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      dispatch({ type: 'SET_MODE', payload: { mode: 'idle', action: 'disconnected' } });
      syncToElevenLabs();
    },
    clientTools: {
      AddressSearch: async (params: unknown) => {
        dispatch({ type: 'SET_MODE', payload: { mode: 'searching', action: 'address_search_start' } });
        // Simplified tool implementation
        return "Address search functionality";
      },
      GetUIState: async () => {
        return `UI State: ${JSON.stringify({
          currentMode: state.currentMode,
          hasResults: canonicalSuburb !== null || state.selectedResult !== null,
          resultCount: state.multipleResults.length
        }, null, 2)}`;
      },
      ClearResults: async () => {
        dispatch({ type: 'RESET_RESULTS' });
        reset();
        clearSuggestions();
        resetSession();
        syncToElevenLabs();
        return 'All results cleared';
      }
    },
    textOnly: false,
  });

  // Set up audio analysis
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
        const isActive = average > 15;
        const now = Date.now();
        
        if (isActive !== state.isVoiceActive && 
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
  }, [state.isVoiceActive]);

  // Recording controls
  const startRecording = useCallback(async () => {
    try {
      await setupAudioAnalysis();
      await conversation.startSession({
        agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || "default_agent_id",
        textOnly: false,
      });
      updateRecording(true);
      reset();
    } catch (error) {
      console.error('Failed to start recording:', error);
      dispatch({ type: 'SET_MODE', payload: { mode: 'idle', action: 'recording_start_failed' } });
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
      dispatch({ type: 'SET_MODE', payload: { mode: 'idle', action: 'recording_stop_failed' } });
    }
  }, [conversation, updateRecording]);

  // Manual input handling
  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.manualInput.trim()) {
      try {
        await searchPlaces(state.manualInput.trim());
        dispatch({ type: 'SET_MANUAL_INPUT', payload: '' });
      } catch (error) {
        console.error('Failed to search places:', error);
      }
    }
  }, [state.manualInput, searchPlaces]);

  // Set client mounted state after hydration
  useEffect(() => {
    dispatch({ type: 'SET_CLIENT_MOUNTED', payload: true });
  }, []);

  // Sync UI state when dependencies change
  useEffect(() => {
    if (state.isClientMounted) {
      syncToElevenLabs();
    }
  }, [state.isClientMounted, suggestions.length, canonicalSuburb, syncToElevenLabs]);

  // Cleanup on unmount
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Voice Address Lookup (Improved)</h1>
          <p className="text-muted-foreground">
            Enhanced state management with useReducer pattern
          </p>
        </div>

        {/* Main Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Suburb Lookup</span>
              <div className="flex items-center gap-2">
                {state.isRecording && (
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
              {!state.isRecording ? (
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
              
              {state.isRecording && (
                <VoiceIndicator 
                  isVoiceActive={state.isVoiceActive}
                />
              )}
            </div>

            <Separator />

            {/* Manual Input */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                placeholder="Or type a suburb name..."
                value={state.manualInput}
                onChange={(e) => dispatch({ type: 'SET_MANUAL_INPUT', payload: e.target.value })}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !state.manualInput.trim()}>
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </form>

            {/* Results Display */}
            {canonicalSuburb && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">Found:</p>
                      <p className="text-green-700 font-medium">{canonicalSuburb}</p>
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

        {/* State Debug */}
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm">🔄 Consolidated State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs font-mono space-y-2">
              <p><strong>Mode:</strong> {state.currentMode}</p>
              <p><strong>Recording:</strong> {state.isRecording ? 'YES' : 'NO'}</p>
              <p><strong>Multiple Results:</strong> {state.showMultipleResults ? 'YES' : 'NO'}</p>
              <p><strong>Selected Result:</strong> {state.selectedResult ? 'YES' : 'NO'}</p>
              <p><strong>Last Action:</strong> {state.lastAction}</p>
              <p><strong>Search History:</strong> {state.searchHistory.length} items</p>
              <p><strong>Tool Calls:</strong> {state.agentToolCalls.length} calls</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 