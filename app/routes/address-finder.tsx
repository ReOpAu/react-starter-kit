import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useAddressFinderStore, type Suggestion, type LocationIntent } from '~/stores/addressFinderStore';
import { useAgentSync } from '~/hooks/useAgentSync';
import {
  VoiceInputController,
  ManualSearchForm,
  SuggestionsDisplay,
  SelectedResultCard,
  HistoryPanel,
} from '~/components/address-finder';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { useConversation } from '@elevenlabs/react';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';

// Helper function to classify intent based on what user actually selected
const classifySelectedResult = (suggestion: Suggestion): LocationIntent => {
    const types = suggestion.types || [];
    const description = suggestion.description;

    // Check for full addresses
    if (types.includes('street_address') || 
        types.includes('premise') || 
        /^(unit\s+|apt\s+|apartment\s+|shop\s+|suite\s+)?\d+[a-z]?([/-]\d+[a-z]?(-\d+[a-z]?)?)?\s+/i.test(description.trim())) {
      return 'address';
    }

    // Check for streets
    if (types.includes('route')) {
      return 'street';
    }

    // Check for suburbs/localities
    if (types.includes('locality') || types.includes('sublocality')) {
      return 'suburb';
    }

    // Default fallback
    return 'general';
};

export default function AddressFinder() {
  const queryClient = useQueryClient();
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { syncToAgent } = useAgentSync();
  
  // Persistent cache for agent tools - survives conversation state changes
  const agentSuggestionsCache = useRef<Suggestion[]>([]);
  const agentCacheQuery = useRef<string>('');

  // Global state from Zustand
  const {
    searchQuery,
    selectedResult,
    isRecording,
    isVoiceActive,
    history,
    isLoggingEnabled,
    currentIntent,
    isSmartValidationEnabled,
    setSearchQuery,
    setSelectedResult,
    setIsRecording,
    setIsVoiceActive,
    addHistory,
    setIsLoggingEnabled,
    clear,
    setCurrentIntent,
    setIsSmartValidationEnabled,
    setApiResults,
  } = useAddressFinderStore();
  
  // Debounced search query - only used when conversation is NOT active
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  
  // Session token for Google's autocomplete billing optimization
  const sessionTokenRef = useRef<string | null>(null);
  
  // Generate session token following Google's best practices
  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID();
      log('Generated new session token:', sessionTokenRef.current);
    }
    return sessionTokenRef.current;
  }, []);
  
  // Clear session token when user selects a result (session complete)
  const clearSessionToken = useCallback(() => {
    if (sessionTokenRef.current) {
      log('Clearing session token:', sessionTokenRef.current);
      sessionTokenRef.current = null;
    }
  }, []);

  // Logging utility
  const log = useCallback((...args: any[]) => {
    if (useAddressFinderStore.getState().isLoggingEnabled) {
      console.log('[AddressFinder]', ...args);
    }
  }, []);

  // Use the more powerful location search action
  const getPlaceSuggestionsAction = useAction(api.location.getPlaceSuggestions);
  
  // AUTOCOMPLETE QUERY - Only for manual input (disabled during conversation)
  const { 
    data: autocompleteSuggestions = [], 
    isLoading: isAutocompleteLoading, 
    isError: isAutocompleteError,
    error: autocompleteError 
  } = useQuery({
    queryKey: ['autocomplete', debouncedSearchQuery],
    queryFn: async () => {
      log('🔍 Autocomplete query triggered:', debouncedSearchQuery);
      if (!debouncedSearchQuery || debouncedSearchQuery.trim().length < 3) {
        return [];
      }
      
      const result = await getPlaceSuggestionsAction({ 
        query: debouncedSearchQuery,
        intent: 'general', // Always use general intent for autocomplete
        isAutocomplete: true, // Flag this as autocomplete for backend optimization
        sessionToken: getSessionToken(), // Include session token for billing optimization
      });
      
      if (result.success) {
        log(`🔍 Autocomplete found ${result.suggestions?.length} suggestions for "${debouncedSearchQuery}"`);
        return result.suggestions || [];
      }
      
      if (!result.success) {
        log(`🔍 Autocomplete failed: ${result.error}`);
      }
      return [];
    },
    enabled: !!debouncedSearchQuery && debouncedSearchQuery.trim().length >= 3 && !isRecording, // DISABLED during conversation
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // AI SUGGESTIONS QUERY - For displaying AI-generated results (always enabled)
  const { 
    data: aiSuggestions = [], 
    isLoading: isAiLoading, 
    isError: isAiError,
    error: aiError 
  } = useQuery({
    queryKey: ['aiSuggestions', searchQuery],
    queryFn: async () => {
      // This query is managed by clientTools.searchAddress - return empty by default
      return [];
    },
    enabled: false, // This query is only updated via queryClient.setQueryData from clientTools
    staleTime: Infinity, // AI results don't expire
    retry: false,
  });

  // UNIFIED SUGGESTIONS - Use autocomplete when not recording, AI when recording
  const suggestions = isRecording ? aiSuggestions : autocompleteSuggestions;
  const isLoading = isRecording ? isAiLoading : isAutocompleteLoading;
  const isError = isRecording ? isAiError : isAutocompleteError;
  const error = isRecording ? aiError : autocompleteError;

  // DISABLED: Sync React Query state to Zustand - this was causing infinite loops
  // The change detection with array comparison (suggestions !== currentSuggestions) 
  // always returns true even for same content, causing infinite updates
  // 
  // useEffect(() => {
  //   setApiResults({
  //     suggestions,
  //     isLoading: isSearchingQuery, 
  //     error: error?.message || null,
  //     source: isRecording ? 'voice' : 'manual',
  //     timestamp: Math.floor(Date.now() / 1000) * 1000,
  //   });
  // }, [suggestions, isSearchingQuery, error, isRecording, setApiResults]);

  // REMOVED: Automatic sync effect - only manual sync on user actions to prevent loops

  // Note: Using centralized syncToAgent instead of separate syncToElevenLabs
  
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update debounced query when conversation is NOT active
      if (!isRecording && searchQuery !== debouncedSearchQuery) {
        setDebouncedSearchQuery(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isRecording, debouncedSearchQuery]);

  // Enhanced ClientTools for managing place suggestions directly
  const clientTools = useMemo(() => ({
    searchAddress: async (params: unknown) => {
      log('🔧 Tool Call: searchAddress with params:', params);
      
      let query: string | undefined;

      if (typeof params === 'string') {
        query = params;
      } else if (params && typeof params === 'object' && 'query' in params) {
        query = (params as { query: string }).query;
      }

      if (typeof query !== 'string' || !query.trim()) {
        const errorMessage = "Invalid or missing 'query' parameter for searchAddress tool.";
        log(`Tool searchAddress failed: ${errorMessage}`, { params });
        return JSON.stringify({ 
          status: "error", 
          error: errorMessage 
        });
      }
      
      addHistory({ type: 'agent', text: `Searching for: "${query}"` });
      
      try {
        // Update React Query cache (eliminates dual storage)
        const result = await getPlaceSuggestionsAction({ 
          query: query,
          intent: 'general',
          isAutocomplete: false, // This is an AI search, not autocomplete
          sessionToken: getSessionToken(),
        });
        
        if (result.success && result.suggestions && result.suggestions.length > 0) {
          log(`🔧 Updating cache for query: "${query}" with ${result.suggestions.length} suggestions`);
          
          // PERSISTENT AGENT CACHE - Store suggestions in ref that survives state changes
          agentSuggestionsCache.current = result.suggestions;
          agentCacheQuery.current = query;
          log(`🔧 Agent cache updated: ${agentSuggestionsCache.current.length} suggestions for "${agentCacheQuery.current}"`);
          
          // Update search query first to ensure query keys match
          setSearchQuery(query);
          
          // Update AI suggestions cache with BOTH current and new query keys to ensure no mismatch
          queryClient.setQueryData(['aiSuggestions', query], result.suggestions);
          // Also set for current searchQuery in case it's different
          queryClient.setQueryData(['aiSuggestions', searchQuery], result.suggestions);
          
          // Force React Query to refetch with the new query to ensure UI updates
          queryClient.invalidateQueries({ queryKey: ['aiSuggestions', query] });
          queryClient.invalidateQueries({ queryKey: ['aiSuggestions', searchQuery] });
          
          // Manual sync after AI search
          setTimeout(() => syncToAgent(), 100);
          
          if (result.suggestions.length === 1) {
            // Auto-select if only one result
            const suggestion = result.suggestions[0];
            setSelectedResult(suggestion);
            addHistory({ type: 'agent', text: `Auto-selected: "${suggestion.description}"` });
            return JSON.stringify({ 
              status: "confirmed", 
              selection: suggestion 
            });
          } else {
            return JSON.stringify({ 
              status: "multiple_results", 
              suggestions: result.suggestions,
              count: result.suggestions.length
            });
          }
        }
        
        return JSON.stringify({ 
          status: "no_results", 
          message: "No places found for this search" 
        });
      } catch (error) {
        log('Tool searchAddress failed:', error);
        return JSON.stringify({ 
          status: "error", 
          error: error instanceof Error ? error.message : "Search failed" 
        });
      }
    },
    
    getSuggestions: async () => {
      log('🔧 Tool Call: getSuggestions');
      // PRIORITY ORDER: Agent persistent cache > React Query suggestions
      const persistentSuggestions = agentSuggestionsCache.current;
      const allSuggestions = persistentSuggestions.length > 0 ? persistentSuggestions :
                           suggestions.length > 0 ? suggestions : 
                           aiSuggestions.length > 0 ? aiSuggestions :
                           autocompleteSuggestions.length > 0 ? autocompleteSuggestions : [];
      
      log('🔧 getSuggestions returning:', {
        totalSuggestions: allSuggestions.length,
        agentCache: persistentSuggestions.length,
        agentCacheQuery: agentCacheQuery.current,
        unified: suggestions.length,
        ai: aiSuggestions.length, 
        autocomplete: autocompleteSuggestions.length,
        isRecording,
        source: persistentSuggestions.length > 0 ? 'agentCache' :
                suggestions.length > 0 ? 'unified' : 
                aiSuggestions.length > 0 ? 'ai' : 
                autocompleteSuggestions.length > 0 ? 'autocomplete' : 'none'
      });
      
      return JSON.stringify({ 
        suggestions: allSuggestions,
        count: allSuggestions.length,
        source: suggestions.length > 0 ? 'unified' : 
                aiSuggestions.length > 0 ? 'ai' : 
                autocompleteSuggestions.length > 0 ? 'autocomplete' : 'none',
        mode: isRecording ? 'conversation' : 'manual',
        availableArrays: {
          unified: suggestions.length,
          ai: aiSuggestions.length,
          autocomplete: autocompleteSuggestions.length
        }
      });
    },
    
    selectSuggestion: async (params: unknown) => {
      log('🔧 ===== Tool Call: selectSuggestion =====');
      log('🔧 AGENT ATTEMPTING SELECTION with params:', params);
      
      let placeId: string | undefined;

      if (typeof params === 'string') {
        placeId = params;
      } else if (params && typeof params === 'object') {
        const paramObj = params as Record<string, unknown>;
        placeId = (paramObj.placeId || paramObj.place_id) as string | undefined;
      }

      if (typeof placeId !== 'string' || !placeId.trim()) {
        const errorMessage = "Invalid or missing 'placeId' or 'place_id' parameter for selectSuggestion tool.";
        log(`Tool selectSuggestion failed: ${errorMessage}`, { params });
        return JSON.stringify({ 
          status: "error", 
          error: errorMessage 
        });
      }
      
      // ENHANCED ROBUST SELECTION: Search ALL available suggestions including persistent agent cache
      const persistentSuggestions = agentSuggestionsCache.current;
      log(`🔧 SelectSuggestion debug:`, {
        isRecording,
        searchQuery,
        agentCache: persistentSuggestions.length,
        agentCacheQuery: agentCacheQuery.current,
        aiSuggestions: aiSuggestions.length,
        autocompleteSuggestions: autocompleteSuggestions.length,
        unifiedSuggestions: suggestions.length,
        lookingForPlaceId: placeId
      });
      
      // Create a comprehensive list including persistent agent cache (highest priority)
      const allAvailableSuggestions = [
        ...persistentSuggestions.map((s: Suggestion) => ({ ...s, source: 'agentCache' })),
        ...suggestions.map((s: Suggestion) => ({ ...s, source: 'unified' })),
        ...aiSuggestions.map((s: Suggestion) => ({ ...s, source: 'ai' })),
        ...autocompleteSuggestions.map((s: Suggestion) => ({ ...s, source: 'autocomplete' }))
      ];
      
              // Remove duplicates by placeId (prefer agentCache > unified > ai > autocomplete)
        const uniqueSuggestions = allAvailableSuggestions.reduce((acc, current) => {
          const existingIndex = acc.findIndex(item => item.placeId === current.placeId);
          if (existingIndex === -1) {
            acc.push(current);
          } else {
            // Keep the one with higher priority source
            const sourcePriority = { agentCache: 4, unified: 3, ai: 2, autocomplete: 1 };
            if (sourcePriority[current.source as keyof typeof sourcePriority] > 
                sourcePriority[acc[existingIndex].source as keyof typeof sourcePriority]) {
              acc[existingIndex] = current;
            }
          }
          return acc;
        }, [] as (Suggestion & { source: string })[]);
      
      // Try to find the selection
      const selection = uniqueSuggestions.find((s) => s.placeId === placeId);
      const sourceFound = selection?.source || 'none';
      
      log(`🔧 Selection search in ${uniqueSuggestions.length} unique suggestions:`, { 
        found: !!selection,
        sourceFound,
        allSources: uniqueSuggestions.map(s => ({ placeId: s.placeId, desc: s.description, source: s.source }))
      });
      
              if (selection) {
          const intent = classifySelectedResult(selection);
          log(`✅ AGENT SELECTION FOUND: "${selection.description}" with intent: ${intent}`);
          
          log('🔧 UPDATING STATE - Before update:', {
            currentSelectedResult: selectedResult?.description,
            currentIntent: currentIntent,
            currentSearchQuery: searchQuery
          });
          
          setCurrentIntent(intent);
          setSelectedResult(selection);
          setSearchQuery(selection.description);
          addHistory({ type: 'agent', text: `Agent selected: "${selection.description}" (${intent})` });
          clearSessionToken();
          
          log('🔧 STATE UPDATED - After update calls made');
          
          // Enhanced confirmation - sync multiple times to ensure state propagation
          log('🔧 SYNCING TO AGENT...');
          setTimeout(() => {
            log('🔧 First sync call');
            syncToAgent();
          }, 50);
          setTimeout(() => {
            log('🔧 Second sync call');
            syncToAgent();
            log('🔧 Final state check:', {
              selectedResult: useAddressFinderStore.getState().selectedResult?.description,
              currentIntent: useAddressFinderStore.getState().currentIntent
            });
          }, 150);
          
          const confirmationResponse = { 
            status: "confirmed", 
            selection,
            intent,
            timestamp: Date.now(),
            confirmationMessage: `Successfully selected "${selection.description}" as ${intent}`
          };
          
          log('✅ AGENT SELECTION SUCCESSFUL - Returning:', confirmationResponse);
          return JSON.stringify(confirmationResponse);
        }
      
      log('❌ Selection not found for placeId:', placeId);
      // Log all available suggestions from all sources
      const debugSuggestions = [
        ...aiSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description, source: 'ai' })),
        ...autocompleteSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description, source: 'autocomplete' })),
        ...suggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description, source: 'unified' }))
      ];
      log('Available suggestions from all sources:', debugSuggestions);
      
      return JSON.stringify({ 
        status: "not_found",
        searchedPlaceId: placeId,
        availableSources: {
          aiSuggestions: aiSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description })),
          autocompleteSuggestions: autocompleteSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description })),
          unifiedSuggestions: suggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description }))
        }
      });
    },
    
    getConfirmedSelection: async () => {
      log('🔧 ===== Tool Call: getConfirmedSelection =====');
      const hasSelection = !!selectedResult;
      
      log('🔧 Current state snapshot:', {
        hasSelection,
        selectedResultExists: !!selectedResult,
        selectedDescription: selectedResult?.description,
        selectedPlaceId: selectedResult?.placeId,
        currentIntent,
        searchQuery,
        isRecording,
        storeState: {
          selectedResult: useAddressFinderStore.getState().selectedResult?.description,
          currentIntent: useAddressFinderStore.getState().currentIntent,
          searchQuery: useAddressFinderStore.getState().searchQuery
        }
      });
      
      const response = {
        hasSelection,
        selection: selectedResult,
        intent: currentIntent,
        searchQuery: searchQuery,
        timestamp: Date.now(),
        mode: isRecording ? 'conversation' : 'manual'
      };
      
      if (hasSelection) {
        log('✅ CONFIRMED SELECTION AVAILABLE:', {
          description: selectedResult?.description,
          placeId: selectedResult?.placeId,
          intent: currentIntent
        });
      } else {
        log('❌ NO SELECTION CONFIRMED - Agent has no selection to work with');
      }
      
      log('🔧 Returning response:', response);
      return JSON.stringify(response);
    },
    
    clearSelection: async () => {
      log('🔧 Tool Call: clearSelection');
      setSelectedResult(null);
      setCurrentIntent('general');
      // Note: No need to clear suggestions - React Query manages state
      addHistory({ type: 'agent', text: 'Selection cleared' });
      // Note: syncToAgent will be called automatically by centralized useEffect
      return JSON.stringify({ status: "cleared" });
    },

    confirmUserSelection: async (params: unknown) => {
      log('🔧 ===== Tool Call: confirmUserSelection =====');
      log('🔧 AGENT ACKNOWLEDGING USER SELECTION with params:', params);
      
      // This tool allows the agent to explicitly acknowledge a user's selection
      const currentSelection = selectedResult;
      log('🔧 Current selection state:', {
        hasSelection: !!currentSelection,
        description: currentSelection?.description,
        placeId: currentSelection?.placeId,
        intent: currentIntent
      });
      
      if (currentSelection) {
        const response = {
          status: "acknowledged",
          selection: currentSelection,
          intent: currentIntent,
          message: `Perfect! I've acknowledged your selection of "${currentSelection.description}" as a ${currentIntent}. The selection is now confirmed and ready to use.`,
          timestamp: Date.now()
        };
        
        log('✅ ACKNOWLEDGING USER SELECTION:', currentSelection.description);
        addHistory({ 
          type: 'agent', 
          text: `✅ Confirmed: "${currentSelection.description}" (${currentIntent})` 
        });
        
        // Sync to ensure agent variables are updated
        setTimeout(() => syncToAgent(), 50);
        
        return JSON.stringify(response);
      } else {
        log('❌ NO SELECTION TO ACKNOWLEDGE');
        return JSON.stringify({
          status: "no_selection",
          message: "I don't see any current selection to acknowledge. Please make a selection first."
        });
      }
    },
  }), [log, isRecording, suggestions, aiSuggestions, autocompleteSuggestions, selectedResult, currentIntent, addHistory, getPlaceSuggestionsAction, getSessionToken, setCurrentIntent, setSelectedResult, setSearchQuery, clearSessionToken, syncToAgent]);

  // Conversation setup with enhanced clientTools
  const conversation = useConversation({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    agentId: import.meta.env.VITE_ELEVENLABS_ADDRESS_AGENT_ID,
    onConnect: () => {
      log('🔗 Connected to ElevenLabs');
      // Manual sync on connect
      setTimeout(() => syncToAgent(), 100);
    },
    onDisconnect: () => {
      log('🔌 Disconnected from ElevenLabs');
      setIsRecording(false);
      // Manual sync on disconnect
      setTimeout(() => syncToAgent(), 100);
    },
    onTranscription: (text: string) => {
      // ENHANCED TRANSCRIPTION LOGGING
      console.log('🎤 RAW TRANSCRIPTION EVENT:', { text, length: text?.length, type: typeof text });
      if (text && text.trim()) {
        log('📝 Transcription received:', text);
        addHistory({ type: 'user', text: `Transcribed: "${text}"` });
      } else {
        log('📝 Empty or null transcription received');
      }
    },
    onMessage: (message) => {
      log('🤖 Agent message received:', message);
      addHistory({ type: 'agent', text: `Agent: ${message}` });
    },
    onStatusChange: (status: string) => {
      log('🔄 Conversation status changed:', status);
    },
    onError: (error) => {
      log('❌ Conversation error:', error);
      addHistory({ type: 'system', text: `Error: ${error}` });
    },
    clientTools,
  });

  const cleanupAudio = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    cleanupAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      let lastUpdate = 0;
      const checkAudio = () => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const isActive = average > 10;
        const now = Date.now();
        if (isActive !== useAddressFinderStore.getState().isVoiceActive && (isActive || now - lastUpdate > 200)) {
          useAddressFinderStore.getState().setIsVoiceActive(isActive);
          lastUpdate = now;
        }
        requestAnimationFrame(checkAudio);
      };
      checkAudio();

      await conversation.startSession();
      setIsRecording(true);
      addHistory({ type: 'system', text: 'Recording started - Autocomplete disabled' });
      // Manual sync after starting recording
      setTimeout(() => syncToAgent(), 100);
    } catch (err) {
      console.error('Error starting recording:', err);
      addHistory({ type: 'system', text: `Error starting recording: ${err instanceof Error ? err.message : String(err)}`});
    }
  }, [conversation, addHistory, setIsRecording, setIsVoiceActive, cleanupAudio, log]);

  const stopRecording = useCallback(async () => {
    await conversation.endSession();
    setIsRecording(false);
    setIsVoiceActive(false);
    cleanupAudio();
    // Note: No need to clear suggestions - React Query manages state
    addHistory({ type: 'system', text: 'Recording stopped - Autocomplete re-enabled' });
    // Manual sync after stopping recording
    setTimeout(() => syncToAgent(), 100);
      }, [conversation, addHistory, setIsRecording, setIsVoiceActive, cleanupAudio, log]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Debug effect to track isRecording changes specifically  
  useEffect(() => {
    log('🎤 ===== RECORDING STATE CHANGE DETECTED =====');
    log('🎤 isRecording changed to:', {
      isRecording,
      conversationStatus: conversation.status,
      timestamp: Date.now(),
      agentCacheCount: agentSuggestionsCache.current.length,
      aiSuggestionsCount: aiSuggestions.length,
      suggestionsCount: suggestions.length
    });
  }, [isRecording, conversation.status, log]);

  // Debug effect to track selectedResult changes
  useEffect(() => {
    log('🔄 ===== SELECTION STATE CHANGE DETECTED =====');
    log('🔄 selectedResult changed in component:', {
      hasSelection: !!selectedResult,
      description: selectedResult?.description,
      placeId: selectedResult?.placeId,
      types: selectedResult?.types,
      currentIntent: currentIntent,
      searchQuery: searchQuery,
      isRecording: isRecording,
      timestamp: Date.now()
    });
    
    // Also check the store state for comparison
    const storeState = useAddressFinderStore.getState();
    log('🔄 Store state comparison:', {
      componentSelected: selectedResult?.description,
      storeSelected: storeState.selectedResult?.description,
      match: selectedResult?.description === storeState.selectedResult?.description
    });
  }, [selectedResult, currentIntent, searchQuery, isRecording, log]);

  // Debug effect to track aiSuggestions changes (only log when suggestions actually change)
  useEffect(() => {
    if (aiSuggestions.length > 0) {
      log('🔄 aiSuggestions changed:', {
        count: aiSuggestions.length,
        isRecording,
        searchQuery,
        suggestions: aiSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description }))
      });
    }
  }, [aiSuggestions, isRecording, searchQuery, log]);

  // Note: Agent sync handled by centralized useEffect above
  
  const handleManualSearch = useCallback((query: string) => {
    // Only allow manual search when conversation is not active
    if (!isRecording) {
      setSearchQuery(query);
    }
  }, [setSearchQuery, isRecording]);
  
  const handleSelectResult = useCallback((result: Suggestion) => {
    log('🎯 === SELECTION FLOW START ===');
    log('🎯 User clicked suggestion:', { 
      description: result.description, 
      placeId: result.placeId,
      types: result.types 
    });
    
    const intent = classifySelectedResult(result);
    log(`🎯 Selected result classified as: ${intent}`);
    
    // Update state
    setCurrentIntent(intent);
    setSelectedResult(result);
    setSearchQuery(result.description);
    addHistory({ type: 'user', text: `Selected: "${result.description}"`});
    
    // Clear session token when user makes a selection (Google best practice)
    clearSessionToken();
    
    // CRITICAL: Check conversation state and notify agent
    log('🎯 Conversation state check:', {
      isRecording,
      conversationStatus: conversation.status,
      hasConversation: !!conversation,
      hasSendUserMessage: !!conversation.sendUserMessage
    });
    
    if (isRecording && conversation.status === 'connected') {
      const selectionMessage = `I have selected "${result.description}" from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
      log('🗨️ SENDING MESSAGE TO AGENT:', selectionMessage);
      
      try {
        // Send a text message to the agent to inform about the selection
        conversation.sendUserMessage?.(selectionMessage);
        log('✅ Message sent to agent successfully');
        addHistory({ type: 'system', text: 'Notified agent about selection' });
      } catch (error) {
        log('❌ Failed to send message to agent:', error);
        addHistory({ type: 'system', text: `Failed to notify agent: ${error}` });
      }
    } else {
      log('⚠️ NOT notifying agent because:', {
        reason: !isRecording ? 'not recording' : 
                conversation.status !== 'connected' ? `conversation status is ${conversation.status}` : 
                'unknown'
      });
    }
    
    // Manual sync after user selection
    log('🎯 Syncing to agent...');
    setTimeout(() => {
      log('🎯 Executing syncToAgent');
      syncToAgent();
      log('🎯 === SELECTION FLOW END ===');
    }, 100);
  }, [log, setCurrentIntent, setSelectedResult, setSearchQuery, addHistory, clearSessionToken, isRecording, conversation, syncToAgent]);
  
  const handleClearSearch = useCallback(() => {
    if (!isRecording) {
      setSearchQuery('');
      setSelectedResult(null);
      setCurrentIntent('general');
      clearSessionToken();
      // Note: syncToAgent will be called automatically by centralized useEffect
    }
  }, [setSearchQuery, setSelectedResult, setCurrentIntent, clearSessionToken, isRecording]);

  const handleClear = useCallback(() => {
    if (searchQuery) {
      queryClient.removeQueries({ queryKey: ['autocomplete', searchQuery] });
      queryClient.removeQueries({ queryKey: ['aiSuggestions', searchQuery] });
    }
    if (debouncedSearchQuery) {
      queryClient.removeQueries({ queryKey: ['autocomplete', debouncedSearchQuery] });
    }
    // Clear agent persistent cache
    agentSuggestionsCache.current = [];
    agentCacheQuery.current = '';
    log('🔧 Agent cache cleared');
    clear();
    // Note: syncToAgent will be called automatically by centralized useEffect
  }, [searchQuery, debouncedSearchQuery, queryClient, clear, log]);

  const handleClearSelection = useCallback(() => {
    setSelectedResult(null);
    addHistory({ type: 'user', text: 'Selection cleared' });
    // Note: syncToAgent will be called automatically by centralized useEffect
  }, [setSelectedResult, addHistory]);

  const getIntentColor = (intent: LocationIntent) => {
    switch (intent) {
      case 'suburb': return 'bg-blue-100 text-blue-800';
      case 'street': return 'bg-green-100 text-green-800';
      case 'address': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ UNIFIED: Always use suggestions from React Query (single source of truth)
  // isLoading is now defined above with the unified suggestions

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Intelligent Address Finder v3</h1>
          <div className="flex items-center justify-center space-x-2">
            <Switch
              id="logging-switch"
              checked={isLoggingEnabled}
              onCheckedChange={setIsLoggingEnabled}
            />
            <Label htmlFor="logging-switch">Enable Logging</Label>
          </div>
        </div>
        
        {/* New controls from GoogleMapsAutocomplete */}
        <Card className="bg-yellow-50">
          <CardContent className="pt-4 space-y-2">
             <div className="flex items-center justify-between">
                <Label htmlFor="smart-validation-switch" className="font-medium">Smart Validation</Label>
                <Switch
                  id="smart-validation-switch"
                  checked={isSmartValidationEnabled}
                  onCheckedChange={setIsSmartValidationEnabled}
                />
             </div>
             <p className="text-xs text-gray-600">
                {isSmartValidationEnabled 
                    ? "Smart fallback for unit addresses Google can't validate."
                    : "Use only Google's standard validation."}
             </p>
          </CardContent>
        </Card>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getIntentColor(currentIntent)}>
            Intent: {currentIntent}
          </Badge>
          {isRecording && (
            <Badge variant="secondary" className="animate-pulse bg-red-100 text-red-800">
              🎤 Conversation Active - Autocomplete Disabled
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Address Lookup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <VoiceInputController
              isRecording={isRecording}
              isVoiceActive={isVoiceActive}
              startRecording={startRecording}
              stopRecording={stopRecording}
            />
            <Separator />
            
            {/* Show disabled state when recording */}
            {isRecording ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">🤖 Voice conversation is active</p>
                <p className="text-xs text-gray-500">Manual input is disabled. The AI will manage place suggestions through conversation.</p>
              </div>
            ) : (
              <ManualSearchForm
                onSearch={handleManualSearch}
                isLoading={isLoading}
                suggestions={suggestions}
                onSelect={handleSelectResult}
                searchQuery={searchQuery}
                onClear={handleClearSearch}
              />
            )}
          </CardContent>
        </Card>

        {/* ✅ UNIFIED: Suggestions display - always from React Query */}
        {suggestions.length > 0 && (
          <Card className={isRecording ? "border-blue-200 bg-blue-50" : "border-gray-200"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isRecording ? "🤖 AI-Generated" : "🔍 Search"} Place Suggestions
                <Badge variant="outline" className={isRecording ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}>
                  {suggestions.length} results
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SuggestionsDisplay
                suggestions={suggestions}  
                onSelect={(suggestion) => {
                  log('🎯 CLICKED SUGGESTION IN SUGGESTIONSCARD:', { 
                    description: suggestion.description,
                    placeId: suggestion.placeId,
                    isRecording: isRecording,
                    component: 'SuggestionsDisplay'
                  });
                  handleSelectResult(suggestion);
                }}
                isLoading={isLoading}
                isError={isError}
                error={error}
              />
            </CardContent>
          </Card>
        )}

        {selectedResult && (
            <SelectedResultCard
                result={selectedResult}
                onClear={handleClearSelection}
            />
        )}
        
        <HistoryPanel history={history} />

        <div className="text-center space-x-4">
            <Button onClick={handleClear} variant="outline">Clear All State</Button>
        </div>
      </div>
    </div>
  );
} 