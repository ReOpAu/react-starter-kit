import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';
import { useAddressFinderStore, type Suggestion } from '~/stores/addressFinderStore';
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
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';

export default function AddressFinder() {
  const queryClient = useQueryClient();
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Global state from Zustand (UI state only)
  const {
    searchQuery,
    selectedResult,
    isRecording,
    isVoiceActive,
    history,
    isLoggingEnabled,
    setSearchQuery,
    setSelectedResult,
    setIsRecording,
    setIsVoiceActive,
    addHistory,
    setIsLoggingEnabled,
    clear,
  } = useAddressFinderStore();

  // Logging utility
  const log = useCallback((...args: any[]) => {
    if (useAddressFinderStore.getState().isLoggingEnabled) {
      console.log('[AddressFinder]', ...args);
    }
  }, []);

  // Convex action for searching places
  const searchAction = useAction(api.addressFinder.search);
  
  // React Query as the single source of truth for search results
  const { 
    data: suggestions = [], 
    isLoading: isSearchingQuery, 
    isError,
    error 
  } = useQuery({
    queryKey: ['addressSearch', searchQuery],
    queryFn: async () => {
      log('Query triggered with searchQuery:', searchQuery);
      if (!searchQuery || searchQuery.trim().length < 3) {
        return [];
      }
      const result = await searchAction({ query: searchQuery });
      return result?.success ? result.suggestions || [] : [];
    },
    enabled: !!searchQuery && searchQuery.trim().length >= 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Helper function to wait for query results (for clientTools)
  const waitForQueryResult = useCallback(async (query: string, timeoutMs = 10000): Promise<Suggestion[]> => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const cached = queryClient.getQueryData(['addressSearch', query]);
      if (cached !== undefined) {
        return Array.isArray(cached) ? cached : [];
      }
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Query timeout');
  }, [queryClient]);

  // Create clientTools with proper state access using useMemo to prevent recreation
  const clientTools = useMemo(() => ({
    searchAddress: async (params: unknown) => {
      log('Tool Call: searchAddress with params:', params);
      
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
      
      // Get fresh store reference
      const store = useAddressFinderStore.getState();
      store.addHistory({ type: 'agent', text: `Searching for: "${query}"` });
      
      try {
        // Update search query to trigger React Query
        store.setSearchQuery(query);
        
        // Wait for the query to complete
        const results = await waitForQueryResult(query);
        
        log('Tool searchAddress successful:', results);
        return JSON.stringify({ 
          status: "confirmed", 
          suggestions: results 
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
      // Use fresh store state for consistency
      const store = useAddressFinderStore.getState();
      const currentSuggestions = (queryClient.getQueryData(['addressSearch', store.searchQuery]) as Suggestion[]) || [];
      log('Tool Call: getSuggestions -> Found', currentSuggestions);
      return JSON.stringify({ suggestions: currentSuggestions });
    },
    
    selectSuggestion: async (params: unknown) => {
      log('🔧 Tool Call: selectSuggestion with params:', params);
      
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
      
      // Get fresh store reference and current suggestions
      const store = useAddressFinderStore.getState();
      log('📍 Current store state:', {
        searchQuery: store.searchQuery,
        currentSelectedResult: store.selectedResult
      });
      
      const currentSuggestions = (queryClient.getQueryData(['addressSearch', store.searchQuery]) as Suggestion[]) || [];
      log('💾 Cache data for key ["addressSearch", "' + store.searchQuery + '"]:', currentSuggestions);
      
      const selection = currentSuggestions.find((s: Suggestion) => s.placeId === placeId);
      log('🎯 Found selection:', selection);
      
      if (selection) {
        log('✅ Before setSelectedResult - current selectedResult:', store.selectedResult);
        
        // Force state update with fresh store reference
        store.setSelectedResult(selection);
        store.addHistory({ type: 'agent', text: `Selected: "${selection.description}"` });
        
        // Verify the update worked
        const updatedStore = useAddressFinderStore.getState();
        log('✅ After setSelectedResult - new selectedResult:', updatedStore.selectedResult);
        
        log('🎉 Selection confirmed:', selection);
        return JSON.stringify({ status: "confirmed", selection });
      }
      
      log('❌ Selection not found for placeId:', placeId);
      log('❌ Available placeIds:', currentSuggestions.map(s => s.placeId));
      return JSON.stringify({ status: "not_found" });
    },
    
    getConfirmedSelection: async () => {
      log('Tool Call: getConfirmedSelection');
      const store = useAddressFinderStore.getState();
      return JSON.stringify({ selection: store.selectedResult });
    },
    
    clearSelection: async () => {
      log('Tool Call: clearSelection');
      const store = useAddressFinderStore.getState();
      store.clear();
      return JSON.stringify({ status: "cleared" });
    },
  }), [log, queryClient, waitForQueryResult]);

  // Simplified clientTools with proper async handling
  const conversation = useConversation({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    agentId: import.meta.env.VITE_ELEVENLABS_ADDRESS_AGENT_ID,
    onTranscription: (text: string) => {
      if (text) {
        log('Transcription received:', text);
        addHistory({ type: 'user', text: `Transcribed: "${text}"` });
        setSearchQuery(text);
      }
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
      addHistory({ type: 'system', text: 'Recording started' });
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
    addHistory({ type: 'system', text: 'Recording stopped' });
  }, [conversation, addHistory, setIsRecording, setIsVoiceActive, cleanupAudio, log]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  // Debug effect to track selectedResult changes
  useEffect(() => {
    log('🔄 selectedResult changed in component:', selectedResult);
  }, [selectedResult, log]);
  
  const handleManualSearch = (query: string) => {
    setSearchQuery(query); // Just set the query for manual search as well
  };
  
  const handleSelectResult = (result: Suggestion) => {
    setSelectedResult(result);
    addHistory({ type: 'user', text: `Selected: "${result.description}"`});
  };
  
  const handleClear = () => {
    // Clear React Query cache for current search
    if (searchQuery) {
      queryClient.removeQueries({ queryKey: ['addressSearch', searchQuery] });
    }
    clear();
    addHistory({ type: 'system', text: 'State cleared by user' });
  };

  const handleClearSelection = () => {
    setSelectedResult(null);
    addHistory({ type: 'user', text: 'Selection cleared' });
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Intelligent Address Finder v2</h1>
          <div className="flex items-center justify-center space-x-2">
            <Switch
              id="logging-switch"
              checked={isLoggingEnabled}
              onCheckedChange={setIsLoggingEnabled}
            />
            <Label htmlFor="logging-switch">Enable Logging</Label>
          </div>
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
            <ManualSearchForm
              onSearch={handleManualSearch}
              isLoading={isSearchingQuery}
            />
          </CardContent>
        </Card>

        <SuggestionsDisplay
          suggestions={suggestions}
          isLoading={isSearchingQuery}
          isError={isError}
          error={error instanceof Error ? error.message : null}
          onSelect={handleSelectResult}
        />

        {selectedResult && (
            <SelectedResultCard
                result={selectedResult}
                onClear={handleClearSelection}
            />
        )}
        
        <HistoryPanel history={history} />

        <div className="text-center space-x-4">
            <Button onClick={handleClear} variant="outline">Clear All State</Button>
            <Button 
              onClick={() => {
                // Test if the UI update mechanism works
                const testSuggestion: Suggestion = {
                  description: "Test Address, Australia",
                  placeId: "test-place-id-123"
                };
                log('🧪 Testing UI update with test suggestion:', testSuggestion);
                setSelectedResult(testSuggestion);
                addHistory({ type: 'system', text: 'Test selection made via button' });
              }}
              variant="outline"
            >
              Test UI Update
            </Button>
        </div>
      </div>
    </div>
  );
} 