import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type LocationIntent = "suburb" | "street" | "address" | "general" | null;

// Define the structure of a suggestion as it's stored in the client
export interface Suggestion {
  description: string;
  placeId: string;
  // New fields to support rich suggestion UI
  resultType?: LocationIntent;
  suburb?: string;
  types?: string[];
}

export interface HistoryItem {
  type: 'user' | 'agent' | 'system';
  text: string;
  timestamp?: number; 
}

// Define the state properties - removed suggestions since React Query will handle it
interface AddressFinderState {
  searchQuery: string;
  selectedResult: Suggestion | null;
  isRecording: boolean;
  isVoiceActive: boolean;
  history: HistoryItem[];
  isLoggingEnabled: boolean;
  agentRequestedManual: boolean;
  // New state for enhanced UI
  currentIntent: LocationIntent;
  isSmartValidationEnabled: boolean;
  
  // NEW: Unified API results storage for agent sync
  apiResults: {
    suggestions: Suggestion[];
    isLoading: boolean;
    error: string | null;
    source: 'manual' | 'voice' | null;
    timestamp: number;
  };

  setSearchQuery: (query: string) => void;
  setSelectedResult: (result: Suggestion | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsVoiceActive: (isVoiceActive: boolean) => void;
  addHistory: (item: HistoryItem) => void;
  setIsLoggingEnabled: (enabled: boolean) => void;
  setAgentRequestedManual: (requested: boolean) => void;
  clear: () => void;
  // New actions for enhanced UI
  setCurrentIntent: (intent: LocationIntent) => void;
  setIsSmartValidationEnabled: (enabled: boolean) => void;
  // NEW: API results management
  setApiResults: (results: Partial<AddressFinderState['apiResults']>) => void;
}

const initialState = {
    searchQuery: '',
    selectedResult: null,
    isRecording: false,
    isVoiceActive: false,
    history: [],
    isLoggingEnabled: true,
    agentRequestedManual: false,
    currentIntent: 'general' as LocationIntent,
    isSmartValidationEnabled: true,
    apiResults: {
      suggestions: [],
      isLoading: false,
      error: null,
      source: null,
      timestamp: 0,
    },
};

export const useAddressFinderStore = create<AddressFinderState>()(
  devtools(
    (set) => ({
      ...initialState,
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setSelectedResult: (result: Suggestion | null) => set({ selectedResult: result }),
      setIsRecording: (recording: boolean) => set({ isRecording: recording }),
      setIsVoiceActive: (active: boolean) => set({ isVoiceActive: active }),
      addHistory: (item: HistoryItem) => set((state) => {
        // Ensure unique timestamps by incrementing if duplicate exists
        let timestamp = Date.now();
        while (state.history.some(h => h.timestamp === timestamp)) {
          timestamp += 1;
        }
        return { history: [...state.history, { ...item, timestamp }] };
      }),
      setIsLoggingEnabled: (enabled: boolean) => set({ isLoggingEnabled: enabled }),
      setAgentRequestedManual: (requested: boolean) => set({ agentRequestedManual: requested }),
      clear: () => set(initialState),
      // New action implementations
      setCurrentIntent: (intent: LocationIntent) => set({ currentIntent: intent }),
      setIsSmartValidationEnabled: (enabled: boolean) => set({ isSmartValidationEnabled: enabled }),
      // NEW: API results management
      setApiResults: (results) => set((state) => ({
        apiResults: { ...state.apiResults, ...results, timestamp: Date.now() }
      })),
    }),
    { name: 'AddressFinderStore' }
  )
); 