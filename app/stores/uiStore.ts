import { create } from "zustand";
import { devtools } from "zustand/middleware";
// import type { LocationIntent, Suggestion, HistoryItem } from '~/stores/types';

interface UIState {
	isRecording: boolean;
	isVoiceActive: boolean;
	isLoggingEnabled: boolean;
	agentRequestedManual: boolean;
	selectionAcknowledged: boolean;

	setIsRecording: (isRecording: boolean) => void;
	setIsVoiceActive: (isVoiceActive: boolean) => void;
	setIsLoggingEnabled: (enabled: boolean) => void;
	setAgentRequestedManual: (requested: boolean) => void;
	setSelectionAcknowledged: (ack: boolean) => void;

	// Action to reset UI state
	resetUiState: () => void;
}

const initialUiState = {
	isRecording: false,
	isVoiceActive: false,
	isLoggingEnabled: true,
	agentRequestedManual: false,
	selectionAcknowledged: false,
};

export const useUIStore = create<UIState>()(
	devtools(
		(set) => ({
			...initialUiState,
			setIsRecording: (recording: boolean) => set({ isRecording: recording }),
			setIsVoiceActive: (active: boolean) => set({ isVoiceActive: active }),
			setIsLoggingEnabled: (enabled: boolean) =>
				set({ isLoggingEnabled: enabled }),
			setAgentRequestedManual: (requested: boolean) =>
				set({ agentRequestedManual: requested }),
			setSelectionAcknowledged: (ack: boolean) =>
				set({ selectionAcknowledged: ack }),
			resetUiState: () => set(initialUiState),
		}),
		{ name: "UIStore" },
	),
);
