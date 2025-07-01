import { useCallback, useRef, useEffect } from 'react';
// import { useAddressFinderStore } from '~/stores/addressFinderStore'; // ❌ REMOVE OLD STORE
import { useUIStore } from '~/stores/uiStore'; // ✅ ADD NEW STORE
import { useHistoryStore } from '~/stores/historyStore'; // ✅ ADD NEW STORE

export function useAudioManager() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // ✅ GET STATE AND ACTIONS FROM NEW PILLAR STORES
  const {
    isRecording,
    isVoiceActive,
    isLoggingEnabled,
    setIsVoiceActive,
    setIsRecording,
    setAgentRequestedManual,
  } = useUIStore();
  const { addHistory } = useHistoryStore();

  // Logging utility - STABLE: No dependencies to prevent infinite loops
  const log = useCallback((...args: any[]) => {
    // Use getState() to access store values without creating a reactive dependency
    if (useUIStore.getState().isLoggingEnabled) {
      console.log('[AudioManager]', ...args);
    }
  }, []); // Empty dependency array makes this completely stable

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

  const startRecording = useCallback(async (conversation: any) => {
    log('🎤 === STARTING RECORDING ===');
    log('📊 PRE-RECORDING STATE:', {
      isRecording: useUIStore.getState().isRecording,
      isVoiceActive: useUIStore.getState().isVoiceActive,
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
        if (!mediaStreamRef.current) return; // Exit if cleaned up
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const isActive = average > 10;
        const now = Date.now();
        if (isActive !== useUIStore.getState().isVoiceActive && (isActive || now - lastUpdate > 200)) {
          useUIStore.getState().setIsVoiceActive(isActive);
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
    } catch (err) {
      log('❌ RECORDING START FAILED:', err);
      console.error('Error starting recording:', err);
      addHistory({ type: 'system', text: `Error starting recording: ${err instanceof Error ? err.message : String(err)}`});
    }
  }, [
    addHistory,
    cleanupAudio,
    log,
    setIsRecording,
    setAgentRequestedManual,
  ]);

  const stopRecording = useCallback(async (conversation: any) => {
    log('🎤 === STOPPING RECORDING ===');
    log('📊 PRE-STOP STATE:', {
      isRecording: useUIStore.getState().isRecording,
      isVoiceActive: useUIStore.getState().isVoiceActive,
      conversationStatus: conversation.status,
    });
    
    if (conversation.status === 'connected') {
      await conversation.endSession();
    }
    setIsRecording(false);
    setIsVoiceActive(false);
    cleanupAudio();
    addHistory({ type: 'system', text: 'Recording stopped - Autocomplete re-enabled' });
    
    log('✅ RECORDING STOPPED SUCCESSFULLY');
  }, [
    addHistory,
    setIsRecording,
    setIsVoiceActive,
    cleanupAudio,
    log,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    startRecording,
    stopRecording,
    cleanupAudio,
  };
} 