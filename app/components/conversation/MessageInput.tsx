'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isConnected: boolean;
}

export function MessageInput({ onSendMessage, isConnected }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Handle typing indicator
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    if (message) {
      setIsTyping(true);
      typingTimeout = setTimeout(() => setIsTyping(false), 1000);
    } else {
      setIsTyping(false);
    }
    return () => clearTimeout(typingTimeout);
  }, [message]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [message, onSendMessage]);

  return (
    <div className="flex items-center gap-2 p-4 border-t">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type your message..."
        disabled={!isConnected}
        className="flex-1"
        aria-label="Message input"
      />
      <Button
        onClick={handleSend}
        disabled={!isConnected || !message.trim()}
        size="icon"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
} 