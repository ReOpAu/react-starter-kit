# **AI Developer Specification & Work Plan: Intelligent Address Finder v2.0**

**Directive For AI Developer:** Your task is to implement the following technical specification to refactor the Voice Address Lookup component. This document first provides context on the legacy system being replaced and then outlines the detailed plan for the new implementation. This is a **parallel implementation**; all work must be performed in the new file structure to avoid disrupting existing code.

### **0\. Project Context & Legacy System Review**

#### **0.1. Legacy System Overview (conv-address-improved.tsx)**

The system being replaced is a functional, voice-powered address lookup feature. Its core capabilities included:

* **Dual Input Modes:** Supported both voice commands and manual text entry.  
* **AI Orchestration:** Used an ElevenLabs agent to manage conversation flow.  
* **Client-Side Tools:** Exposed a set of clientTools to the agent for searching addresses and getting UI state.  
* **State-Awareness:** A useUIStateSync hook continuously synchronized React state with the agent's context.

#### **0.2. Rationale for Refactor**

While functional, the legacy system had several architectural limitations that this new version will address directly:

* **Monolithic State Management:** The entire feature's state was managed by a single, large useReducer hook. This made the main component nearly 900 lines long, caused unnecessary re-renders across the entire UI on any state change, and made the code difficult to maintain and reason about.  
* **Loose Agent-Client Contract:** The clientTools were designed to defensively handle a variety of input shapes from the agent. This indicated a loose contract, leading to complex and brittle client-side parsing logic.

This specification details the implementation of a new, modern architecture that solves these problems by introducing a clear separation of concerns, a robust state management strategy, and a strict API contract for the agent.

### **1\. Core Directives & Architectural Principles**

You must adhere to the following architectural principles throughout the implementation:

1. **The UI is the Single Source of Truth:** The conversational agent's awareness of the application's state will be derived *directly* from the UI's state stores. The agent will not maintain its own independent memory.  
2. **Clear Separation of State:** State will be strictly categorized and managed by the specified library:  
   * **Server State:** Asynchronous data from APIs (i.e., address suggestions). Managed by **TanStack Query**.  
   * **Global Client State:** UI state shared across components (i.e., interaction mode, the final selected result, search query). Managed by **Zustand**.  
   * **Local Client State:** State confined to a single component (i.e., form input values). Managed by **React useState**.

### **2\. File Manifest & Structure**

You will create the following new file and folder structure. Do not modify files outside this structure unless specified (e.g., app/root.tsx).

* **Route:** app/routes/address-finder.tsx  
* **Components Directory:** app/components/address-finder/  
  * index.ts  
  * VoiceInputController.tsx  
  * ManualSearchForm.tsx  
  * SuggestionsDisplay.tsx  
  * SelectedResultCard.tsx  
  * HistoryPanel.tsx  
* **State Store:** app/stores/addressFinderStore.ts  
* **Backend Action:** convex/addressFinder.ts

### **3\. Detailed Implementation Specifications**

#### **3.1. Backend API (Convex)**

Create the file convex/addressFinder.ts and populate it with the following exact code. This action will be the sole backend interface for the Google Places API.  
"use node";  
import { action } from "./\_generated/server";  
import { v } from "convex/values";

const PLACES\_API\_KEY \= process.env.PLACES\_API\_KEY;  
if (\!PLACES\_API\_KEY) {  
  throw new Error("PLACES\_API\_KEY environment variable not set in Convex dashboard\!");  
}

interface GooglePlaceSuggestion {  
  description: string;  
  place\_id: string;  
}

const resultType \= v.object({  
  success: v.boolean(),  
  suggestions: v.optional(v.array(v.object({  
    description: v.string(),  
    placeId: v.string(),  
  }))),  
  error: v.optional(v.string()),  
});

export const search \= action({  
  args: { query: v.string() },  
  returns: resultType,  
  handler: async (\_, { query }) \=\> {  
    if (\!query) {  
      return { success: true, suggestions: \[\] };  
    }

    const url \= \`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(  
      query,  
    )}\&key=${PLACES\_API\_KEY}\&types=address\&components=country:AU\`;

    try {  
      const response \= await fetch(url);  
      if (\!response.ok) {  
        throw new Error(\`Google Places API request failed with status ${response.status}\`);  
      }  
      const data \= await response.json();

      if (data.status \!== "OK" && data.status \!== "ZERO\_RESULTS") {  
        throw new Error(\`Google Places API Error: ${data.status} \- ${data.error\_message || "Unknown error"}\`);  
      }

      const suggestions \= (data.predictions || \[\]).map((p: GooglePlaceSuggestion) \=\> ({  
        description: p.description,  
        placeId: p.place\_id,  
      }));

      return { success: true, suggestions };  
    } catch (error) {  
      console.error("Failed to fetch from Google Places API:", error);  
      const errorMessage \= error instanceof Error ? error.message : "Unknown error";  
      return { success: false, error: \`API call failed: ${errorMessage}\` };  
    }  
  },  
});

#### **3.2. Global State Store (Zustand)**

Create the file app/stores/addressFinderStore.ts. This store will manage all global client state. Populate it with the following exact code.  
import { create } from 'zustand';

export interface Suggestion {  
  description: string;  
  placeId: string;  
}

interface AddressFinderState {  
  searchQuery: string;  
  selectedResult: Suggestion | null;  
  isRecording: boolean;  
  history: Array\<{ type: 'user' | 'agent' | 'system'; text: string; timestamp: number }\>;  
}

interface AddressFinderActions {  
  setSearchQuery: (query: string) \=\> void;  
  setSelectedResult: (result: Suggestion | null) \=\> void;  
  setIsRecording: (isRecording: boolean) \=\> void;  
  addHistory: (entry: { type: 'user' | 'agent' | 'system'; text: string }) \=\> void;  
  clear: () \=\> void;  
}

export const useAddressFinderStore \= create\<AddressFinderState & AddressFinderActions\>((set) \=\> ({  
  // Initial State  
  searchQuery: '',  
  selectedResult: null,  
  isRecording: false,  
  history: \[\],

  // Actions  
  setSearchQuery: (query) \=\> set({ searchQuery: query, selectedResult: null }), // Clear selection on new query  
  setSelectedResult: (result) \=\> set({ selectedResult: result }),  
  setIsRecording: (isRecording) \=\> set({ isRecording }),  
  addHistory: (entry) \=\>  
    set((state) \=\> ({  
      history: \[...state.history, { ...entry, timestamp: Date.now() }\],  
    })),  
  clear: () \=\> set({ searchQuery: '', selectedResult: null, isRecording: false }),  
}));

#### **3.3. Main Route Component (app/routes/address-finder.tsx)**

This component serves as the orchestrator for the entire feature.  
**Responsibilities:**

1. **Initialize TanStack Query:** Use the useQuery hook to call the api.addressFinder.search Convex action. The query should be enabled/disabled based on the searchQuery from the Zustand store.  
2. **Initialize ElevenLabs:** Initialize the useConversation hook.  
3. **Define clientTools:** Define the clientTools object and pass it to useConversation. The implementation of these tools is specified below.  
4. **Render Child Components:** Render the components from app/components/address-finder/, passing the necessary data from the hooks and state stores (e.g., data, isLoading from useQuery, state values and actions from useAddressFinderStore).

clientTools Implementation:  
Implement the following tools within the address-finder.tsx component. You will need access to the queryClient from TanStack Query and the useAddressFinderStore.  
// Example of how to structure the tools object  
const clientTools \= {  
  searchAddress: async ({ query }) \=\> {  
    useAddressFinderStore.getState().setSearchQuery(query);  
    return { status: "searching" };  
  },

  getSuggestions: async () \=\> {  
    const searchQuery \= useAddressFinderStore.getState().searchQuery;  
    const suggestions \= queryClient.getQueryData(\['addressSearch', searchQuery\])?.suggestions || \[\];  
    return { suggestions };  
  },

  selectSuggestion: async ({ placeId }) \=\> {  
    const searchQuery \= useAddressFinderStore.getState().searchQuery;  
    const suggestions \= queryClient.getQueryData(\['addressSearch', searchQuery\])?.suggestions || \[\];  
    const selection \= suggestions.find(s \=\> s.placeId \=== placeId);  
    if (selection) {  
      useAddressFinderStore.getState().setSelectedResult(selection);  
      return { status: "confirmed", selection };  
    }  
    return { status: "not\_found" };  
  },

  getConfirmedSelection: async () \=\> {  
    const selection \= useAddressFinderStore.getState().selectedResult;  
    return { selection };  
  },

  clearSelection: async () \=\> {  
    useAddressFinderStore.getState().clear();  
    queryClient.removeQueries({ queryKey: \['addressSearch'\] });  
    return { status: "cleared" };  
  }  
};

#### **3.4. Child Component Specifications**

Create the following components inside app/components/address-finder/.

| Component | Responsibilities |
| :---- | :---- |
| **VoiceInputController.tsx** | Manages microphone state and interaction with the useConversation hook. Connects to the isRecording state and setIsRecording action in the Zustand store. |
| **ManualSearchForm.tsx** | Renders a controlled form for text input. On submit, it calls the setSearchQuery action from the Zustand store. |
| **SuggestionsDisplay.tsx** | Receives data, isLoading, isError from the useQuery result (passed as props). Renders loading/error states or the list of suggestions. On suggestion click, it calls the setSelectedResult action. |
| **SelectedResultCard.tsx** | Subscribes to the selectedResult value in the Zustand store and displays the final confirmed address. |
| **HistoryPanel.tsx** | Subscribes to the history array in the Zustand store to display a log of user transcriptions and agent actions. |
| **index.ts** | Create a barrel file to export all components from this directory. |

### **4\. Sequential Work Plan**

Execute the following tasks in order.  
**Task 1: Project Setup**

1. Install required dependencies: npm install @tanstack/react-query zustand.  
2. Modify app/root.tsx to wrap the application's Outlet with the QueryClientProvider from TanStack Query.

**Task 2: Backend and State Scaffolding**

1. Create the directory app/stores.  
2. Create the file app/stores/addressFinderStore.ts and populate it with the specified code.  
3. Create the file convex/addressFinder.ts and populate it with the specified code.  
4. Deploy the Convex changes by running npx convex deploy. You must add the PLACES\_API\_KEY to the Convex environment variables in the project dashboard.

**Task 3: Frontend Component Implementation**

1. Create the directory app/components/address-finder.  
2. Create the empty files for all child components as listed in section 3.4.  
3. Create the main route file app/routes/address-finder.tsx.  
4. Implement the full JSX and logic for each child component, ensuring they connect to the Zustand store or accept props as specified.

**Task 4: Integration and Orchestration**

1. In app/routes/address-finder.tsx, implement the useQuery hook to fetch data from the Convex action.  
2. In app/routes/address-finder.tsx, implement the useConversation hook and define the clientTools object with the exact logic provided.  
3. Ensure the main route component correctly passes all necessary data and callbacks to its child components.

**Task 5: Finalization and Verification**

1. Update the system prompt for the ElevenLabs agent, instructing it on how to use the new, simplified toolset.  
2. Perform comprehensive testing on all user interaction paths:  
   * Voice search for an address.  
   * Manual text search for an address.  
   * Selecting a suggestion from a list of multiple results.  
   * Handling of a single, exact result.  
   * Clearing the selection and starting over.  
   * Correct display of loading and error states.

### **5\. Verification Criteria (Definition of Done)**

The task is considered complete when:

* All files in the manifest (section 2\) have been created and populated.  
* The application compiles without errors.  
* The searchAddress Convex action successfully retrieves data from the Google Places API.  
* The UI correctly reflects all states managed by Zustand and TanStack Query (isLoading, isError, selectedResult, etc.).  
* The conversational agent can successfully use all five clientTools to guide a user through searching for and selecting an address.