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
  StateDebugPanel,
} from '~/components/address-finder';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { useConversation } from '@elevenlabs/react';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
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

// Helper function to de-duplicate suggestions by placeId with source priority
const deduplicateSuggestions = <T extends Suggestion & { source: string }>(
  suggestions: T[]
): T[] => {
  // Define source priority: agentCache > unified > ai > autocomplete
  const sourcePriority = { 
    agentCache: 4, 
    unified: 3, 
    ai: 2, 
    autocomplete: 1 
  };
  
  return suggestions.reduce((acc, current) => {
    const existingIndex = acc.findIndex(item => item.placeId === current.placeId);
    
    if (existingIndex === -1) {
      // No duplicate found, add the suggestion
      acc.push(current);
    } else {
      // Duplicate found, keep the one with higher priority source
      const currentPriority = sourcePriority[current.source as keyof typeof sourcePriority] || 0;
      const existingPriority = sourcePriority[acc[existingIndex].source as keyof typeof sourcePriority] || 0;
      
      if (currentPriority > existingPriority) {
        acc[existingIndex] = current;
      }
    }
    
    return acc;
  }, [] as T[]);
};

export default function AddressFinder() {
  const queryClient = useQueryClient();
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const { syncToAgent } = useAgentSync();
  
  // Note: Removed persistent agent cache - React Query is now the single source of truth

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
  } = useAddressFinderStore(); // Removed setApiResults - no longer needed
  
  // Debounced search query - only used when conversation is NOT active
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  
  // Track when agent specifically requests manual input
  const [agentRequestedManual, setAgentRequestedManual] = useState(false);
  
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

  // Logging utility - STABLE: No dependencies to prevent infinite loops
  const log = useCallback((...args: any[]) => {
    if (useAddressFinderStore.getState().isLoggingEnabled) {
      console.log('[AddressFinder]', ...args);
    }
  }, []); // Empty dependency array makes this completely stable

  // Enhanced sync function for reliable state synchronization
  const performReliableSync = useCallback(async (context: string = 'general') => {
    log(`🔧 RELIABLE SYNC START - Context: ${context}`);
    
    try {
      // Ensure state updates have been processed by React
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Perform initial sync
      syncToAgent();
      log(`🔧 Initial sync completed for ${context}`);
      
      // Wait for state propagation and validate
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Validate synchronization by checking state consistency
      const storeState = useAddressFinderStore.getState();
      const hasValidState = storeState.selectedResult?.description || storeState.searchQuery;
      
      if (hasValidState) {
        // Perform confirmation sync
        syncToAgent();
        log(`🔧 Confirmation sync completed for ${context}`);
        
        // Final state verification
        const finalState = useAddressFinderStore.getState();
        log(`🔧 Final state verified for ${context}:`, {
          selectedResult: finalState.selectedResult?.description,
          currentIntent: finalState.currentIntent,
          searchQuery: finalState.searchQuery
        });
      } else {
        log(`⚠️ No significant state to sync for ${context}`);
      }
      
      log(`✅ RELIABLE SYNC COMPLETE - Context: ${context}`);
    } catch (error) {
      log(`❌ Sync failed for ${context}:`, error);
    }
  }, [syncToAgent]); // Removed log from dependencies - it's stable

  // Use the more powerful location search action
  const getPlaceSuggestionsAction = useAction(api.location.getPlaceSuggestions);
  
  // UNIFIED QUERY - Single source of truth for all API data (manual and voice)
  const { 
    data: suggestions = [], 
    isLoading, 
    isError,
    error 
  } = useQuery({
    queryKey: ['addressSearch', searchQuery],
    queryFn: async () => {
      log('🔍 === UNIFIED QUERY TRIGGERED ===');
      log('📊 QUERY STATE:', {
        searchQuery,
        currentIntent,
        isRecording,
        sessionToken: sessionTokenRef.current?.substring(0, 8) + '...',
        mode: isRecording ? 'conversation' : 'manual'
      });
      
      if (!searchQuery || searchQuery.trim().length < 3) {
        log('⚠️ Query too short or empty, returning empty results');
        return [];
      }
      
      const result = await getPlaceSuggestionsAction({ 
        query: searchQuery,
        intent: (currentIntent && currentIntent !== 'general') ? currentIntent : 'general', // Use current intent with fallback
        isAutocomplete: !isRecording, // Autocomplete mode when not recording
        sessionToken: getSessionToken(), // Include session token for billing optimization
      });
      
      if (result.success) {
        log(`✅ UNIFIED QUERY SUCCESS:`, {
          query: searchQuery,
          suggestionsCount: result.suggestions?.length || 0,
          intent: currentIntent,
          mode: isRecording ? 'conversation' : 'manual',
          suggestions: result.suggestions?.map(s => ({ 
            placeId: s.placeId, 
            description: s.description 
          })) || []
        });
        return result.suggestions || [];
      }
      
      if (!result.success) {
        log(`❌ UNIFIED QUERY FAILED:`, {
          query: searchQuery,
          error: result.error,
          intent: currentIntent,
          mode: isRecording ? 'conversation' : 'manual'
        });
      }
      return [];
    },
    enabled: !!searchQuery && searchQuery.trim().length >= 3,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ManualSearchForm is now self-contained with its own autocomplete query

  // REMOVED: Problematic sync from React Query to Zustand was causing infinite loops
  // Agent sync now gets data directly from React Query via useAgentSync hook

  // REMOVED: Separate sync effect was causing infinite loops with logging toggle
  // The useAgentSync hook handles sync automatically with stable dependencies

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
          
          // Update search query first to ensure query keys match
          setSearchQuery(query);
          
          // Update unified cache for the query being used
          queryClient.setQueryData(['addressSearch', query], result.suggestions);
          
          // Force React Query to refetch with the new query to ensure UI updates
          queryClient.invalidateQueries({ queryKey: ['addressSearch', query] });
          
          // Note: Centralized sync effect will handle sync automatically
          
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
      // Using unified React Query source for all suggestions
      const allSuggestions = suggestions.length > 0 ? suggestions : [];
      
      log('🔧 getSuggestions returning (unified source):', {
        totalSuggestions: allSuggestions.length,
        unified: suggestions.length, 
        isRecording,
        source: suggestions.length > 0 ? 'unified' : 'none',
        note: 'Using unified React Query source for all suggestions'
      });
      
      return JSON.stringify({ 
        suggestions: allSuggestions,
        count: allSuggestions.length,
        source: suggestions.length > 0 ? 'unified' : 'none',
        mode: isRecording ? 'conversation' : 'manual',
        availableArrays: {
          unified: suggestions.length,
          note: 'single source of truth via React Query'
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
      
      // UNIFIED SELECTION: Search unified React Query suggestions only
      log(`🔧 SelectSuggestion debug:`, {
        isRecording,
        searchQuery,
        unified: suggestions.length,
        lookingForPlaceId: placeId,
        note: 'Using unified React Query source for selections'
      });
      
      // Create list from unified suggestions only
      const allAvailableSuggestions = suggestions.map((s: Suggestion) => ({ ...s, source: 'unified' }));
      
      // Remove duplicates by placeId using extracted utility function
      const uniqueSuggestions = deduplicateSuggestions(allAvailableSuggestions);
      
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
          
          // Note: Centralized sync effect will handle sync automatically
          
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
      // Log available unified suggestions
      const debugSuggestions = suggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description, source: 'unified' }));
      log('Available unified suggestions:', debugSuggestions);
      
      return JSON.stringify({ 
        status: "not_found",
        searchedPlaceId: placeId,
        availableSources: {
          unified: suggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description })),
          note: "Using unified React Query source for all suggestions"
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
        
        // Note: Centralized sync effect will handle sync automatically
        
        return JSON.stringify(response);
      } else {
        log('❌ NO SELECTION TO ACKNOWLEDGE');
        return JSON.stringify({
          status: "no_selection",
          message: "I don't see any current selection to acknowledge. Please make a selection first."
        });
      }
    },
    
    requestManualInput: async (params: unknown) => {
      log('🔧 ===== Tool Call: requestManualInput =====');
      log('🔧 AGENT REQUESTING MANUAL INPUT with params:', params);
      
      let reason = 'I think manual input might be more accurate for this address.';
      let context = 'general';
      
      // Parse parameters for reason and context
      if (typeof params === 'string') {
        reason = params;
      } else if (params && typeof params === 'object') {
        const paramObj = params as Record<string, unknown>;
        if (paramObj.reason && typeof paramObj.reason === 'string') {
          reason = paramObj.reason;
        }
        if (paramObj.context && typeof paramObj.context === 'string') {
          context = paramObj.context;
        }
      }
      
      log('🔧 Manual input request details:', { 
        reason, 
        context, 
        isCurrentlyRecording: isRecording
      });
      
      // For hybrid mode: ALWAYS enable manual input, even during recording
      log('🔧 Enabling hybrid mode - conversation continues with manual input available');
      
      try {
        // HYBRID MODE: Set flag to enable ManualSearchForm during conversation
        setAgentRequestedManual(true);
        
        // Add helpful explanation to history
        addHistory({ 
          type: 'agent', 
          text: `🤖 → 📝 ${reason}` 
        });
        
        // Add system message explaining hybrid mode
        if (isRecording) {
          addHistory({ 
            type: 'system', 
            text: 'Hybrid mode activated - You can now type while the conversation continues' 
          });
        } else {
          addHistory({ 
            type: 'system', 
            text: 'Manual input ready - Type your address in the form below' 
          });
        }
        
        log('✅ Successfully enabled hybrid manual input mode');
        
        const response = {
          status: "hybrid_mode_activated",
          reason,
          context,
          timestamp: Date.now(),
          message: isRecording 
            ? "I've enabled manual input so you can type while we continue talking. The search form is now available below."
            : "Manual input is now available. You can type your address in the search form below."
        };
        
        return JSON.stringify(response);
      } catch (error) {
        log('❌ Failed to enable manual input:', error);
        addHistory({ 
          type: 'system', 
          text: `Error enabling manual input: ${error instanceof Error ? error.message : String(error)}` 
        });
        
        return JSON.stringify({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to enable manual input",
          message: "I had trouble enabling manual input. Please try the search form below if it's available."
        });
      }
    },
  }), [isRecording, suggestions, selectedResult, currentIntent, addHistory, getPlaceSuggestionsAction, getSessionToken, setCurrentIntent, setSelectedResult, setSearchQuery, clearSessionToken, syncToAgent, setIsVoiceActive, setAgentRequestedManual]); // Removed log from dependencies - it's stable

  // Conversation setup with enhanced clientTools
  const conversation = useConversation({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    agentId: import.meta.env.VITE_ELEVENLABS_ADDRESS_AGENT_ID,
    onConnect: () => {
      log('🔗 Connected to ElevenLabs');
      // Note: Centralized sync effect will handle sync automatically
    },
    onDisconnect: () => {
      log('🔌 Disconnected from ElevenLabs');
      setIsRecording(false);
      // Note: Centralized sync effect will handle sync automatically
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
    log('🎤 === STARTING RECORDING ===');
    log('📊 PRE-RECORDING STATE:', {
      isRecording,
      isVoiceActive,
      searchQuery,
      selectedResult: selectedResult?.description,
      conversationStatus: conversation.status,
    });
    
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
      setAgentRequestedManual(false); // Reset manual request flag when starting voice
      addHistory({ type: 'system', text: 'Recording started - Autocomplete disabled' });
      
      log('✅ RECORDING STARTED SUCCESSFULLY');
      // Note: Centralized sync effect will handle sync automatically
    } catch (err) {
      log('❌ RECORDING START FAILED:', err);
      console.error('Error starting recording:', err);
      addHistory({ type: 'system', text: `Error starting recording: ${err instanceof Error ? err.message : String(err)}`});
    }
  }, [conversation, addHistory, setIsRecording, setIsVoiceActive, setAgentRequestedManual, cleanupAudio, log, isRecording, isVoiceActive, searchQuery, selectedResult]); // Removed log from dependencies - it's stable

  const stopRecording = useCallback(async () => {
    log('🎤 === STOPPING RECORDING ===');
    log('📊 PRE-STOP STATE:', {
      isRecording,
      isVoiceActive,
      conversationStatus: conversation.status,
      suggestionsCount: suggestions.length,
    });
    
    await conversation.endSession();
    setIsRecording(false);
    setIsVoiceActive(false);
    cleanupAudio();
    // Note: No need to clear suggestions - React Query manages state
    addHistory({ type: 'system', text: 'Recording stopped - Autocomplete re-enabled' });
    
    log('✅ RECORDING STOPPED SUCCESSFULLY');
    // Note: Centralized sync effect will handle sync automatically
      }, [conversation, addHistory, setIsRecording, setIsVoiceActive, cleanupAudio, log, isRecording, isVoiceActive, suggestions]); // Removed log from dependencies - it's stable

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Note: Agent sync handled by centralized useEffect above
  
  // handleManualSearch removed - ManualSearchForm now handles its own queries
  
  const handleSelectResult = useCallback((result: Suggestion) => {
    log('🎯 === SELECTION FLOW START ===');
    log('🎯 User clicked suggestion:', { 
      description: result.description, 
      placeId: result.placeId,
      types: result.types 
    });
    
    const intent = classifySelectedResult(result);
    log(`🎯 Selected result classified as: ${intent}`);
    
    // Log pre-update state
    log('📊 PRE-SELECTION STATE:', {
      previousIntent: currentIntent,
      previousResult: selectedResult?.description,
      previousQuery: searchQuery,
      newIntent: intent,
      newResult: result.description,
    });
    
    // Update state
    setCurrentIntent(intent);
    setSelectedResult(result);
    setSearchQuery(result.description);
    setAgentRequestedManual(false); // Reset manual request flag when user makes selection
    addHistory({ type: 'user', text: `Selected: "${result.description}"`});
    
    // Clear session token when user makes a selection (Google best practice)
    clearSessionToken();
    
    // Log post-update state (delayed to ensure state updates have propagated)
    setTimeout(() => {
      log('📊 POST-SELECTION STATE:', {
        currentIntent: useAddressFinderStore.getState().currentIntent,
        currentResult: useAddressFinderStore.getState().selectedResult?.description,
        currentQuery: useAddressFinderStore.getState().searchQuery,
      });
    }, 100);
    
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
    
    // Note: Centralized sync effect will handle sync automatically
    log('🎯 === SELECTION FLOW END ===');
  }, [setCurrentIntent, setSelectedResult, setSearchQuery, setAgentRequestedManual, addHistory, clearSessionToken, isRecording, conversation]); // Removed log from dependencies - it's stable
  
  // handleClearSearch removed - ManualSearchForm now handles its own clearing

  const handleClear = useCallback(() => {
    log('🗑️ === CLEARING ALL STATE ===');
    log('📊 PRE-CLEAR STATE:', {
      searchQuery,
      debouncedSearchQuery,
      selectedResult: selectedResult?.description,
      historyLength: history.length,
      suggestionsCount: suggestions.length,
      isRecording,
    });
    
    if (searchQuery) {
      queryClient.removeQueries({ queryKey: ['addressSearch', searchQuery] });
      log('🔧 Cleared React Query cache for:', searchQuery);
    }
    if (debouncedSearchQuery) {
      queryClient.removeQueries({ queryKey: ['addressSearch', debouncedSearchQuery] });
      log('🔧 Cleared React Query cache for:', debouncedSearchQuery);
    }
    
    clear();
    log('✅ ALL STATE CLEARED');
    // Note: syncToAgent will be called automatically by centralized useEffect
  }, [searchQuery, debouncedSearchQuery, queryClient, clear, selectedResult, history, suggestions, isRecording, log]); // Removed log from dependencies - it's stable

  const handleClearSelection = useCallback(() => {
    log('🗑️ CLEARING SELECTION');
    log('📊 PRE-CLEAR SELECTION STATE:', {
      currentSelection: selectedResult?.description,
      currentIntent: currentIntent,
      searchQuery,
    });
    
    setSelectedResult(null);
    addHistory({ type: 'user', text: 'Selection cleared' });
    
    log('✅ SELECTION CLEARED');
    // Note: syncToAgent will be called automatically by centralized useEffect
  }, [setSelectedResult, addHistory, selectedResult, currentIntent, searchQuery, log]);

  const getIntentColor = (intent: LocationIntent) => {
    switch (intent) {
      case 'suburb': return 'bg-blue-100 text-blue-800';
      case 'street': return 'bg-green-100 text-green-800';
      case 'address': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Switch components removed to eliminate infinite loop issues
  // Logging is always enabled, smart validation is always enabled by default

  // AUTOCOMPLETE: Works silently in ManualSearchForm, only populates confirmed selection
  // AI SUGGESTIONS: Displayed in suggestions section during conversation mode

  // Determine when to show ManualSearchForm: traditional manual mode OR hybrid mode
  const shouldShowManualForm = !isRecording || agentRequestedManual;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Intelligent Address Finder v3</h1>
          <p className="text-sm text-gray-600">Voice-enabled address search with AI assistance</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={getIntentColor(currentIntent)}>
            Intent: {currentIntent}
          </Badge>
          {isRecording && (
            <Badge variant="secondary" className="animate-pulse bg-red-100 text-red-800">
              🎤 Conversation Active
              {agentRequestedManual && " + Manual Input"}
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
            
            {/* Hybrid Mode Support: Show ManualSearchForm in both manual and hybrid modes */}
            {shouldShowManualForm ? (
              <div className="space-y-4">
                {/* Show helpful message when agent specifically requested manual input */}
                {agentRequestedManual && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 text-lg">🤖 → 📝</div>
                      <div>
                        <p className="text-sm font-medium text-blue-800 mb-1">
                          {isRecording ? "Hybrid Mode Active" : "AI Agent requested manual input"}
                        </p>
                        <p className="text-xs text-blue-600">
                          {isRecording 
                            ? "You can now type addresses while continuing the voice conversation."
                            : "The AI suggested typing your address manually for better accuracy."
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <ManualSearchForm
                  onSelect={handleSelectResult}
                />
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">🤖 Voice conversation is active</p>
                <p className="text-xs text-gray-500">The AI will manage place suggestions through conversation. It can enable manual input if needed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI-Generated Suggestions Display - Following strict display rules */}
        {suggestions.length > 0 && isRecording && !selectedResult && !agentRequestedManual && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🤖 AI-Generated Place Suggestions
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {suggestions.length} results
                </Badge>
              </CardTitle>
              <p className="text-sm text-blue-600">Agent-generated suggestions during conversation</p>
            </CardHeader>
            <CardContent>
              <SuggestionsDisplay
                suggestions={suggestions}  
                onSelect={(suggestion) => {
                  log('🎯 CLICKED AI SUGGESTION:', { 
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

        <StateDebugPanel
          suggestions={suggestions}
          isLoading={isLoading}
          isError={isError}
          error={error}
          debouncedSearchQuery={debouncedSearchQuery}
          agentRequestedManual={agentRequestedManual}
          sessionToken={sessionTokenRef.current}
          conversationStatus={conversation.status}
          conversationConnected={conversation.status === 'connected'}
        />

        <div className="text-center space-x-4">
            <Button onClick={handleClear} variant="outline">Clear All State</Button>
        </div>
      </div>
    </div>
  );
} 