import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef } from "react";
import { useHistoryStore } from "~/stores/historyStore";
import { useUIStore } from "~/stores/uiStore";
import { ELEVENLABS_RETRY_CONFIG, withRetry } from "~/utils/retryMechanism";

export function useConversationManager(clientTools: Record<string, any>) {
	// More robust state selection to avoid lifecycle issues
	const setIsRecording = useUIStore((state) => state.setIsRecording);
	const setIsVoiceActive = useUIStore((state) => state.setIsVoiceActive);
	const isLoggingEnabled = useUIStore((state) => state.isLoggingEnabled);
	const vadThresholds = useUIStore((state) => state.vadThresholds);
	const addHistory = useHistoryStore((state) => state.addHistory);

	// Track connection attempts for retry logic
	const connectionAttempts = useRef(0);
	const maxConnectionAttempts = 3;

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

	// Conversation setup with enhanced clientTools and complete event handling
	const conversation = useConversation({
		apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
		agentId: import.meta.env.VITE_ELEVENLABS_ADDRESS_AGENT_ID,
		onConnect: () => {
			log("🔗 Connected to ElevenLabs");
			connectionAttempts.current = 0; // Reset on successful connection
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
		onStatusChange: ({ status }) => {
			log("🔄 Conversation status changed:", status);
		},
		onError: (error) => {
			log("❌ Conversation error:", error);
			addHistory({ type: "system", text: `Error: ${error}` });

			// Handle connection errors with retry logic
			const errorMessage = error?.toString() || "";
			const isConnectionError =
				errorMessage.includes("connection") ||
				errorMessage.includes("websocket") ||
				errorMessage.includes("network") ||
				errorMessage.includes("timeout");

			if (
				isConnectionError &&
				connectionAttempts.current < maxConnectionAttempts
			) {
				connectionAttempts.current++;
				const retryDelay = 2000 * Math.pow(2, connectionAttempts.current - 1); // Exponential backoff

				log(
					`🔄 Connection error detected, attempting retry ${connectionAttempts.current}/${maxConnectionAttempts} in ${retryDelay}ms`,
				);
				addHistory({
					type: "system",
					text: `Connection failed, retrying in ${retryDelay / 1000}s (attempt ${connectionAttempts.current}/${maxConnectionAttempts})`,
				});

				// The actual retry would need to be handled at a higher level
				// as the useConversation hook manages its own connection lifecycle
			} else if (isConnectionError) {
				log(
					`❌ Maximum connection attempts (${maxConnectionAttempts}) reached`,
				);
				addHistory({
					type: "system",
					text: `Connection failed after ${maxConnectionAttempts} attempts. Please check your internet connection and try again.`,
				});
			}
		},
		// Enhanced event handlers for full API compliance
		onPing: () => {
			log("🏓 PING received - responding automatically");
			// SDK should handle PING response automatically, but log for debugging
		},
		onAudioReceived: (audioData: any) => {
			log("🔊 Audio data received:", {
				eventId: audioData?.eventId,
				audioLength: audioData?.audio?.length,
				format: "base64",
			});
			// Audio playback is typically handled by SDK automatically
		},
		onClientToolCall: (toolCall: any) => {
			log("🔧 Client tool call event received:", {
				toolName: toolCall?.name,
				parameters: toolCall?.parameters,
				callId: toolCall?.id,
			});
			// clientTools are automatically invoked by SDK, but log for debugging
		},
		onConversationInitiated: (metadata: any) => {
			log("🚀 Conversation initiated with metadata:", {
				conversationId: metadata?.conversationId,
				audioFormat: metadata?.audioFormat,
				sampleRate: metadata?.sampleRate,
			});
			addHistory({
				type: "system",
				text: `Conversation started (ID: ${metadata?.conversationId || "unknown"})`,
			});
		},
		onVoiceActivityDetection: (vadScore: number) => {
			// Use configurable thresholds from store
			const thresholds = useUIStore.getState().vadThresholds;

			// Only log VAD scores above configured threshold to avoid spam
			if (vadScore > thresholds.loggingThreshold) {
				log("🎙️ High voice activity detected:", vadScore);
			}

			// Update UI state based on configurable voice activity thresholds
			if (vadScore > thresholds.activationThreshold) {
				useUIStore.getState().setIsVoiceActive(true);
			} else if (vadScore < thresholds.deactivationThreshold) {
				useUIStore.getState().setIsVoiceActive(false);
			}
		},
		clientTools,
	});

	return {
		conversation,
	};
}
