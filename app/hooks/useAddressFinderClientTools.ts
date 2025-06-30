import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useAddressFinderStore, type Suggestion } from '~/stores/addressFinderStore';
import { classifySelectedResult } from '~/utils/addressFinderUtils';

export function useAddressFinderClientTools(
  getSessionToken: () => string,
  clearSessionToken: () => void
) {
  const queryClient = useQueryClient();
  const getPlaceSuggestionsAction = useAction(api.location.getPlaceSuggestions);
  
  const {
    searchQuery,
    selectedResult,
    currentIntent,
    isRecording,
    setSearchQuery,
    setSelectedResult,
    setCurrentIntent,
    addHistory,
    setAgentRequestedManual,
  } = useAddressFinderStore();

  // Logging utility - STABLE: No dependencies to prevent infinite loops
  const log = useCallback((...args: any[]) => {
    if (useAddressFinderStore.getState().isLoggingEnabled) {
      console.log('[ClientTools]', ...args);
    }
  }, []); // Empty dependency array makes this completely stable

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
      
      // Reset intent for a new search
      setCurrentIntent('general');
      
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

          // As per documentation, update React Query cache first. This ensures
          // the data source is updated before any state change that might trigger a sync.
          queryClient.setQueryData(['addressSearch', query], result.suggestions);

          // Now, update the search query in the Zustand store. This change will
          // be picked up by the consolidated useEffect, which will then sync
          // the complete, consistent state to the agent.
          setSearchQuery(query);

          // The call to `invalidateQueries` is removed as it's redundant.
          // `setQueryData` updates the cache, and the `useQuery` hook will
          // automatically re-render with the new data. Invalidating would
          // cause an unnecessary network request.
          
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
      // Get current search query from fresh state
      const currentSearchQuery = useAddressFinderStore.getState().searchQuery;
      const suggestions = queryClient.getQueryData<Suggestion[]>(['addressSearch', currentSearchQuery]) || [];
      
      log('🔧 getSuggestions returning (unified source):', {
        totalSuggestions: suggestions.length,
        unified: suggestions.length, 
        isRecording,
        source: suggestions.length > 0 ? 'unified' : 'none',
        note: 'Using unified React Query source for all suggestions'
      });
      
      return JSON.stringify({ 
        suggestions: suggestions,
        count: suggestions.length,
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
      
      // DECOUPLED STATE: Fetch fresh state directly to avoid stale closures.
      const currentSearchQuery = useAddressFinderStore.getState().searchQuery;
      const currentSuggestions = queryClient.getQueryData<Suggestion[]>(['addressSearch', currentSearchQuery]) || [];
      
      log(`🔧 SelectSuggestion debug:`, {
        isRecording: useAddressFinderStore.getState().isRecording,
        searchQuery: currentSearchQuery,
        unified: currentSuggestions.length,
        lookingForPlaceId: placeId,
        note: 'Using fresh state from store/cache'
      });
      
      // Try to find the selection directly from the fresh suggestions array
      const selection = currentSuggestions.find((s) => s.placeId === placeId);
      
      log(`🔧 Selection search in ${currentSuggestions.length} fresh suggestions:`, { 
        found: !!selection,
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
      const debugSuggestions = currentSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description, source: 'unified' }));
      log('Available unified suggestions:', debugSuggestions);
      
      return JSON.stringify({ 
        status: "not_found",
        searchedPlaceId: placeId,
        availableSources: {
          unified: currentSuggestions.map((s: Suggestion) => ({ placeId: s.placeId, description: s.description })),
          note: "Using unified React Query source for all suggestions"
        }
      });
    },
    
    getCurrentState: async () => {
      log('🔧 ===== Tool Call: getCurrentState =====');
      const { 
        isRecording, 
        isVoiceActive, 
        currentIntent, 
        searchQuery, 
        selectedResult,
        apiResults,
      } = useAddressFinderStore.getState();

      const stateSummary = {
        ui: {
          isRecording,
          isVoiceActive,
          currentIntent: currentIntent || 'general',
          searchQuery,
        },
        api: {
          suggestionsCount: apiResults.suggestions.length,
          isLoading: apiResults.isLoading,
          error: apiResults.error,
          source: apiResults.source,
        },
        selection: {
          hasSelection: !!selectedResult,
          selectedAddress: selectedResult?.description || null,
          selectedPlaceId: selectedResult?.placeId || null,
        },
        meta: {
          timestamp: Date.now(),
        }
      };
      
      log('🔧 getCurrentState returning summary:', stateSummary);
      
      return JSON.stringify(stateSummary);
    },
    
    getConfirmedSelection: async () => {
      log('🔧 ===== Tool Call: getConfirmedSelection =====');
      
      // DECOUPLED STATE: Fetch fresh state directly from the store.
      const { selectedResult, currentIntent, searchQuery, isRecording } = useAddressFinderStore.getState();
      const hasSelection = !!selectedResult;
      
      log('🔧 Current state snapshot (fresh from store):', {
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
    
    requestManualInput: async (params: { reason?: string }) => {
      log('🔧 ===== Tool Call: requestManualInput =====');
      log('🔧 Agent is requesting manual input. Reason:', params?.reason);

      addHistory({
        type: 'agent',
        text: `🤖 → 📝 ${params?.reason || 'The agent suggested switching to manual input for better accuracy.'}`,
      });

      // This directly updates the UI state in address-finder.tsx
      setAgentRequestedManual(true);

      return JSON.stringify({
        status: 'hybrid_mode_activated',
        message: 'Manual input has been enabled. The user can now type while the conversation continues.',
      });
    },
  }), [
    addHistory, 
    getPlaceSuggestionsAction, 
    getSessionToken, 
    setCurrentIntent, 
    setSelectedResult, 
    setSearchQuery, 
    clearSessionToken, 
    queryClient,
    log,
    selectedResult,
    currentIntent,
    searchQuery,
    isRecording,
    setAgentRequestedManual,
  ]);

  return clientTools;
} 