import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAddressFinderStore } from '~/stores/addressFinderStore';

export function useAgentSync() {
  const queryClient = useQueryClient();
  
  const syncToAgent = useCallback(() => {
    try {
      const windowWithElevenLabs = window as typeof window & {
        setVariable?: (name: string, value: unknown) => void;
      };
      
      if (typeof windowWithElevenLabs.setVariable === 'function') {
        // Get current state from stores (no dependencies to avoid loops)
        const store = useAddressFinderStore.getState();
        
        // The store is now the single source of truth for API state
        const { suggestions, isLoading, error } = store.apiResults;
        
        // Create comprehensive agent state - use stable timestamp (rounded to nearest second)
        const timestamp = Math.floor(Date.now() / 1000) * 1000;
        const agentState = {
          // UI State
          ui: {
            isRecording: store.isRecording,
            isVoiceActive: store.isVoiceActive,
            agentRequestedManual: store.agentRequestedManual,
            currentIntent: store.currentIntent,
            searchQuery: store.searchQuery,
            hasQuery: !!store.searchQuery,
          },
          
          // API State (from Zustand - single source of truth)
          api: {
            suggestions,
            isLoading,
            error: error || null,
            hasResults: suggestions.length > 0,
            hasMultipleResults: suggestions.length > 1,
            resultCount: suggestions.length,
            source: store.isRecording ? 'voice' : 'manual',
          },
          
          // Selection State
          selection: {
            selectedResult: store.selectedResult,
            hasSelection: !!store.selectedResult,
            selectedAddress: store.selectedResult?.description || null,
            selectedPlaceId: store.selectedResult?.placeId || null,
          },
          
          // Meta
          meta: {
            lastUpdate: timestamp,
            sessionActive: store.isRecording,
            agentRequestedManual: store.agentRequestedManual,
            dataFlow: 'API → React Query → Zustand → ElevenLabs → Agent (Corrected)'
          }
        };
        
        // Sync to ElevenLabs variables
        windowWithElevenLabs.setVariable("agentState", agentState);
        
        // Individual variables for easy access
        windowWithElevenLabs.setVariable("isRecording", agentState.ui.isRecording);
        windowWithElevenLabs.setVariable("hasResults", agentState.api.hasResults);
        windowWithElevenLabs.setVariable("selectedResult", agentState.selection.selectedAddress);
        windowWithElevenLabs.setVariable("suggestions", agentState.api.suggestions);
        
        if (store.isLoggingEnabled) {
          console.log('[AgentSync] State synchronized:', agentState);
        }
      }
    } catch (error) {
      console.warn('[AgentSync] Failed to sync state:', error);
    }
  }, [queryClient]); // Only depend on queryClient which is stable
  
  return { syncToAgent };
} 