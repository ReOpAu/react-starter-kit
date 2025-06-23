# Technical Specification: Intelligent Address Finder v2

**Version:** 2.0  
**Status:** Approved for Implementation

---

### 1. Overview

#### 1.1. Project Goal

To refactor the existing Voice Address Lookup component into a performant, maintainable, and robust application. The new architecture will establish a clear separation of concerns, provide a highly reliable interaction model for the conversational agent, and set a new standard for future development.

This will be a **parallel implementation**, built in a new set of files and folders to avoid breaking existing functionality during development.

#### 1.2. Core Architectural Principles

*   **The UI is the Single Source of Truth:** The conversational agent's awareness of the application's state will be derived *directly* from the UI's state stores (Zustand and TanStack Query). The agent will not maintain its own independent memory of search results or selections.
*   **Clear Separation of State:** State will be strictly categorized and managed by the appropriate tool:
    *   **Server State:** Asynchronous data from APIs (e.g., address suggestions). Managed by **TanStack Query**.
    *   **Global Client State:** UI state shared across components (e.g., interaction mode, the final selected result, search query). Managed by **Zustand**.
    *   **Local Client State:** State confined to a single component (e.g., form input values). Managed by **React `useState`**.

---

### 2. System Architecture & Data Flow

#### 2.1. File & Folder Structure

We will create a new, self-contained structure for this feature:

*   **Route:** `app/routes/address-finder.tsx` (Main container component)
*   **Components:** `app/components/address-finder/` (All new UI components)
*   **State Store:** `app/stores/addressFinderStore.ts` (Zustand store)
*   **Backend:** `convex/addressFinder.ts` (New Convex action for Google Places)

#### 2.2. Data Flow Example (Manual Search)

1.  **User Input:** User types "123 Main St" into the `ManualSearchForm` component.
2.  **State Update:** On submit, a function from the parent `address-finder.tsx` is called, which updates the Zustand store: `setSearchQuery("123 Main St")`.
3.  **Query Trigger:** The `useQuery` hook in `address-finder.tsx` has `searchQuery` as a dependency. The state change triggers the query.
4.  **Backend Call:** `useQuery` calls the `convex/addressFinder.ts:search` action.
5.  **API Fetch:** The Convex action securely calls the Google Places API.
6.  **UI Render:** TanStack Query manages the `isLoading`, `isSuccess`, `isError` states. The `SuggestionsDisplay` component receives the query result and renders the list of suggestions.

---

### 3. Backend API (Convex)

We will create a single, secure Convex `action` to handle communication with the Google Places API.

*   **File:** `convex/addressFinder.ts`

```typescript:convex/addressFinder.ts
"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

const PLACES_API_KEY = process.env.PLACES_API_KEY;
if (!PLACES_API_KEY) {
  throw new Error("PLACES_API_KEY environment variable not set in Convex dashboard!");
}

// Define the expected structure for a suggestion from the Google Places API
interface GooglePlaceSuggestion {
  description: string;
  place_id: string;
  // Add other relevant fields if needed
}

// Define the output structure of our action
const resultType = v.object({
  success: v.boolean(),
  suggestions: v.optional(v.array(v.object({
    description: v.string(),
    placeId: v.string(),
  }))),
  error: v.optional(v.string()),
});

export const search = action({
  args: { query: v.string() },
  // We explicitly define our return type using the validator
  returns: resultType,
  handler: async (_, { query }) => {
    if (!query) {
      return { success: true, suggestions: [] };
    }

    // Construct the Google Places API URL
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query,
    )}&key=${PLACES_API_KEY}&types=address&components=country:AU`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Places API request failed with status ${response.status}`);
      }
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places API Error: ${data.status} - ${data.error_message || "Unknown error"}`);
      }

      const suggestions = (data.predictions || []).map((p: GooglePlaceSuggestion) => ({
        description: p.description,
        placeId: p.place_id,
      }));

      return { success: true, suggestions };
    } catch (error) {
      console.error("Failed to fetch from Google Places API:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: `API call failed: ${errorMessage}` };
    }
  },
});
```

---

### 4. Global State Store (Zustand)

This store will manage all global client state, serving as the primary source of truth for the UI and the agent's "Read" tools.

*   **File:** `app/stores/addressFinderStore.ts`

```typescript:app/stores/addressFinderStore.ts
import { create } from 'zustand';

// Define the structure of a suggestion as it's stored in the client
export interface Suggestion {
  description: string;
  placeId: string;
}

// Define the state properties
interface AddressFinderState {
  searchQuery: string;
  selectedResult: Suggestion | null;
  isRecording: boolean;
  history: Array<{ type: 'user' | 'agent' | 'system'; text: string; timestamp: number }>;
}

// Define the actions (functions to update the state)
interface AddressFinderActions {
  setSearchQuery: (query: string) => void;
  setSelectedResult: (result: Suggestion | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  addHistory: (entry: { type: 'user' | 'agent' | 'system'; text: string }) => void;
  clear: () => void;
}

// Create the store
export const useAddressFinderStore = create<AddressFinderState & AddressFinderActions>((set) => ({
  // Initial State
  searchQuery: '',
  selectedResult: null,
  isRecording: false,
  history: [],

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query, selectedResult: null }), // Clear selection on new query
  setSelectedResult: (result) => set({ selectedResult: result }),
  setIsRecording: (isRecording) => set({ isRecording }),
  addHistory: (entry) =>
    set((state) => ({
      history: [...state.history, { ...entry, timestamp: Date.now() }],
    })),
  clear: () => set({ searchQuery: '', selectedResult: null, isRecording: false }),
}));
```

---

### 5. Conversational Agent API (`clientTools`)

This new API simplifies agent interaction. The agent calls these functions, which then interact with our state management layers to read from or write to the UI state.

#### 5.1. Tool Implementation Approach

The `clientTools` will be defined within the `address-finder.tsx` component. They will use the Zustand `getState()` method for immediate, synchronous state access and `queryClient` from TanStack Query to manage data fetching.

#### 5.2. Tool Specification

*   **`searchAddress(query: string)`** `[Write]`
    *   **Purpose:** Initiates a new address search.
    *   **Action:** Sets the `searchQuery` in the Zustand store. The `useQuery` hook will react to this change and trigger the backend call.
    *   **Returns:** `{ "status": "searching" }`
    *   **Implementation:**
        ```javascript
        searchAddress: async (query) => {
          useAddressFinderStore.getState().setSearchQuery(query);
          return { status: "searching" };
        }
        ```

*   **`getSuggestions()`** `[Read]`
    *   **Purpose:** Allows the agent to read the current list of address suggestions.
    *   **Action:** Gets the current query data from TanStack Query's cache.
    *   **Returns:** `{ "suggestions": [...] }` or `{ "suggestions": [] }`
    *   **Implementation:**
        ```javascript
        getSuggestions: async () => {
          const suggestions = queryClient.getQueryData(['addressSearch', searchQuery])?.suggestions || [];
          return { suggestions };
        }
        ```

*   **`selectSuggestion(placeId: string)`** `[Write]`
    *   **Purpose:** Confirms a specific suggestion from the list.
    *   **Action:** Finds the full suggestion object from the TanStack Query cache using the `placeId` and sets it as the `selectedResult` in the Zustand store.
    *   **Returns:** `{ "status": "confirmed", "selection": {...} }` or `{ "status": "not_found" }`
    *   **Implementation:**
        ```javascript
        selectSuggestion: async (placeId) => {
          const suggestions = queryClient.getQueryData(['addressSearch', searchQuery])?.suggestions || [];
          const selection = suggestions.find(s => s.placeId === placeId);
          if (selection) {
            useAddressFinderStore.getState().setSelectedResult(selection);
            return { status: "confirmed", selection };
          }
          return { status: "not_found" };
        }
        ```

*   **`getConfirmedSelection()`** `[Read]`
    *   **Purpose:** Allows the agent to check the final, confirmed address.
    *   **Action:** Reads `selectedResult` directly from the Zustand store.
    *   **Returns:** `{ "selection": {...} }` or `{ "selection": null }`
    *   **Implementation:**
        ```javascript
        getConfirmedSelection: async () => {
          const selection = useAddressFinderStore.getState().selectedResult;
          return { selection };
        }
        ```

*   **`clearSelection()`** `[Write]`
    *   **Purpose:** Resets the UI state, clearing search query, suggestions, and selections.
    *   **Action:** Calls the `clear()` action on the Zustand store.
    *   **Returns:** `{ "status": "cleared" }`
    *   **Implementation:**
        ```javascript
        clearSelection: async () => {
          useAddressFinderStore.getState().clear();
          // Also clear the query cache
          queryClient.removeQueries(['addressSearch']);
          return { status: "cleared" };
        }
        ```

---

### 6. Frontend Implementation Plan

#### 6.1. Main Route Component

*   **File:** `app/routes/address-finder.tsx`
*   **Responsibilities:**
    *   Initialize `useQuery` for the `addressFinder.search` action.
    *   Initialize the `useConversation` hook with the new `clientTools`.
    *   Orchestrate the rendering of all child components, passing necessary data and callbacks.

#### 6.2. Child Components

*   **Directory:** `app/components/address-finder/`
*   **Components:**
    *   `index.ts`: Barrel file to export all components.
    *   `VoiceInputController.tsx`: Manages microphone state and interaction with the `useConversation` hook. Connects to `isRecording` in the Zustand store.
    *   `ManualSearchForm.tsx`: A simple controlled form for text input. On submit, it calls a function passed via props to update the Zustand store's `searchQuery`.
    *   `SuggestionsDisplay.tsx`: Receives the `data`, `isLoading`, `isError` from the `useQuery` result and renders the list of suggestions or state indicators. Calls a function on selection.
    *   `SelectedResultCard.tsx`: Connects to the `selectedResult` in the Zustand store and displays the final confirmed address.
    *   `HistoryPanel.tsx`: Connects to the `history` array in the Zustand store to display a log of transcriptions and agent actions.

---

### 7. Step-by-Step Work Plan

**Phase 1: Setup and Backend**
1.  **Install Dependencies:** `npm install @tanstack/react-query zustand`
2.  **Create Directories:** Create `app/components/address-finder` and `app/stores`.
3.  **Configure `QueryClientProvider`:** Wrap the application in `app/root.tsx` as per the previous plan's instructions.
4.  **Implement Convex Action:** Create `convex/addressFinder.ts` and add the `search` action code as specified above. Add the `PLACES_API_KEY` to the Convex dashboard.

**Phase 2: Frontend Scaffolding**
1.  **Create Zustand Store:** Create `app/stores/addressFinderStore.ts` with the code specified above.
2.  **Create New Route:** Create `app/routes/address-finder.tsx`. Add basic JSX and navigation so it's accessible.
3.  **Create Component Files:** Create empty files for all the child components listed in section 6.2 within the `app/components/address-finder/` directory, along with the `index.ts` exporter.

**Phase 3: Implementation and Integration**
1.  **Build Components:** Implement the JSX and logic for each child component, connecting them to the Zustand store or passing props from the main route as needed.
2.  **Integrate TanStack Query:** Implement the `useQuery` hook in `address-finder.tsx`.
3.  **Implement Agent `clientTools`:** Implement the `clientTools` object inside `useConversation` in `address-finder.tsx` as specified in section 5.2.

**Phase 4: Finalization**
1.  **Update Agent Prompt:** Update the system prompt for the ElevenLabs agent to reflect the new, simplified toolset.
2.  **Testing:** Thoroughly test all interaction paths: voice search, manual search, selection, clearing, and error states.