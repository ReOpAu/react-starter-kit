'use client';

import { useRef, useEffect } from 'react';
import { cn } from "~/lib/utils";
import type { Message } from './types';

interface MessageListProps {
  messages: Message[];
  isAgentTyping: boolean;
}

export function MessageList({ messages, isAgentTyping }: MessageListProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const shouldAutoScroll = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (shouldAutoScroll) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
        });
      }
    }
  }, [messages, isAgentTyping]);

  return (
    <div 
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto space-y-4 p-4 scroll-smooth"
      role="log"
      aria-label="Chat messages"
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          className={cn(
            "flex w-max max-w-[80%] rounded-lg px-4 py-2",
            msg.sender === 'user'
              ? msg.isTranscribed
                ? "ml-auto bg-[#D1E8FF] text-blue-900 border border-blue-200 user-message"
                : "ml-auto bg-primary text-primary-foreground user-message"
              : "mr-auto bg-[#E6F0FA] text-gray-900 ai-message"
          )}
          role="article"
          aria-label={`${msg.sender} message`}
          data-testid={`message-${index}`}
        >
          <div className="flex items-start gap-2">
            {msg.sender === 'agent' && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                AI
              </div>
            )}
            <div className="flex-1">
              {msg.text}
              {msg.isTranscribed && (
                <span className="ml-2 text-xs text-blue-500" title="Voice message">🎤</span>
              )}
            </div>
            {msg.sender === 'user' && !msg.isTranscribed && (
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                You
              </div>
            )}
            {msg.sender === 'user' && msg.isTranscribed && (
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">
                🎤
              </div>
            )}
          </div>
        </div>
      ))}
      {isAgentTyping && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="animate-bounce">●</div>
          <div className="animate-bounce delay-100">●</div>
          <div className="animate-bounce delay-200">●</div>
        </div>
      )}
    </div>
  );
} 