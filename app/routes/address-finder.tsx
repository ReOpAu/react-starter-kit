import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useAddressFinderStore, type Suggestion, type LocationIntent } from '~/stores/addressFinderStore';
import { useAgentSync } from '~/hooks/useAgentSync';
import { useAudioManager } from '~/hooks/useAudioManager';
import { useReliableSync } from '~/hooks/useReliableSync';
import { useAddressFinderClientTools } from '~/hooks/useAddressFinderClientTools';
import { useConversationManager } from '~/hooks/useConversationManager';
import { classifySelectedResult } from '~/utils/addressFinderUtils';
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
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import AgentStatePanel from '~/components/address-finder/AgentStatePanel';
import AgentDebugCopyPanel from '~/components/address-finder/AgentDebugCopyPanel';

export default function AddressFinder() {
  const queryClient = useQueryClient();
  const { syncToAgent } = useAgentSync();
  const { performReliableSync } = useReliableSync();
  
  // Global state from Zustand
  const {
    searchQuery,
    selectedResult,
    isRecording,
    isVoiceActive,
    history,
    currentIntent,
    agentRequestedManual,
    setSearchQuery,
    setSelectedResult,
    setCurrentIntent,
    addHistory,
    clear,
    setApiResults,
    setAgentRequestedManual,
  } = useAddressFinderStore();
  
  // Local component state
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  
  // Session token management
  const sessionTokenRef = useRef<string | null>(null);
  
  // Logging utility - STABLE: No dependencies to prevent infinite loops
  const log = useCallback((...args: any[]) => {
    if (useAddressFinderStore.getState().isLoggingEnabled) {
      console.log('[AddressFinder]', ...args);
    }
  }, []); // Empty dependency array makes this completely stable
  
  // Session token functions
  const getSessionToken = useCallback(() => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = crypto.randomUUID();
      log('Generated new session token:', sessionTokenRef.current);
    }
    return sessionTokenRef.current;
  }, [log]);
  
  const clearSessionToken = useCallback(() => {
    if (sessionTokenRef.current) {
      log('Clearing session token:', sessionTokenRef.current);
      sessionTokenRef.current = null;
    }
  }, [log]);

  // Initialize hooks
  const clientTools = useAddressFinderClientTools(getSessionToken, clearSessionToken);
  const { conversation } = useConversationManager(clientTools);
  const { startRecording, stopRecording } = useAudioManager();

  // API Action
  const getPlaceSuggestionsAction = useAction(api.location.getPlaceSuggestions);
  
  // UNIFIED QUERY - Single source of truth for all API data
  const { 
    data, 
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
        intent: (currentIntent && currentIntent !== 'general') ? currentIntent : 'general',
        isAutocomplete: !isRecording,
        sessionToken: getSessionToken(),
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

  // STABLE SUGGESTIONS
  const suggestions = useMemo(() => data || [], [data]);

  // REQUIRED & CONSOLIDATED: Sync React Query state to Zustand and then to Agent
  useEffect(() => {
    setApiResults({
      suggestions: suggestions || [],
      isLoading,
      error: error ? (error as Error).message : null,
      source: isRecording ? 'voice' : 'manual',
    });

    syncToAgent();
  }, [
    suggestions,
    isLoading,
    error,
    isRecording,
    isVoiceActive,
    selectedResult,
    currentIntent,
    searchQuery,
    agentRequestedManual,
  ]);

  // Debounced search query effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isRecording && searchQuery !== debouncedSearchQuery) {
        setDebouncedSearchQuery(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isRecording, debouncedSearchQuery]);

  // Construct agent state for debugging
  const agentStateForDebug = useMemo(() => {
    const timestamp = Date.now();
    return {
      ui: {
        isRecording,
        isVoiceActive,
        currentIntent: currentIntent || 'general',
        searchQuery,
        hasQuery: !!searchQuery,
      },
      api: {
        suggestions,
        isLoading,
        error: error ? (error as Error).message : null,
        hasResults: suggestions.length > 0,
        hasMultipleResults: suggestions.length > 1,
        resultCount: suggestions.length,
        source: isRecording ? 'voice' : 'manual',
      },
      selection: {
        selectedResult,
        hasSelection: !!selectedResult,
        selectedAddress: selectedResult?.description || null,
        selectedPlaceId: selectedResult?.placeId || null,
      },
      meta: {
        lastUpdate: timestamp,
        sessionActive: isRecording,
        agentRequestedManual,
        dataFlow: 'API → React Query → Zustand → ElevenLabs → Agent (Corrected)'
      }
    };
  }, [
    isRecording, 
    isVoiceActive, 
    currentIntent, 
    searchQuery, 
    suggestions, 
    isLoading, 
    error, 
    selectedResult,
    agentRequestedManual
  ]);

  // Event handlers
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
    setAgentRequestedManual(false);
    addHistory({ type: 'user', text: `Selected: "${result.description}"`});
    
    // Clear session token
    clearSessionToken();
    
    // Notify agent during conversation
    if (isRecording && conversation.status === 'connected') {
      const selectionMessage = `I have selected "${result.description}" from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
      log('🗨️ SENDING MESSAGE TO AGENT:', selectionMessage);
      
      try {
        conversation.sendUserMessage?.(selectionMessage);
        log('✅ Message sent to agent successfully');
        addHistory({ type: 'system', text: 'Notified agent about selection' });
      } catch (error) {
        log('❌ Failed to send message to agent:', error);
        addHistory({ type: 'system', text: `Failed to notify agent: ${error}` });
      }
    }
    
    log('🎯 === SELECTION FLOW END ===');
  }, [
    setCurrentIntent, 
    setSelectedResult, 
    setSearchQuery, 
    setAgentRequestedManual, 
    addHistory, 
    clearSessionToken, 
    isRecording, 
    conversation,
    log
  ]);

  const handleClear = useCallback(() => {
    log('🗑️ === CLEARING ALL STATE ===');
    
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
  }, [searchQuery, debouncedSearchQuery, queryClient, clear, log]);

  const handleClearSelection = useCallback(() => {
    log('🗑️ CLEARING SELECTION');
    setSelectedResult(null);
    addHistory({ type: 'user', text: 'Selection cleared' });
    log('✅ SELECTION CLEARED');
  }, [setSelectedResult, addHistory, log]);

  const handleRequestAgentState = useCallback(() => {
    if (conversation.status === 'connected') {
      const prompt = "Please report your current state. Use the getCurrentState tool to find out what it is, and then tell me the result.";
      log('🤖 Requesting agent state with prompt:', prompt);
      conversation.sendUserMessage?.(prompt);
      addHistory({ type: 'user', text: 'Requested current state from agent.' });
    } else {
      log('⚠️ Cannot request agent state, conversation not connected.');
      addHistory({ type: 'system', text: 'Error: Conversation not connected.' });
    }
  }, [conversation, addHistory, log]);

  const getIntentColor = (intent: LocationIntent) => {
    switch (intent) {
      case 'suburb': return 'bg-blue-100 text-blue-800';
      case 'street': return 'bg-green-100 text-green-800';
      case 'address': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine when to show ManualSearchForm
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
              startRecording={() => startRecording(conversation, setAgentRequestedManual)}
              stopRecording={() => stopRecording(conversation)}
            />
            <Separator />
            
            {shouldShowManualForm ? (
              <div className="space-y-4">
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
                
                <ManualSearchForm onSelect={handleSelectResult} />
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">🤖 Voice conversation is active</p>
                <p className="text-xs text-gray-500">The AI will manage place suggestions through conversation. It can enable manual input if needed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI-Generated Suggestions Display */}
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
                onSelect={handleSelectResult}
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

        <details className="group rounded-lg bg-gray-50 p-4 border border-gray-200">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
            Toggle Debug Panels
          </summary>
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <AgentStatePanel agentState={agentStateForDebug} />
            </div>
            <AgentDebugCopyPanel agentState={agentStateForDebug} history={history} />
          </div>
        </details>

        <div className="text-center space-x-4">
          <Button onClick={handleRequestAgentState} variant="secondary">Get Agent State</Button>
          <Button onClick={handleClear} variant="outline">Clear All State</Button>
        </div>
      </div>
    </div>
  );
} 