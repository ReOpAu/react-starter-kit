import { useCallback, useState, type RefObject } from 'react';
import { useAction } from 'convex/react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from 'convex/_generated/api';
import { type Suggestion, type LocationIntent, useAddressFinderStore } from '~/stores/addressFinderStore';
import { classifySelectedResult } from '~/utils/addressFinderUtils';
import { type useConversation } from '@elevenlabs/react';

type UseActionHandlerDependencies = {
  log: (...args: any[]) => void;
  setCurrentIntent: (intent: LocationIntent) => void;
  setSelectedResult: (result: Suggestion | null) => void;
  setSearchQuery: (query: string) => void;
  setAgentRequestedManual: (requested: boolean) => void;
  addHistory: (entry: { type: 'user' | 'agent' | 'system'; text: string }) => void;
  getSessionToken: () => string;
  clearSessionToken: () => void;
  isRecording: boolean;
  conversationRef: RefObject<ReturnType<typeof useConversation> | null>;
  queryClient: QueryClient;
  clearStore: () => void;
};

export function useActionHandler({
  log,
  setCurrentIntent,
  setSelectedResult,
  setSearchQuery,
  setAgentRequestedManual,
  addHistory,
  getSessionToken,
  clearSessionToken,
  isRecording,
  conversationRef,
  queryClient,
  clearStore,
}: UseActionHandlerDependencies) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const validateAddressAction = useAction(api.location.validateAddress);

  const handleSelect = useCallback(async (result: Suggestion) => {
    log('🎯 === UNIFIED SELECTION FLOW START ===');
    log('🎯 Handling selection:', { 
      description: result.description, 
      placeId: result.placeId,
      types: result.types 
    });
    
    const intent = classifySelectedResult(result);
    log(`🎯 Initial classification from suggestion: ${intent}`);
    setCurrentIntent(intent);

    if (intent === 'address') {
      log('🔬 Intent is "address", proceeding with full validation.');
      setValidationError(null);
      setIsValidating(true);

      try {
        const validation = await validateAddressAction({
          address: result.description,
        });

        log('🔬 VALIDATION RESULT:', validation);

        if (validation.success) {
          const enrichedResult: Suggestion = {
            ...result,
            description: validation.result.formattedAddress,
            placeId: validation.result.geocode.placeId,
            // You can add more enriched data here if your Suggestion type supports it
          };
          const finalIntent = classifySelectedResult(enrichedResult);
          log(`🎯 Final intent after enrichment: ${finalIntent}`);
          setCurrentIntent(finalIntent);
          
          setSelectedResult(enrichedResult);
          setSearchQuery(enrichedResult.description);
          setAgentRequestedManual(false);
          addHistory({ type: 'user', text: `Selected: "${enrichedResult.description}"`});
          
          clearSessionToken();
          
          if (isRecording && conversationRef.current?.status === 'connected') {
            const selectionMessage = `I have selected "${enrichedResult.description}" from the available options. Please acknowledge this selection and do not use the selectSuggestion tool - the selection is already confirmed.`;
            log('🗨️ SENDING MESSAGE TO AGENT:', selectionMessage);
            
            try {
              conversationRef.current?.sendUserMessage?.(selectionMessage);
              log('✅ Message sent to agent successfully');
              addHistory({ type: 'system', text: 'Notified agent about selection' });
            } catch (error) {
              log('❌ Failed to send message to agent:', error);
              addHistory({ type: 'system', text: `Failed to notify agent: ${error}` });
            }
          }
        } else {
          log(`❌ VALIDATION FAILED: ${validation.error}`);
          setValidationError(validation.error);
          addHistory({ type: 'system', text: `Validation failed: ${validation.error}` });
        }
      } catch (error: any) {
        log('💥 VALIDATION ACTION FAILED:', error);
        const errorMessage = error.data?.message || error.message || 'An unknown error occurred';
        setValidationError(`Validation failed: ${errorMessage}`);
        addHistory({ type: 'system', text: `Validation action failed: ${errorMessage}` });
      } finally {
        setIsValidating(false);
      }
    } else {
      log(`🎯 Intent is "${intent}", skipping full validation.`);
      setSelectedResult(result);
      setSearchQuery(result.description);
      setAgentRequestedManual(false);
      addHistory({ type: 'user', text: `Selected: "${result.description}"` });
      clearSessionToken();
  
      if (isRecording && conversationRef.current?.status === 'connected') {
          const selectionMessage = `I have selected "${result.description}". This is a ${intent}, not a full address. Please acknowledge this selection.`;
          log('🗨️ SENDING MESSAGE TO AGENT:', selectionMessage);
          
          try {
            conversationRef.current?.sendUserMessage?.(selectionMessage);
            log('✅ Message sent to agent successfully');
            addHistory({ type: 'system', text: `Notified agent about ${intent} selection` });
          } catch (error) {
            log('❌ Failed to send message to agent:', error);
            addHistory({ type: 'system', text: `Failed to notify agent: ${error}` });
          }
      }
    }
    log('🎯 === UNIFIED SELECTION FLOW END ===');
  }, [
    log,
    setCurrentIntent,
    setSelectedResult,
    setSearchQuery,
    setAgentRequestedManual,
    addHistory,
    clearSessionToken,
    isRecording,
    conversationRef,
    validateAddressAction,
    getSessionToken,
  ]);

  const handleClear = useCallback((context: 'user' | 'agent' = 'user') => {
    log(`🗑️ === UNIFIED CLEAR FLOW START (context: ${context}) ===`);
    const { searchQuery } = useAddressFinderStore.getState();
    
    if (searchQuery) {
      queryClient.removeQueries({ queryKey: ['addressSearch', searchQuery], exact: true });
      log('🔧 Cleared React Query cache for:', searchQuery);
    }
    
    clearStore();
    addHistory({ type: context, text: 'State cleared.' });
    log('✅ ALL STATE CLEARED');
    log('🗑️ === UNIFIED CLEAR FLOW END ===');
  }, [log, queryClient, clearStore, addHistory]);

  return {
    handleSelect,
    isValidating,
    validationError,
    handleClear,
  };
} 