"use client";

import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import { BlurFade } from "../ui/blur-fade";
import type { Message } from "./types";

interface MessageListProps {
	messages: Message[];
	isAgentTyping: boolean;
}

export function MessageList({ messages, isAgentTyping }: MessageListProps) {
	const chatContainerRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom when messages change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (chatContainerRef.current) {
			const container = chatContainerRef.current;
			// Always scroll for new messages
			const shouldAutoScroll = true;

			if (shouldAutoScroll) {
				// Use a slightly longer timeout to ensure content is rendered
				setTimeout(() => {
					container.scrollTo({
						top: container.scrollHeight,
						behavior: "smooth",
					});
				}, 100);

				// Add a second scroll after a longer delay to catch any delayed renders
				setTimeout(() => {
					container.scrollTo({
						top: container.scrollHeight,
						behavior: "smooth",
					});
				}, 500);
			}
		}
	}, [messages]);

	return (
		<div
			ref={chatContainerRef}
			className="flex-1 overflow-y-auto space-y-4 p-6 scroll-smooth bg-gradient-to-b from-gray-50/30 to-transparent dark:from-gray-800/30"
			role="log"
			aria-label="Chat messages"
		>
			{messages.length === 0 && (
				<div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
					<div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center mb-4">
						<span className="text-2xl">💬</span>
					</div>
					<p className="text-lg font-medium mb-2">Start a conversation</p>
					<p className="text-sm">Choose text or voice chat to begin talking with the AI assistant.</p>
				</div>
			)}
			{messages.map((msg, index) => (
				<BlurFade
					key={index}
					direction={msg.sender === "user" ? "right" : "left"}
					delay={Math.min(index * 0.05, 0.3)}
					duration={0.3}
				>
					<div className={cn(
						"flex items-start gap-3 max-w-[85%]",
						msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
					)}>
						<div className={cn(
							"w-8 h-8 rounded-full flex items-center justify-center shrink-0",
							msg.sender === "user" 
								? msg.isTranscribed
									? "bg-gradient-to-br from-emerald-500 to-emerald-600"
									: "bg-gradient-to-br from-primary to-blue-600"
								: "bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-500 dark:to-gray-600"
						)}>
							<span className="text-white text-xs font-medium">
								{msg.sender === "user" 
									? msg.isTranscribed ? "🎤" : "U"
									: "🤖"
								}
							</span>
						</div>
						<div
							className={cn(
								"rounded-2xl px-4 py-3 shadow-sm max-w-full",
								msg.sender === "user"
									? msg.isTranscribed
										? "bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700"
										: "bg-gradient-to-br from-primary to-blue-600 text-white"
									: "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700",
							)}
							aria-label={`${msg.sender} message`}
							data-testid={`message-${index}`}
						>
							<p className="text-sm leading-relaxed break-words">{msg.text}</p>
						</div>
					</div>
				</BlurFade>
			))}
			{isAgentTyping && (
				<BlurFade direction="up" delay={0.1} duration={0.2}>
					<div className="flex items-start gap-3 max-w-[85%] mr-auto">
						<div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 dark:from-gray-500 dark:to-gray-600 flex items-center justify-center shrink-0">
							<span className="text-white text-xs font-medium">🤖</span>
						</div>
						<div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
							<div className="flex items-center gap-1">
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
							</div>
						</div>
					</div>
				</BlurFade>
			)}
		</div>
	);
}
