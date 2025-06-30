import { useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import { useAddressFinderStore } from '~/stores/addressFinderStore';

export function useConversationManager(clientTools: Record<string, any>) {
  const { addHistory } = useAddressFinderStore();

  // Logging utility - STABLE: No dependencies to prevent infinite loops
  const log = useCallback((...args: any[]) => {
    if (useAddressFinderStore.getState().isLoggingEnabled) {
      console.log('[ConversationManager]', ...args);
    }
  }, []); // Empty dependency array makes this completely stable

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
      // Note: setIsRecording handled by audio manager
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
    onMessage: (message: any) => {
      log('🤖 Agent message received:', message);
      if (message.type === 'text') {
        addHistory({ type: 'agent', text: `Agent: ${message.text}` });
      }
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

  return {
    conversation,
  };
} 