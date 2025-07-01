import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HistoryItem } from '~/stores/types';

interface HistoryState {
  history: HistoryItem[];
  addHistory: (item: HistoryItem) => void;
  
  // Action to reset history state
  resetHistoryState: () => void;
}

const initialHistoryState = {
  history: [],
};

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set) => ({
      ...initialHistoryState,
      addHistory: (item: HistoryItem) => set((state) => {
        // Ensure unique timestamps by incrementing if duplicate exists
        let timestamp = Date.now();
        while (state.history.some(h => h.timestamp === timestamp)) {
          timestamp += 1;
        }
        return { history: [...state.history, { ...item, timestamp }] };
      }),
      resetHistoryState: () => set(initialHistoryState),
    }),
    { name: 'HistoryStore' }
  )
); 