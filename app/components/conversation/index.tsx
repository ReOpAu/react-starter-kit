'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { VoiceIndicator } from './VoiceIndicator';
import { LanguageSelector } from './LanguageSelector';
import type { Message, Language } from './types';
import { CONVERSATION_CONFIG } from './types';

export function Conversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);

  const conversation = useConversation({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => {
      console.log('[onMessage] Message:', message);
      setIsAgentTyping(false);
      setMessages(prev => {
        // Ignore if this message matches the last user message (typed or transcribed)
        if (
          prev.length > 0 &&
          prev[prev.length - 1].sender === 'user' &&
          prev[prev.length - 1].text === message.message
        ) {
          console.log('[onMessage] Ignored echo of user message:', message.message);
          return prev;
        }
        // Add message based on source
        return [...prev, { 
          text: message.message, 
          sender: message.source === 'user' ? 'user' : 'agent',
          isTranscribed: false 
        }];
      });
    },
    onUserMessage: (message: string) => {
      console.log('[onUserMessage] User message:', message);
      if (message.trim() && !messages.some(m => m.text === message && m.sender === 'user')) {
        setMessages(prev => [...prev, { text: message, sender: 'user', isTranscribed: false }]);
      }
    },
    onTranscription: (text: string) => {
      console.log('[onTranscription] User transcription:', text);
      if (text.trim() && !messages.some(m => m.text === text && m.sender === 'user' && m.isTranscribed)) {
        setMessages(prev => [...prev, { text: text, sender: 'user', isTranscribed: true }]);
      }
    },
    onError: (error) => console.error('Error:', error),
    textOnly: true, // Default to chat-only mode
  });

  // Set up audio analysis for voice mode
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
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const isActive = average > CONVERSATION_CONFIG.AUDIO_THRESHOLD;
        const now = Date.now();
        
        if (isActive !== isVoiceActive && 
            (isActive || now - lastUpdateRef.current > CONVERSATION_CONFIG.INACTIVE_THRESHOLD)) {
          console.log('Voice activity changed:', isActive, 'Average level:', average);
          setIsVoiceActive(isActive);
          lastUpdateRef.current = now;
        }
        
        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };
      
      checkAudioLevel();
    } catch (error) {
      console.error('Failed to set up audio analysis:', error);
      throw error;
    }
  }, [isVoiceActive]);

  const startConversation = useCallback(async (useVoice: boolean) => {
    try {
      if (useVoice) {
        await setupAudioAnalysis();
      }

      await conversation.startSession({
        agentId: CONVERSATION_CONFIG.AGENT_ID,
        overrides: {
          agent: {
            language: selectedLanguage,
          },
        },
        textOnly: !useVoice,
      });
      setIsVoiceMode(useVoice);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      // Clean up audio resources if voice setup failed
      if (useVoice) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      }
    }
  }, [conversation, selectedLanguage, setupAudioAnalysis]);

  // Clean up audio resources when conversation ends
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (error) {
          console.error('Error closing AudioContext:', error);
        }
      }
    };
  }, []);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
    setIsVoiceMode(false);
  }, [conversation]);

  const handleSendMessage = useCallback(async (message: string) => {
    try {
      setIsAgentTyping(true);
      await conversation.sendUserMessage(message);
      setMessages(prev => [...prev, { text: message, sender: 'user', isTranscribed: false }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsAgentTyping(false);
    }
  }, [conversation]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">AI Assistant</CardTitle>
        <div className="flex items-center gap-2">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            disabled={conversation.status === 'connected'}
          />
          {conversation.status === 'connected' && isVoiceMode && (
            <VoiceIndicator isVoiceActive={isVoiceActive} />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[500px]">
          <MessageList 
            messages={messages} 
            isAgentTyping={isAgentTyping} 
          />
          <MessageInput
            onSendMessage={handleSendMessage}
            isConnected={conversation.status === 'connected'}
          />
        </div>

        <div className="flex justify-center gap-4 mt-4">
          {conversation.status !== 'connected' ? (
            <>
              <Button onClick={() => startConversation(false)} className="flex-1">
                Start Chat
              </Button>
              <Button onClick={() => startConversation(true)} className="flex-1">
                Start Voice Chat
              </Button>
            </>
          ) : (
            <Button onClick={stopConversation} variant="destructive" className="w-full">
              End Conversation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 