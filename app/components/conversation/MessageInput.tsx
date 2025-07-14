"use client";

import { Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

interface MessageInputProps {
	onSendMessage: (message: string) => Promise<void>;
	isConnected: boolean;
}

export function MessageInput({
	onSendMessage,
	isConnected,
}: MessageInputProps) {
	const [message, setMessage] = useState("");
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
			setMessage("");
		} catch (error) {
			console.error("Failed to send message:", error);
		}
	}, [message, onSendMessage]);

	return (
		<div className="flex items-center gap-3 p-4 border-t bg-gray-50/50 dark:bg-gray-900/50">
			<Input
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				onKeyPress={(e) => e.key === "Enter" && handleSend()}
				placeholder="Type your message..."
				disabled={!isConnected}
				className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary/20"
				aria-label="Message input"
			/>
			<Button
				onClick={handleSend}
				disabled={!isConnected || !message.trim()}
				size="icon"
				className={cn(
					"h-10 w-10 shrink-0 shadow-sm transition-all duration-200",
					message.trim() && isConnected
						? "bg-primary hover:bg-primary/90 text-white scale-100"
						: "bg-gray-200 dark:bg-gray-700 text-gray-400 scale-95"
				)}
				aria-label="Send message"
			>
				<Send className="h-4 w-4" />
			</Button>
		</div>
	);
}
