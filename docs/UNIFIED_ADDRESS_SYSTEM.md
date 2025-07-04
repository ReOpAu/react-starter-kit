# Unified Intelligent Address System - Architecture

**Version**: 1.0  
**Status**: Adopted

## 1. Overview

This document outlines the architecture of the **Unified Intelligent Address System**, the centralized and sophisticated system for all address search, validation, and intent classification within the application.

This system is designed to provide a single, reliable source of truth for address-related logic, ensuring consistency across all user interfaces, whether they are manual input forms (`enhanced-address.tsx`) or conversational AI agents (`address-finder.tsx`).

**The golden rule of this architecture is: All address-related UI components MUST use the `useSuburbAutocomplete` hook.**

---

## 2. Core Components

The system is composed of three primary parts that work in concert:

### a. `useSuburbAutocomplete` (The Brain)

This custom hook is the heart and brain of the entire system. It is located at `app/hooks/useSuburbAutocomplete.ts`.

**Responsibilities**:
-   **State Management**: Holds all state related to address searches, including `suggestions`, `isLoading`, `error`, and `detectedIntent`.
-   **Centralized Logic**: Contains all functions for interacting with the Convex backend, including `getPlaceSuggestionsWithIntent` and `validateFullAddress`.
-   **Intent Classification**: Contains the authoritative client-side `classifyIntent` function, which provides the initial, rapid assessment of user input before a backend call is made.
-   **Single Source of Truth**: Acts as the single entry point for any component that needs to perform address lookups or validation.

### b. `EnhancedPlaceSuggestions` (The Blueprint Component)

This component, located at `app/components/EnhancedPlaceSuggestions.tsx`, serves as the reference implementation for how to correctly use the `useSuburbAutocomplete` hook.

**Key Architectural Patterns Demonstrated**:
1.  **Direct Hook Integration**: It directly calls `useSuburbAutocomplete` to get all necessary state and functions.
2.  **Delegation of Actions**: All user actions (typing in a search box, clicking a suggestion) are delegated to the functions provided by the hook (e.g., `getPlaceSuggestionsWithIntent`).
3.  **Reactive UI**: The component is purely reactive. It renders the state (`suggestions`, `isLoading`, etc.) that is managed by the hook. It contains no business logic of its own.

### c. `convex/location.ts` (The Backend Power)

This is the Convex backend file that contains the powerful server-side logic for address lookups.

**Responsibilities**:
-   **Server-Side Validation**: Provides robust, multi-step validation and enrichment of addresses using external APIs (e.g., Google Places).
-   **Fuzzy Matching & Lookups**: Performs enhanced lookups for suburbs and postcodes.
-   **Fallback Intent Classification**: The `getPlaceSuggestions` action contains sophisticated server-side intent classification that serves as the fallback and final authority if the client-side classification is ambiguous.

> **Note:** After moving or adding Convex actions, always run `npx convex dev` to regenerate API types for the frontend.

---

## 3. Data & Logic Flow

The system follows a clear, multi-layered flow to provide a fast and accurate user experience.

### Standard Flow (e.g., `enhanced-address.tsx`)

1.  **Component Integration**: A component (e.g., `EnhancedPlaceSuggestions`) integrates the `useSuburbAutocomplete` hook.
2.  **User Input**: The user types a query ("123 Queen St").
3.  **Client-Side Classification**: The component calls `getPlaceSuggestionsWithIntent` from the hook. Inside this function, the client-side `classifyIntent` utility is immediately called to provide a fast, preliminary intent (`address`).
4.  **Backend Call**: The hook then calls the `getPlaceSuggestions` action on the Convex backend, passing the user's query *and* the client-determined intent.
5.  **Server-Side Processing**: The backend uses the client's intent as a hint to perform a more targeted and efficient search. It performs its own validation and can override the intent if necessary.
6.  **State Update**: The results from the backend are returned to the `useSuburbAutocomplete` hook, which updates its internal state.
7.  **Reactive Render**: React's lifecycle triggers a re-render of the component, which displays the new suggestions, loading status, or errors to the user.

### Conversational Agent Flow (The Correct Pattern for `address-finder.tsx`)

To align the conversational agent with this unified system, it **must** be refactored to follow the exact same pattern.

1.  **Refactor `address-finder.tsx`**: The component must remove its legacy `useQuery` and local state management for suggestions.
2.  **Integrate the Hook**: It must import and use the `useSuburbAutocomplete` hook.
3.  **Refactor `useAddressFinderClientTools.ts`**: The `searchAddress` tool's responsibility must be simplified. Instead of containing its own logic, it should call the `getPlaceSuggestionsWithIntent` function from the `useSuburbAutocomplete` hook that has been passed down to it.

By following this pattern, we ensure that a search initiated by the AI agent follows the exact same robust, centralized logic as a search initiated by manual user input, eliminating bugs and architectural divergence.

---

## Map Display for Validated Selections (Update)
- After address validation, confirmed selections are enriched with `lat` and `lng` (coordinates) if available from the backend.
- The map display in the Confirmed Selection UI is only shown when these coordinates are present.
- This ensures that only validated, trustworthy locations are visualized on the map, never partial or ambiguous suggestions.
- The enrichment step occurs in the validation handler, which merges the coordinates into the confirmed selection.
- The `Suggestion` type now includes optional `lat` and `lng` fields for this purpose.

### 2024-06: Backend Strict Intent Filtering
- The backend now enforces strict filtering of place suggestions by intent:
  - For 'suburb', 'street', or 'address', only results of that type are returned.
  - For 'general', broader results are allowed.
- This ensures the UI and agent only present results matching the user's classified intent, reducing ambiguity in conversational flows.

## Unified Memory and Recall (2024 Update)

- **Session-local memory**: Use Zustand to store the last 7 successful searches for fast UI recall. This enables the user or agent to revisit previous search options in the current session.
- **Long-term/agent memory**: Use Convex for persistent memory, analytics, or agent recall across sessions/devices. Only sync from Zustand to Convex when needed.
- **Unified hydration**: All selection/recall flows (manual, agent, previous search) must use a single, centralized handler to hydrate state and sync to the agent.
- **Explicit nulling**: When clearing, set all selection-related state to `null` (not just remove from UI).
- **No premature clearing**: Only clear suggestions when a new search is started or the user explicitly requests it.
- **UI/agent recall flows**: Both UI and agent can recall previous searches; agent tools must be registered and validated. Selecting a previous search rehydrates all relevant state and syncs to the agent.
