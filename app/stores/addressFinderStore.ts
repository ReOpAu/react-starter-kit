import { create } from 'zustand';

// Define the structure of a suggestion as it's stored in the client
export interface Suggestion {
  description: string;
  placeId: string;
}

// Define the state properties - removed suggestions since React Query will handle it
interface AddressFinderState {
  searchQuery: string;
  selectedResult: Suggestion | null;
  isRecording: boolean;
  isVoiceActive: boolean;
  history: Array<{ type: 'user' | 'agent' | 'system'; text: string; timestamp: number }>;
  isLoggingEnabled: boolean;
}

// Define the actions (functions to update the state)
interface AddressFinderActions {
  setSearchQuery: (query: string) => void;
  setSelectedResult: (result: Suggestion | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsVoiceActive: (isVoiceActive: boolean) => void;
  addHistory: (entry: { type: 'user' | 'agent' | 'system'; text: string }) => void;
  setIsLoggingEnabled: (enabled: boolean) => void;
  clear: () => void;
}

// Create the store
export const useAddressFinderStore = create<AddressFinderState & AddressFinderActions>((set) => ({
  // Initial State
  searchQuery: '',
  selectedResult: null,
  isRecording: false,
  isVoiceActive: false,
  history: [],
  isLoggingEnabled: true,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedResult: (result) => set({ selectedResult: result }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsVoiceActive: (isVoiceActive) => set({ isVoiceActive }),
  addHistory: (entry) =>
    set((state) => ({
      history: [...state.history, { ...entry, timestamp: Date.now() }],
    })),
  setIsLoggingEnabled: (enabled) => set({ isLoggingEnabled: enabled }),
  clear: () => set({ searchQuery: '', selectedResult: null, isRecording: false, isVoiceActive: false }),
})); 