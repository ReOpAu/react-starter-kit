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
  placeId?: string;
}

interface SearchMemoryStore {
  memory: SearchMemoryEntry[];
  addOrUpdateSearch: (entry: Omit<SearchMemoryEntry, 'id' | 'timestamp'>) => void;
  clearMemory: () => void;
  getMemory: () => SearchMemoryEntry[];
}

export const useSearchMemoryStore = create<SearchMemoryStore>((set, get) => ({
  memory: [],
  addOrUpdateSearch: (entry) => {
    // Improved de-duplication: Remove any entry where either placeId or query matches the new entry
    let updated = get().memory.filter(e => {
      // If both have placeId and they match, remove
      if (entry.placeId && e.placeId && entry.placeId === e.placeId) return false;
      // If either has no placeId, but queries match, remove
      if (entry.query === e.query) return false;
      // Otherwise, keep
      return true;
    });
    const newEntry: SearchMemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[Memory] Adding entry:', {
        query: newEntry.query,
        placeId: newEntry.placeId,
        firstResult: newEntry.results?.[0]?.description,
        timestamp: newEntry.timestamp,
      });
    }
    updated = [newEntry, ...updated];
    if (updated.length > 7) updated = updated.slice(0, 7);
    set({ memory: updated });
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[Memory] Updated:', updated.map(e => ({ query: e.query, placeId: e.placeId, timestamp: e.timestamp, firstResult: e.results?.[0]?.description })));
    }
  },
  clearMemory: () => set({ memory: [] }),
  getMemory: () => get().memory,
})); 