# State Management Strategy: React Query + Zustand + ElevenLabs Agent Sync

**Unified State Synchronization for Perfect UI-Agent Alignment**

## Executive Summary

The current dual storage problem where manual autocomplete results live in React Query while AI-generated results live in local state creates synchronization issues between the UI and ElevenLabs agent. This document outlines a unified approach that eliminates dual storage and ensures perfect real-time alignment.

## Current Problem

### Dual Storage Architecture
```typescript
// ✅ Regular autocomplete results → React Query
const { data: suggestions = [] } = useQuery({
  queryKey: ['addressSearch', searchQuery],
  queryFn: async () => {
    const result = await getPlaceSuggestionsAction({ query: searchQuery });
    return result.success ? result.suggestions || [] : [];
  }
});

// ❌ AI-generated results → Local useState  
const [aiSuggestions, setAiSuggestions] = useState<Suggestion[]>([]);

// Then you have to choose between them:
const currentSuggestions = isRecording ? aiSuggestions : suggestions;
```

### Problems This Creates
- **State Inconsistency**: Agent sees different data than UI depending on mode
- **No Caching**: AI results don't benefit from React Query caching
- **Missing States**: No loading/error states for AI calls
- **Timing Issues**: Agent might act on stale or incomplete data

## Solution Architecture

### Unified Data Flow
```
API Calls → React Query (Single Source) → Zustand (Agent Sync) → ElevenLabs Variables → Agent
```

### Core Principle
**React Query becomes the ONLY source for all API data** (both manual and AI-generated), while Zustand syncs FROM React Query for agent communication.

## Implementation

### 1. Enhanced Zustand Store
```typescript
interface AddressFinderState {
  // ... existing UI state
  
  // NEW: Unified API results storage
  apiResults: {
    suggestions: Suggestion[];
    isLoading: boolean;
    error: string | null;
    source: 'manual' | 'voice' | null;
    timestamp: number;
  };
  
  // Actions
  setApiResults: (results: Partial<ApiResults>) => void;
}
```

### 2. Centralized Agent Sync Hook
```typescript
export function useAgentSync() {
  const store = useAddressFinderStore();
  const queryClient = useQueryClient();
  
  const syncToAgent = useCallback(() => {
    try {
      const windowWithElevenLabs = window as any;
      if (typeof windowWithElevenLabs.setVariable === 'function') {
        // Get unified data from React Query
        const queryData = queryClient.getQueryData(['addressSearch', store.searchQuery]);
        const suggestions = queryData?.suggestions || [];
        const isLoading = queryClient.getQueryState(['addressSearch', store.searchQuery])?.fetchStatus === 'fetching';
        
        const agentState = {
          ui: {
            isRecording: store.isRecording,
            searchQuery: store.searchQuery,
            selectedResult: store.selectedResult,
          },
          api: {
            suggestions,
            isLoading,
            hasResults: suggestions.length > 0,
            error: queryData?.error || null,
            source: store.isRecording ? 'voice' : 'manual',
          },
          meta: {
            lastUpdate: Date.now(),
            sessionActive: store.isRecording,
          }
        };
        
        windowWithElevenLabs.setVariable("agentState", agentState);
      }
    } catch (error) {
      console.warn('[AgentSync] Failed to sync state:', error);
    }
  }, [store, queryClient]);
  
  return { syncToAgent };
}
```

### 3. Updated Component Integration
```typescript
export default function AddressFinder() {
  const { syncToAgent } = useAgentSync();
  const { setApiResults } = useAddressFinderStore();
  
  // Single source of truth for API data
  const { data: suggestions = [], isLoading, error } = useQuery({
    queryKey: ['addressSearch', searchQuery],
    queryFn: () => getPlaceSuggestionsAction({ query: searchQuery }),
    enabled: !!searchQuery && !isRecording,
  });
  
  // Sync React Query state to Zustand
  useEffect(() => {
    setApiResults({
      suggestions,
      isLoading,
      error: error?.message || null,
      source: isRecording ? 'voice' : 'manual',
      timestamp: Date.now(),
    });
    syncToAgent();
  }, [suggestions, isLoading, error, isRecording, setApiResults, syncToAgent]);
  
  // Enhanced client tools that update React Query
  const clientTools = useMemo(() => ({
    searchAddress: async (params: { query: string }) => {
      try {
        const result = await getPlaceSuggestionsAction({
          query: params.query,
          intent: 'general',
          isAutocomplete: false,
        });
        
        if (result.success && result.suggestions) {
          // Update React Query cache (eliminates dual storage)
          queryClient.setQueryData(['addressSearch', params.query], {
            suggestions: result.suggestions,
            source: 'ai',
            timestamp: Date.now()
          });
          
          setSearchQuery(params.query);
          syncToAgent();
          
          return JSON.stringify({
            status: 'success',
            suggestions: result.suggestions,
            count: result.suggestions.length
          });
        }
        
        return JSON.stringify({ status: 'no_results' });
      } catch (error) {
        return JSON.stringify({
          status: 'error',
          error: error.message
        });
      }
    },
    
    getState: async () => {
      const suggestions = queryClient.getQueryData(['addressSearch', searchQuery])?.suggestions || [];
      return JSON.stringify({
        hasResults: suggestions.length > 0,
        isLoading,
        selectedResult,
        suggestions: suggestions.map(s => ({
          description: s.description,
          placeId: s.placeId
        }))
      });
    }
  }), [queryClient, setSearchQuery, syncToAgent, searchQuery, isLoading, selectedResult]);
  
  // ... rest of component
}
```

## Migration Steps

### Phase 1: Foundation
1. **Create `useAgentSync` hook** - Centralized sync logic
2. **Add `apiResults` to Zustand store** - Unified storage
3. **Remove `aiSuggestions` useState** - Eliminate dual storage

### Phase 2: Client Tools Update
1. **Update `searchAddress` tool** - Route through React Query
2. **Enhance error handling** - Proper API failure management  
3. **Add loading state awareness** - Agent knows when API calls are in progress

### Phase 3: Optimization
1. **Add debounced syncing** - Performance optimization
2. **Implement error recovery** - Resilient agent communication
3. **Add comprehensive testing** - Ensure reliability

## Benefits

### ✅ Solved Issues
- **Single Source of Truth**: All API data flows through React Query
- **Perfect Synchronization**: Agent always sees current UI state
- **Caching Benefits**: AI results benefit from React Query caching
- **Loading States**: Agent knows when API calls are in progress
- **Error Handling**: Proper error state management

### ✅ Maintained Benefits
- **React Query Features**: Caching, deduplication, background refetching
- **Performance**: Optimized data fetching and state management
- **Developer Experience**: Clear patterns and debugging tools

## Performance Considerations

```typescript
// Debounced sync to prevent excessive updates
const debouncedSync = useMemo(
  () => debounce(syncToAgent, 50), // 50ms debounce
  [syncToAgent]
);

// Optimized React Query settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000,    // 5 minutes
      refetchOnWindowFocus: false, // Reduce noise during voice sessions
    },
  },
});
```

## Error Recovery

```typescript
const useAgentSync = () => {
  const syncToAgent = useCallback(async () => {
    try {
      // ... sync logic
    } catch (error) {
      console.warn('[AgentSync] Sync failed:', error);
      // Retry after delay
      setTimeout(() => {
        try { syncToAgent(); } catch (retryError) {
          console.error('[AgentSync] Retry failed:', retryError);
        }
      }, 1000);
    }
  }, []);
  
  return { syncToAgent };
};
```

## Testing Strategy

```typescript
// Integration test example
describe('Unified State Management', () => {
  it('should maintain consistency across React Query, Zustand, and Agent', async () => {
    render(<AddressFinder />);
    
    // Trigger search
    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'Test Address' } 
    });
    
    // Wait for React Query update
    await waitFor(() => {
      expect(screen.getByText('Test Address')).toBeInTheDocument();
    });
    
    // Verify agent state matches UI
    const agentState = (window as any).agentState;
    expect(agentState.api.suggestions[0].description).toBe('Test Address');
  });
});
```

## Conclusion

This unified approach eliminates the dual storage problem and ensures perfect UI-Agent alignment through:

1. **Single Source of Truth**: React Query for all API data
2. **Real-time Synchronization**: Immediate state updates to agent
3. **Enhanced Reliability**: Proper error handling and recovery
4. **Maintained Performance**: All React Query benefits preserved

The implementation provides a robust foundation for sophisticated voice interactions and AI-driven user experiences while maintaining excellent developer experience and system reliability.