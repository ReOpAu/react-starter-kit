# State Management Strategy: Multi-Modal UI-Agent Synchronization

**Version:** 2.1  
**Status:** Production Ready  
**Last Updated:** [Current Date]

> **Critical Architecture**: This strategy prevents regression by ensuring perfect synchronization between conversational AI agents and traditional UI interactions. Failure to follow these patterns will break the sophisticated multi-modal user experience.

---

## 🎯 WHAT WE DO: Unified Multi-Modal State Management

### The Core Challenge: Two-Way Interaction Modes

Our application supports **dual interaction modes** that must stay perfectly synchronized:

```
┌─────────────────┐    ┌─────────────────┐
│   MANUAL MODE   │    │   VOICE MODE    │
│                 │    │                 │
│ User types      │    │ User speaks     │
│ User clicks     │    │ Agent responds  │
│ User submits    │    │ Agent searches  │
│ UI updates      │◄──►│ Agent selects   │
└─────────────────┘    └─────────────────┘
```

**Critical Requirement**: The AI agent must know about ALL user actions (typing, clicking, submitting) and the UI must reflect ALL agent actions (searching, selecting, responding).

### The Solution: State Manipulation as Synchronization Mechanism

**How Synchronization Works:**
```
User Action → State Manipulation → UI Update + Agent Sync
Agent Action → State Manipulation → UI Update + Agent Awareness
```

**What We Built:**
- **React Query** = Single source of truth for ALL API data.
- **Pillar-Based Zustand Stores** = Shared state is segregated into four distinct stores (`uiStore`, `intentStore`, `apiStore`, `historyStore`) that are manipulated by both the UI and agent actions.
- **State Manipulation** = Every action (user or agent) manipulates the appropriate state in its dedicated store.
- **ElevenLabs Variables** = Agent's window into the combined state from our pillar stores.
- **`useAgentSync` Hook** = Orchestrates state-to-agent synchronization from all pillar stores.

**Key Insight**: State manipulation IS the synchronization strategy. Every user action and every agent action manipulates the same architectural state (though now in separate stores), ensuring perfect alignment.

---

## 🏛️ The Four Pillars of Brain State

To manage complexity, the "Brain" (our central state) is organized into four distinct categories, now implemented as separate Zustand stores. Understanding this separation is key to developing features reliably.

| Category | Purpose | Where It Lives | Primary Changers |
| :--- | :--- | :--- | :--- |
| **1. API State** | **The "What"**: Represents knowledge from the outside world (search results, validation status). It is asynchronous and volatile. | **React Query** & `apiStore.ts` | System, Agent |
| **2. User Input & Intent** | **The "Why"**: Captures the user's direct inputs (text, clicks) and our inferred goal for them. | `intentStore.ts` | User, Agent |
| **3. App Mode & UI** | **The "How"**: Defines the application's current interaction mode (e.g., voice vs. manual) and controls UI visibility. | `uiStore.ts` | User, Agent, System |
| **4. Session & History** | **The "Where We've Been"**: Maintains a contextual log of interactions and session-specific data (like billing tokens). | `historyStore.ts`, Refs | User, Agent, System |

---

## ⚙️ How State Changes: Primary Actions & Cascading Reactions

Our architecture's reliability comes from a clear separation between the *cause* of a state change and its *effect*.

### 1. Primary Changes (Direct Actions)
These are the **"cause"** of a state update. They are explicit, imperative state setter calls that happen directly inside an event handler or an agent tool in response to a specific action.

-   **Examples**:
    -   A user types in a field, triggering `setSearchQuery("new text")`.
    -   A user clicks a suggestion, triggering `setSelectedResult(...)`.
    -   The agent uses a tool, triggering `setAgentRequestedManual(true)`.

### 2. Secondary Changes (Cascading Reactions)
These are the **"effect"** of one or more primary changes. They happen automatically and reactively, ensuring the rest of the application ecosystem stays consistent with the new state.

-   **Implementation**: This is handled almost exclusively by our **centralized `useEffect` hook** in `address-finder.tsx`.
-   **The Flow**:
    1.  A **Primary Change** updates a state variable (e.g., `selectedResult`).
    2.  React detects this change.
    3.  The main `useEffect`, which "listens" to `selectedResult`, is triggered.
    4.  The **Secondary Changes** inside the effect now run automatically: the Zustand bridge is updated, and `syncToAgent()` is called, synchronizing the new state to the agent.

**Why is this critical?** This pattern makes our code predictable, testable, and robust. Event handlers are simple and only responsible for their direct action, while the complex logic of synchronization is centralized, de-duplicated, and guaranteed to run when—and only when—it's needed.

---

## 🚨 WHY WE DO THIS: Preventing Critical Failures

### Problem 1: The Dual Storage Anti-Pattern

**What Breaks:**
```typescript
// ❌ DANGEROUS: Dual storage creates inconsistency
const [aiSuggestions, setAiSuggestions] = useState([]);           // Agent results
const { data: suggestions } = useQuery(['places', query]);        // Manual results
const currentSuggestions = isRecording ? aiSuggestions : suggestions; // Choose one
```

**Why It Fails:**
- Agent sees different data than UI in voice mode
- No caching for AI results (lost on unmount)
- Agent acts on stale/incomplete information
- User sees inconsistent behavior between modes

### Problem 2: Lost User Context

**What Breaks:**
- User types "123 Main St" → Agent doesn't know
- User clicks suggestion → Agent unaware of selection  
- User submits form → Agent has no context
- Agent responds based on outdated information

### Problem 3: State Desynchronization

**What Breaks:**
- Agent searches for "Sydney CBD" → Results in agent-only state
- User switches to manual mode → Previous results invisible
- User expects continuity → Experience feels broken

### The Cost of Getting It Wrong

- **User Confusion**: "Why doesn't the agent know what I just did?"
- **Lost Context**: Agent gives irrelevant responses
- **Broken Conversations**: Voice mode feels disconnected from UI
- **Development Debt**: Multiple data flows, complex debugging

---

## 🏗️ HOW WE DO IT: Implementation Architecture

### The Sacred Data Flow: State Manipulation Strategy (NEVER VIOLATE)

```
API Calls → React Query (SINGLE SOURCE) → Zustand Pillar Stores (SHARED STATE) → ElevenLabs Variables → Agent
     ↑                                                        ↓
Client Tools ←───────── STATE MANIPULATION ─────────→ User Actions
```

**The Synchronization Rules:**
- **Rule #1**: ALL API results MUST flow through React Query first.
- **Rule #2**: Agent actions MUST manipulate shared state via client tools that call store actions.
- **Rule #3**: User actions MUST manipulate shared state via store actions and trigger sync.
- **Rule #4**: EVERY state manipulation MUST sync to agent via `useAgentSync`.
- **Rule #5**: NO direct `setState` for API data—only through the `apiStore`.

**Core Principle**: Both UI and Agent manipulate the SAME architectural state, which is now cleanly separated into pillar-aligned stores. This state manipulation IS the synchronization mechanism.

### Core Components

#### 1. React Query: Single Source of Truth
```typescript
// ✅ CORRECT: Single source for all API data
const { data: suggestions = [], isLoading, error } = useQuery({
  queryKey: ['addressSearch', searchQuery],
  queryFn: () => getPlaceSuggestionsAction({ query: searchQuery }),
  enabled: !!searchQuery && !isRecording,
});
```

#### 2. Zustand Pillar Stores: Shared, Segregated State
```typescript
// ✅ CORRECT: State is segregated by purpose into different stores.

// ~/stores/intentStore.ts
export const useIntentStore = create<IntentState>(() => ({
  searchQuery: '',
  selectedResult: null,
  // ... actions like setSearchQuery, setSelectedResult
}));

// ~/stores/apiStore.ts
export const useApiStore = create<ApiState>(() => ({
  apiResults: { suggestions: [], ... },
  // ... action setApiResults
}));

// ~/stores/uiStore.ts
export const useUIStore = create<UIState>(() => ({
  isRecording: false,
  agentRequestedManual: false,
  // ... actions like setIsRecording
}));
```

#### 3. useAgentSync: Orchestration Hub
```typescript
// ✅ CORRECT: Centralized synchronization from all pillar stores
export function useAgentSync() {
  const { isRecording, isVoiceActive, agentRequestedManual } = useUIStore();
  const { searchQuery, selectedResult, currentIntent } = useIntentStore();
  const { apiResults } = useApiStore();
  
  const syncToAgent = useCallback(() => {
    const windowWithElevenLabs = window as any;
    if (typeof windowWithElevenLabs.setVariable === 'function') {
      const agentState = {
        ui: { isRecording, isVoiceActive, agentRequestedManual, searchQuery, selectedResult, currentIntent },
        api: { ...apiResults, hasResults: apiResults.suggestions.length > 0 },
        meta: {
          lastUpdate: Date.now(),
          dataFlow: 'API → React Query → Pillar Stores → ElevenLabs → Agent (Corrected)'
        }
      };
      
      windowWithElevenLabs.setVariable("agentState", agentState);
    }
  }, [isRecording, isVoiceActive, agentRequestedManual, searchQuery, selectedResult, currentIntent, apiResults]);
  
  return { syncToAgent };
}
```

#### 4. Client Tools: Agent → React Query Bridge
```typescript
// ✅ CORRECT: Agent actions update React Query first
const clientTools = useMemo(() => ({
  searchAddress: async (params: { query: string }) => {
    const result = await getPlaceSuggestionsAction(params);
    queryClient.setQueryData(['addressSearch', params.query], result); // ← Manipulate React Query
    useIntentStore.getState().setSearchQuery(params.query);  // ← Manipulate Zustand state
    syncToAgent();                 // ← UI now shows agent's search
    return JSON.stringify(result);
  }
}), [queryClient, syncToAgent]);
```

---

## 🎯 IMPLEMENTATION REQUIREMENTS

### Critical Pattern: Component Integration

```typescript
// app/routes/address-finder.tsx
export default function AddressFinder() {
  const { syncToAgent } = useAgentSync();
  const { setApiResults } = useApiStore();
  const { isRecording, isVoiceActive } = useUIStore();
  const { searchQuery, selectedResult, currentIntent, setSelectedResult, setCurrentIntent, setSearchQuery } = useIntentStore();
  
  // STEP 1: Single source API data. Use useMemo for stable reference.
  const { data, isLoading, error } = useQuery({
    queryKey: ['addressSearch', searchQuery],
    queryFn: () => getPlaceSuggestionsAction({ query: searchQuery }),
    enabled: !!searchQuery && !isRecording,
  });
  const suggestions = useMemo(() => data || [], [data]);
  
  // STEP 2: The Consolidated Sync Effect. This is the single source of truth for syncing state.
  useEffect(() => {
    // Bridge the latest data from React Query into our apiStore
    setApiResults({
      suggestions,
      isLoading,
      error: error ? (error as Error).message : null,
      source: isRecording ? 'voice' : 'manual',
    });
    // Immediately sync the entire, updated state to the agent
    syncToAgent();
  }, [
    suggestions,
    isLoading,
    error,
    isRecording,
    isVoiceActive,
    selectedResult,
    currentIntent,
    searchQuery,
  ]);
  
  // STEP 3: User actions simply manipulate state via store actions.
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    // Manipulate state via dedicated actions...
    setSelectedResult(suggestion);
    setCurrentIntent(classifySelectedResult(suggestion));
    setSearchQuery(suggestion.description);
    // ... and that's it! The state change will trigger the useEffect,
    // which handles the synchronization automatically.
  }, [setSelectedResult, setCurrentIntent, setSearchQuery]);
  
  // STEP 4: Client tools for the agent also just manipulate state via store actions.
  const clientTools = useMemo(() => ({
    searchAddress: async (params) => {
      const result = await getPlaceSuggestionsAction(params);
      queryClient.setQueryData(['addressSearch', params.query], result); // ← Manipulate React Query
      useIntentStore.getState().setSearchQuery(params.query);  // ← Manipulate Zustand state
      syncToAgent();                 // ← UI now shows agent's search
      return JSON.stringify(result);
    }
  }), [queryClient, syncToAgent]);
  
  return (
    <div>
      <input 
        value={searchQuery}
        onChange={(e) => handleUserInput(e.target.value)}
      />
      {suggestions.map(suggestion => (
        <div 
          key={suggestion.placeId}
          onClick={() => handleSuggestionClick(suggestion)}
        >
          {suggestion.description}
        </div>
      ))}
    </div>
  );
}
```

### User Interaction Synchronization

```typescript
// REQUIRED: Track ALL user actions via state manipulation
const trackUserAction = useCallback((action: UserAction) => {
  // Manipulate state to record user behavior (agent gets synchronized automatically)
  const windowWithElevenLabs = window as any;
  windowWithElevenLabs.setVariable?.("lastUserAction", action);
  syncToAgent(); // ← Sync manipulated action state to agent
}, [syncToAgent]);

// Examples of state manipulation for user actions:
const handleInputFocus = () => {
  trackUserAction({ type: 'focus', element: 'search_input' });     // ← Manipulate action state
};
const handleFormSubmit = () => {
  trackUserAction({ type: 'submit', data: searchQuery });         // ← Manipulate submission state  
};
const handleModeToggle = () => {
  setIsRecording(!isRecording);                                    // ← Manipulate mode state
  trackUserAction({ type: 'mode_change', newMode: !isRecording }); // ← Manipulate action state
};
```

---

## 🚨 REGRESSION PREVENTION CHECKLIST

### Code Review Requirements

**Before ANY code changes involving state, verify:**

- [ ] **No useState for API data** - All API results via React Query
- [ ] **No conditional suggestion logic** - No `isRecording ? aiSuggestions : suggestions`
- [ ] **syncToAgent() after state changes** - Every setter followed by sync
- [ ] **Client tools update React Query** - No direct setState from agent
- [ ] **User actions tracked** - All clicks, inputs, submissions sync to agent

### Anti-Patterns to Reject

```typescript
// ❌ NEVER ALLOW: Dual storage
const [aiSuggestions, setAiSuggestions] = useState([]);
const { data: suggestions } = useQuery(['places', query]);

// ❌ NEVER ALLOW: Agent bypassing React Query  
const searchAddress = async (params) => {
  const result = await api.search(params.query);
  setAiSuggestions(result.suggestions); // WRONG!
};

// ❌ NEVER ALLOW: Missing sync
const handleClick = (suggestion) => {
  setSelectedResult(suggestion);
  // Missing: syncToAgent();
};

// ❌ NEVER ALLOW: Conditional data sources
const currentSuggestions = isRecording ? aiSuggestions : suggestions;
```

### Validation Tests

```typescript
// REQUIRED: Add these tests to prevent regression
describe('State Management Validation', () => {
  it('should have no dual storage patterns', () => {
    const codebase = fs.readFileSync('./app/routes/address-finder.tsx', 'utf8');
    expect(codebase).not.toContain('aiSuggestions');
    expect(codebase).not.toContain('currentSuggestions');
  });
  
  it('should sync agent state after user actions', async () => {
    render(<AddressFinder />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    
    await waitFor(() => {
      const agentState = (window as any).agentState;
      expect(agentState.ui.searchQuery).toBe('test');
    });
  });
});
```

---

## 📚 DEVELOPER QUICK REFERENCE

### Table of Contents

- [Architecture Overview](#-how-we-do-it-implementation-architecture)
- [Implementation Requirements](#-implementation-requirements) 
- [Regression Prevention](#-regression-prevention-checklist)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)
- [Complete Examples](#examples)

### Key Concepts Summary

| Component | Purpose | Critical Rules |
|-----------|---------|----------------|
| **React Query** | Single source for ALL API data | No useState for API results |
| **Zustand Stores** | UI state + agent bridge, separated by pillar | Mirror React Query data in `apiStore` |
| **`useAgentSync`** | Synchronization orchestrator | Call after EVERY state change |
| **Client Tools** | Agent → UI communication | Update React Query first |

### Essential Hooks Pattern

```typescript
// Standard pattern for all components
const { syncToAgent } = useAgentSync();
const { setApiResults } = useApiStore();

// Always sync after state changes
useEffect(() => {
  setApiResults({ suggestions, isLoading, error });
  syncToAgent();
}, [suggestions, isLoading, error, setApiResults, syncToAgent]);
```

#### 2. Stable Callback Pattern (`useCallback`)
For helper functions or event handlers passed as props, wrap them in `useCallback` with an empty dependency array `[]` if they don't depend on props or state. This prevents child components from re-rendering unnecessarily.

```typescript
// ✅ ALWAYS DO THIS - Create a completely stable callback
const log = useCallback((...args: any[]) => {
  // Use getState() to access store values without creating a dependency
  if (useUIStore.getState().isLoggingEnabled) {
    console.log('[AddressFinder]', ...args);
  }
}, []); // ✅ Empty dependency array makes this function reference stable
```

### 🔍 DEBUGGING INFINITE LOOPS: A CHECKLIST

If you encounter a "Maximum update depth exceeded" error, follow these steps:
1.  **Check `useEffect` Dependencies**: Immediately look for any state setters (`setSomething`, `syncToAgent`, etc.) in any `useEffect` dependency array. Remove them.
2.  **Check `useQuery` Destructuring**: Find all `useQuery` calls. If you see `const { data: name = [] }`, change it to the `useMemo` pattern.
3.  **Look for Multiple Syncs**: Search for all calls to `syncToAgent()`. If it's being called from more than one `useEffect`, consolidate them into the single required pattern shown above.
4.  **Examine Callback Dependencies**: If you are using `useCallback`, ensure its dependency array is correct. Unstable callbacks passed to effects can also cause loops.

---

## CURRENT ARCHITECTURE: Production Implementation

### Component Responsibilities (Current State)

#### Brain Component: `app/routes/address-finder.tsx`
- **Single React Query** for unified API data management
- **Zustand store** for UI state and agent synchronization
- **Agent client tools** that manipulate React Query cache
- **Minimal widget interfaces** with simple callbacks only

#### Self-Contained Widgets: `ManualSearchForm.tsx`
- **Independent React Query** for autocomplete (`['manualAutocomplete', query]`)
- **Own session management** for Google Places billing optimization  
- **Internal state management** for all UX concerns
- **Single callback interface** (`onSelect` only)
- **No global state dependencies** or awareness

### Current Implementation Examples

#### ✅ Self-Contained Widget Pattern
```typescript
// ManualSearchForm.tsx - Complete self-sufficiency
export const ManualSearchForm = ({ onSelect }: { onSelect: (suggestion: Suggestion) => void }) => {
  const [internalQuery, setInternalQuery] = useState('');
  const sessionTokenRef = useRef<string | null>(null);
  
  // Widget's own independent query
  const { data: autocompleteSuggestions = [], isLoading } = useQuery({
    queryKey: ['manualAutocomplete', internalQuery],
    queryFn: async () => {
      const result = await getPlaceSuggestionsAction({ 
        query: internalQuery,
        isAutocomplete: true,
        sessionToken: getSessionToken(),
      });
      return result.success ? result.suggestions || [] : [];
    },
    enabled: !!internalQuery && internalQuery.trim().length >= 3,
  });
  
  // All internal state management
  const handleSelect = useCallback((suggestion: Suggestion) => {
    onSelect(suggestion); // ONLY communication with Brain
    // Handle all internal cleanup
    setInternalQuery('');
    clearSessionToken();
  }, [onSelect]);
  
  // Widget handles everything internally
  return (
    <div>
      <input onChange={(e) => setInternalQuery(e.target.value)} />
      {autocompleteSuggestions.map(suggestion => (
        <div key={suggestion.placeId} onClick={() => handleSelect(suggestion)}>
          {suggestion.description}
        </div>
      ))}
    </div>
  );
};
```

#### ✅ Brain Component Pattern
```typescript
// app/routes/address-finder.tsx - Orchestration only
export default function AddressFinder() {
  const { syncToAgent } = useAgentSync();
  
  // Unified query for agent-driven searches
  const { data: suggestions = [] } = useQuery({
    queryKey: ['addressSearch', searchQuery],
    queryFn: () => getPlaceSuggestionsAction({ query: searchQuery }),
    enabled: !!searchQuery && searchQuery.trim().length >= 3,
  });
  
  // Simple widget usage - minimal interface
  const handleManualSelection = useCallback((suggestion: Suggestion) => {
    setSelectedResult(suggestion);
    setSearchQuery(suggestion.description);
    syncToAgent(); // Brain handles all global state
  }, [setSelectedResult, setSearchQuery, syncToAgent]);
  
  // Agent tools manipulate shared state
  const clientTools = useMemo(() => ({
    searchAddress: async (params: { query: string }) => {
      const result = await getPlaceSuggestionsAction({ query: params.query });
      
      if (result.success) {
        // Manipulate React Query cache (shared state)
        queryClient.setQueryData(['addressSearch', params.query], result.suggestions);
        setSearchQuery(params.query);
        syncToAgent();
      }
      
      return JSON.stringify({ status: 'success' });
    }
  }), [queryClient, setSearchQuery, syncToAgent]);
  
  return (
    <div>
      {/* Minimal widget interface */}
      <ManualSearchForm onSelect={handleManualSelection} />
      
      {/* Agent suggestions display */}
      <SuggestionsDisplay suggestions={suggestions} onSelect={handleManualSelection} />
    </div>
  );
}
```

#### ✅ Hybrid Mode Implementation  
```typescript
// Client tool for enabling collaborative input
const clientTools = useMemo(() => ({
  requestManualInput: async (params: { reason: string, context?: string }) => {
    // CRITICAL: Keep conversation active - NO stopRecording()
    setAgentRequestedManual(true); // Enable widget during conversation
    
    addHistory({ 
      type: 'agent', 
      text: `🤖 → 📝 Enabling manual input: ${params.reason}` 
    });
    
    return JSON.stringify({
      status: "hybrid_mode_activated",
      message: "Manual input enabled - conversation continues"
    });
  }
}), [setAgentRequestedManual, addHistory]);

// UI rendering logic
const shouldShowManualForm = !isRecording || agentRequestedManual;

return (
  <div>
    {shouldShowManualForm ? (
      <div>
        {agentRequestedManual && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p>🤖 → 📝 Hybrid Mode: You can type while continuing the conversation</p>
          </div>
        )}
        <ManualSearchForm onSelect={handleManualSelection} />
      </div>
    ) : (
      <div>Voice conversation active</div>
    )}
  </div>
);
```

### Architecture Benefits Achieved

#### ✅ Self-Contained Widgets
- **Zero prop drilling** - widgets need only `onSelect`
- **Independent API management** - no parent dependency
- **Complete isolation** - testable without global state
- **Reusable anywhere** - no coupling to specific parents

#### ✅ Simplified Brain Logic
- **Minimal interfaces** - easy to understand and maintain
- **Clear responsibilities** - orchestration vs widget functionality
- **Reliable synchronization** - single source of truth patterns

#### ✅ Robust Hybrid Mode
- **Conversation continuity** - agent keeps talking during manual input
- **Clear UI indicators** - users understand collaborative mode
- **Seamless data flow** - all selections sync properly

### Performance Optimizations Implemented

- **Independent query keys** prevent cross-contamination
- **Session token management** optimizes Google Places billing
- **Debounced input** (300ms) reduces API calls
- **Stable callback patterns** prevent infinite loops
- **Persistent refs** survive conversation resets

---

## ⚠️ CRITICAL: Infinite Loop Prevention

Infinite re-render loops are the most common and dangerous side effect of this sophisticated state management pattern. They occur when a `useEffect` hook that synchronizes state accidentally triggers itself. Adhering to these rules is mandatory to prevent application crashes.

### 🚫 FORBIDDEN DEPENDENCY PATTERNS (Will Cause Infinite Loops)

#### 1. Never Include State Setters in `useEffect` Dependencies
State setters from `useState` or Zustand are guaranteed to be stable and never need to be in a dependency array. Including them is redundant and can mask other issues.

```typescript
// ❌ NEVER DO THIS - `setApiResults` is a stable function
useEffect(() => {
  setApiResults({ suggestions, isLoading });
}, [suggestions, isLoading, setApiResults]); // ❌ setApiResults is unnecessary

// ✅ ALWAYS DO THIS - Exclude stable setter functions
useEffect(() => {
  setApiResults({ suggestions, isLoading });
}, [suggestions, isLoading]);
```

#### 2. Never Destructure `useQuery` Data with a Default Array `[]`
When a `useQuery` is disabled, its `data` is `undefined`. Using a default `[]` in the destructuring creates a **new array reference on every single render**, which will always trigger `useEffect` hooks that depend on it.

```typescript
// ❌ NEVER DO THIS - Creates a new `[]` on every render, causing a loop
const { data: suggestions = [] } = useQuery({ enabled: false, ... });

useEffect(() => {
  // This will run on every render when the query is disabled
}, [suggestions]);

// ✅ ALWAYS DO THIS - Create a stable reference with `useMemo`
const { data } = useQuery({ enabled: false, ... });
const suggestions = useMemo(() => data || [], [data]); // ✅ Stable reference

useEffect(() => {
  // This will only run when `data` actually changes
}, [suggestions]);
```

#### 3. Never Have Multiple `useEffect` Hooks Triggering the Same Sync
If two separate `useEffect` hooks both call `syncToAgent()`, they can create cascading updates that lead to an infinite loop.

```typescript
// ❌ NEVER DO THIS - Creates cascading updates
useEffect(() => {
  setApiResults(...);
}, [data]);

useEffect(() => {
  syncToAgent();
}, [apiResults]); // ❌ `apiResults` changes, which re-runs this, causing a loop

// ✅ ALWAYS DO THIS - Consolidate into a single, responsible effect
useEffect(() => {
  // 1. Update the state bridge
  setApiResults({ suggestions, isLoading, error });
  
  // 2. Immediately sync to the agent
  syncToAgent();
  
// 3. Only depend on the source data, not the setters
}, [suggestions, isLoading, error]);
```

#### 4. Conversational Sync (Anti-Pattern)
```typescript
// ❌ CRITICAL ANTI-PATTERN: Never use conversational messages for state sync.
const handleSelectResult = useCallback((result: Suggestion) => {
  setSelectedResult(result);
  
  // ❌ The agent may ignore, misunderstand, or be too slow to process this.
  if (isRecording) {
    const message = "Hey agent, just letting you know I clicked a thing."
    conversation.sendUserMessage?.(message); // UNRELIABLE
  }
  
  // This creates a race condition between unreliable chat and reliable sync.
  syncToAgent();
});
```

### ✅ REQUIRED PATTERNS TO PREVENT INFINITE LOOPS

#### 1. The Consolidated Sync `useEffect`
This is the **only correct way** to bridge React Query to Zustand and sync to the agent. It performs all actions in one place and has a safe dependency array.

```typescript
// ✅ THE GOLD STANDARD - The one required pattern
const { data, isLoading, error } = useQuery(...);
const suggestions = useMemo(() => data || [], [data]);

useEffect(() => {
  // STEP 1: Bridge data from React Query to Zustand
  setApiResults({
    suggestions,
    isLoading,
    error: error ? (error as Error).message : null,
    source: isRecording ? 'voice' : 'manual',
  });
  
  // STEP 2: Sync the now-updated store to the agent
  syncToAgent();
  
// DEPENDENCIES: Include all reactive state that the agent needs to be aware of.
// The setters (setApiResults, syncToAgent) are stable and must be excluded.
}, [
  suggestions,
  isLoading,
  error,
  isRecording,
  isVoiceActive,
  selectedResult,
  currentIntent,
  searchQuery,
]);
```

#### 2. Stable Callback Pattern (`useCallback`)
For helper functions or event handlers passed as props, wrap them in `useCallback` with an empty dependency array `[]` if they don't depend on props or state. This prevents child components from re-rendering unnecessarily.

```typescript
// ✅ ALWAYS DO THIS - Create a completely stable callback
const log = useCallback((...args: any[]) => {
  // Use getState() to access store values without creating a dependency
  if (useUIStore.getState().isLoggingEnabled) {
    console.log('[AddressFinder]', ...args);
  }
}, []); // ✅ Empty dependency array makes this function reference stable
```

### 🔍 DEBUGGING INFINITE LOOPS: A CHECKLIST

If you encounter a "Maximum update depth exceeded" error, follow these steps:
1.  **Check `useEffect` Dependencies**: Immediately look for any state setters (`setSomething`, `syncToAgent`, etc.) in any `useEffect` dependency array. Remove them.
2.  **Check `useQuery` Destructuring**: Find all `useQuery` calls. If you see `const { data: name = [] }`, change it to the `useMemo` pattern.
3.  **Look for Multiple Syncs**: Search for all calls to `syncToAgent()`. If it's being called from more than one `useEffect`, consolidate them into the single required pattern shown above.
4.  **Examine Callback Dependencies**: If you are using `useCallback`, ensure its dependency array is correct. Unstable callbacks passed to effects can also cause loops.

---

## Address Finder: Memory and Recall Pattern (2024 Update)

### Session-Local Memory (Zustand)
- Store the last 7 successful searches (query, results, timestamp, context) in a new `searchMemoryStore` (Zustand).
- This enables fast UI recall ("what were the options again?") and is session-local.
- Never clear `apiResults.suggestions` on selection—only clear when a new search is initiated or the user explicitly clears state.
- When a previous search is recalled, hydrate the UI and agent state using the same unified handler as for new selections.

### Long-Term/Agent Memory (Convex)
- Use Convex only for long-term memory, analytics, or agent recall across sessions/devices.
- If the agent needs to reference previous searches, sync from Zustand to Convex at session end or on explicit "save to memory" actions.

### Unified Hydration and State Sync
- All selection/recall flows (manual, agent, previous search) must use a single, centralized hydration handler.
- When recalling a previous search, update all relevant state (`selectedResult`, `selectedAddress`, `selectedPlaceId`, `currentIntent`, `hasSelection`) and sync to agent.
- When clearing, set all selection-related state to `null` (not just remove from UI).
- Only clear suggestions when a new search is started or the user explicitly requests it.

### UI/Agent Recall Flows
- UI: "Previous Searches" panel/modal, showing up to 7 recent searches. Selecting a previous search rehydrates the UI and agent state.
- Agent: Tool to fetch and present previous searches, with selection by number or name. If only one result/manual, agent states this clearly.

### Legacy Code Management
- Move any old/unused search memory/recall logic to `old/` folders. Update imports to avoid referencing legacy code.

## REQUIRED PATTERNS ✅

### 1. Multi-Modal Query Management
```typescript
// ✅ ALWAYS DO THIS - Mode isolation with different query keys
// ... existing code ...

### Interfacing with External Services (ElevenLabs)

While our internal state management is robust, integrating with external platforms like ElevenLabs introduces unique challenges. The following principles are critical for ensuring reliable communication between "The Brain" and the AI Agent.

#### 1. Dual Configuration: The Platform and The Prompt

An agent tool is not active until it is configured in **two** separate locations:

-   **The Platform's Tool Registry:** The tool must be explicitly registered by name in the ElevenLabs admin dashboard. This tells the platform infrastructure that the tool exists and can be invoked. **If this step is missed, the agent will report that the tool does not exist, even if it's mentioned in the prompt.**
-   **The Agent's Prompt:** The tool must be described in the agent's main prompt. This tells the **LLM** what the tool does, what parameters it takes, and when it should be used.

A failure in either part of this configuration will result in tool-use failures.

#### 2. Data Serialization and Payload Simplicity

External platforms often have strict, sometimes undocumented, requirements for the data they receive from tools.

-   **Principle:** Tool return values MUST be simple, flat JSON objects that can be reliably serialized into a string.
-   **Anti-Pattern:** Avoid returning complex, nested objects, `Map`s, `Set`s, or other data structures that do not have a standard, universal string representation.
-   **Symptom of Failure:** A common symptom of a data serialization error is the agent reporting a generic "an error occurred when calling the tool." This often means the platform received the data but could not process it, causing the request to time out or fail before the data could even be passed to the LLM.

#### 3. Asynchronous Race Conditions

-   **Principle:** Never assume an external platform is ready for a response immediately after it initiates a request.
-   **Scenario:** A tool that executes very quickly (e.g., reading from an in-memory store) can return its result before the platform's internal state machine is ready to receive it. This can lead to the same generic "error when calling the tool" as a data serialization issue.
-   **Verification:** The "Wait for response" option in the ElevenLabs debug panel can be used to test this hypothesis. If enabling it fixes the issue, a race condition is the likely cause. While not a production solution, it is a critical diagnostic tool.

These principles ensure that our robust internal architecture is not undermined by the unavoidable complexities of integrating with a third-party service.

## State and Prop Definitions

### HYBRID VOICE + MANUAL MODE RULES

### CRITICAL: requestManualInput() Tool Behavior
When the agent calls `requestManualInput()`, it should **NEVER stop the conversation**. Instead:

#### ✅ CORRECT Hybrid Mode Implementation

**1. Update Zustand Store:** The shared state must include a flag for this mode in the correct pillar store.
```typescript
// app/stores/uiStore.ts
interface UIState {
  // ... other state
  agentRequestedManual: boolean;
  setAgentRequestedManual: (requested: boolean) => void;
}

const initialUiState = {
  // ... other initial state
  agentRequestedManual: false,
};

// ... in the store implementation
setAgentRequestedManual: (requested: boolean) => set({ agentRequestedManual: requested }),
```

**2. Update Client Tool:** The agent's tool manipulates the shared state directly via store actions.
```typescript
// app/hooks/useAddressFinderClientTools.ts
requestManualInput: async (params) => {
  // Get setters from the correct stores
  const { setAgentRequestedManual } = useUIStore.getState();
  const { addHistory } = useHistoryStore.getState();

  // KEEP conversation active - NO stopRecording() or endSession()
  // ONLY set UI flags to enable widget during conversation
  setAgentRequestedManual(true);
  
  // Add helpful context for user
  addHistory({ type: 'agent', text: `🤖 → 📝 ${params.reason || 'Manual input enabled.'}` });
  
  return JSON.stringify({
    status: "hybrid_mode_activated",
    message: "Manual input enabled - conversation continues"
  });
}
```

#### ❌ FORBIDDEN: Do NOT Stop Conversation
```typescript
// ❌ NEVER DO THIS - breaks hybrid mode concept
// ... existing code ...
### UI Rendering During Hybrid Mode
The Brain component should render ManualSearchForm when EITHER:
- `!isRecording` (traditional manual mode), OR  
- `isRecording && agentRequestedManual` (hybrid mode)

```typescript
// ✅ CORRECT conditional rendering for hybrid support
// app/routes/address-finder.tsx

// Get state from the global UI store
const { isRecording, agentRequestedManual } = useUIStore();

// UI logic remains simple and reactive
const shouldShowManualForm = !isRecording || agentRequestedManual;

return (
  <>
    {shouldShowManualForm ? (
      <ManualSearchForm onSelect={handleSelectResult} />
    ) : (
      <div>Voice conversation is active</div>
    )}
  </>
)
```

### Hybrid Mode State Flow
```
Agent calls requestManualInput()
├─ isRecording stays TRUE (conversation continues)
├─ agentRequestedManual in uiStore becomes TRUE
├─ UI reacts to global state change and shows ManualSearchForm
├─ User types → Widget callbacks → Brain → Agent sync
└─ Agent continues conversation with new data
```

### Widget Isolation Maintained
Even in hybrid mode, `ManualSearchForm`:
- **Maintains its own internal state** for search queries and session tokens
- **Communicates with the Brain** via the `onSelect` callback
- **Does not depend on global state** or awareness of the conversation
- **Does not manipulate the shared state** directly

This ensures that the widget remains self-contained and testable, even in the complex hybrid mode.

## Strict AI Agent and UI State Synchronization (2024 Update)

- All critical state (selections, intent, errors, completions) must be explicitly synced to the agent.
- When clearing selections, all related state (`selectedResult`, `selectedAddress`, `selectedPlaceId`, `currentIntent`, `hasSelection`) must be set to `null`—not just removed from the UI.
- Never clear `apiResults.suggestions` on selection—only clear when a new search is initiated or the user explicitly clears state.
- All selection/recall flows (manual, agent, previous search) must use a single, centralized hydration handler.
- When recalling a previous search, hydrate the UI and agent state using the same unified handler as for new selections.