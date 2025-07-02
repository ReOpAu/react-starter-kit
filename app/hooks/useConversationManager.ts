import { useConversation } from "@elevenlabs/react";
import { useCallback } from "react";
import { useHistoryStore } from "~/stores/historyStore";
import { useUIStore } from "~/stores/uiStore";

export function useConversationManager(clientTools: Record<string, any>) {
	// More robust state selection to avoid lifecycle issues
	const setIsRecording = useUIStore((state) => state.setIsRecording);
	const setIsVoiceActive = useUIStore((state) => state.setIsVoiceActive);
	const isLoggingEnabled = useUIStore((state) => state.isLoggingEnabled);
	const addHistory = useHistoryStore((state) => state.addHistory);

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback(
		(...args: any[]) => {
			// isLoggingEnabled is now a reactive value from the hook's perspective
			if (isLoggingEnabled) {
				console.log("[ConversationManager]", ...args);
			}
		},
		[isLoggingEnabled],
	);

	// Conversation setup with enhanced clientTools
	const conversation = useConversation({
		apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
		agentId: import.meta.env.VITE_ELEVENLABS_ADDRESS_AGENT_ID,
		onConnect: () => {
			log("🔗 Connected to ElevenLabs");
			// Note: Centralized sync effect will handle sync automatically
		},
		onDisconnect: () => {
			log("🔌 Disconnected from ElevenLabs");
			// Force state update on external disconnect
			// Using .getState() is safe here as it's outside the React render cycle
			useUIStore.getState().setIsRecording(false);
			useUIStore.getState().setIsVoiceActive(false);
		},
		onTranscription: (text: string) => {
			// ENHANCED TRANSCRIPTION LOGGING
			console.log("🎤 RAW TRANSCRIPTION EVENT:", {
				text,
				length: text?.length,
				type: typeof text,
			});
			if (text?.trim()) {
				log("📝 Transcription received:", text);
				addHistory({ type: "user", text: `Transcribed: "${text}"` });
			} else {
				log("📝 Empty or null transcription received");
			}
		},
		onMessage: (message: any) => {
			log("🤖 Agent message received:", message);
			if (message.source === "ai" && message.message) {
				addHistory({ type: "agent", text: message.message });
			}
		},
		onStatusChange: (status: string) => {
			log("🔄 Conversation status changed:", status);
		},
		onError: (error) => {
			log("❌ Conversation error:", error);
			addHistory({ type: "system", text: `Error: ${error}` });
		},
		clientTools,
	});

	return {
		conversation,
	};
}
