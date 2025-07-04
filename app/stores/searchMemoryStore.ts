import { create } from 'zustand';
import type { Suggestion } from './types';

export interface SearchMemoryEntry {
  id: string; // uuid
  query: string;
  results: Suggestion[];
  timestamp: number;
  context: {
    mode: 'manual' | 'voice';
    intent: string;
    confirmed: boolean;
  };
}

interface SearchMemoryStore {
  memory: SearchMemoryEntry[];
  addSearch: (entry: Omit<SearchMemoryEntry, 'id' | 'timestamp'>) => void;
  clearMemory: () => void;
  getMemory: () => SearchMemoryEntry[];
}

export const useSearchMemoryStore = create<SearchMemoryStore>((set, get) => ({
  memory: [],
  addSearch: (entry) => {
    const newEntry: SearchMemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    let updated = [newEntry, ...get().memory];
    if (updated.length > 7) updated = updated.slice(0, 7);
    set({ memory: updated });
  },
  clearMemory: () => set({ memory: [] }),
  getMemory: () => get().memory,
})); 