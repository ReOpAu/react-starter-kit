# Intelligent Address Finder v3 - Technical Documentation

## Overview

The Intelligent Address Finder v3 is a sophisticated address lookup application that combines manual input with AI-powered voice conversation capabilities. It provides real-time place suggestions using Google's Places API and integrates with ElevenLabs for voice interaction.

## Architecture

### Core Technologies
- **Frontend**: React with TypeScript
- **Backend**: Convex (serverless backend)
- **State Management**: React Query + Zustand
- **Voice AI**: ElevenLabs conversation API
- **Styling**: Tailwind CSS + shadcn/ui components

### Data Flow
```
User Input (Voice/Manual)
        ↓
Zustand (Search Query Update)
        ↓
React Query (Fetches data using query from Zustand)
        ↓
Zustand (Receives API results from React Query via setApiResults)
        ↓
ElevenLabs Agent (Receives state from Zustand via useAgentSync)
```

## File Structure & Dependencies

### Main Application File
- **`app/routes/address-finder.tsx`** - Main component orchestrating the application by integrating a suite of specialized hooks. Its primary role is UI rendering and event handling.

### Architectural Hooks
- **`app/hooks/useConversationManager.ts`** - Manages the connection and event handling for the ElevenLabs conversation service.
- **`app/hooks/useAudioManager.ts`** - Encapsulates all audio-related logic, including recording and voice activity detection.
- **`app/hooks/useAddressFinderClientTools.ts`** - Implements all `clientTools` for the ElevenLabs agent, isolating complex agent interaction logic.
- **`app/hooks/useReliableSync.ts`** - Provides enhanced state synchronization with multi-step validation to ensure reliability.
- **`app/hooks/useAgentSync.ts`** - The core hook responsible for synchronizing Zustand state with the ElevenLabs agent's state.

### Utility Files
- **`app/utils/addressFinderUtils.ts`** - Contains pure, testable utility functions like `classifySelectedResult` and `deduplicateSuggestions`.

### Convex Backend Files Used
- **`convex/location.ts`** - Primary backend function (`getPlaceSuggestions` action) for Google Places API integration, intent classification, and address validation.

### Child Components
- **`app/components/address-finder/VoiceInputController.tsx`** - Voice recording controls.
- **`app/components/address-finder/ManualSearchForm.tsx`** - Self-contained Google Places autocomplete widget.
- **`app/components/address-finder/SuggestionsDisplay.tsx`** - Displays AI-generated suggestions.
- **`app/components/address-finder/SelectedResultCard.tsx`** - Shows the confirmed address selection.
- **`app/components/address-finder/HistoryPanel.tsx`** - Displays the history of interactions.

### State Management
- **`app/stores/addressFinderStore.ts`** - Zustand store for global UI state. This file is the source for key shared types like `Suggestion` and `LocationIntent`.
- **`app/hooks/useAgentSync.ts`** - Synchronizes state with ElevenLabs agent

## Key Features

### 1. Dual Input Methods
- **Manual Input**: Traditional text input with Google Places autocomplete
- **Voice Input**: AI conversation using ElevenLabs agent

### 2. Intent Classification
The system automatically classifies user queries into:
- **suburb**: Location names, postcodes (e.g., "Richmond VIC")
- **street**: Street names (e.g., "Collins Street")
- **address**: Complete addresses (e.g., "123 Collins Street, Melbourne")
- **general**: Fallback for unclear queries

#### Architectural Pattern: Client-First Intent with Server Fallback
It is a critical architectural principle that intent classification is handled **client-first**.

1.  **Client-Side Responsibility**: The initial intent is determined on the client within `app/hooks/useAddressFinderClientTools.ts` using the `classifyIntent` utility. This allows the UI to provide immediate, context-aware feedback and enables more efficient backend processing.
2.  **Server as Fallback**: The client's determined intent is passed to the `getPlaceSuggestions` Convex action. The backend trusts the client's classification but contains its own logic to act as a reliable fallback in cases where the client does not provide an intent.

This pattern ensures a responsive user experience while maintaining a robust, logical separation of concerns. All subsequent logic relies on this client-first classification.

### 3. Smart Suggestion Management
- **Autocomplete Mode**: Real-time suggestions during manual typing (disabled during voice)
- **AI Mode**: Agent-generated suggestions during conversation
- **Deduplication**: Removes duplicate suggestions with source priority
- **Session Management**: Google's billing optimization with session tokens

#### AI Suggestions Display Rules
AI suggestions should **ONLY** be displayed when **ALL** of the following conditions are met:

**✅ Show AI Suggestions When:**
1. **Active conversation mode**: `isRecording === true` 
2. **Suggestions available**: `suggestions.length > 0`
3. **No confirmed selection**: `!selectedResult` (user hasn't made a final choice)
4. **Agent-driven**: Suggestions came from agent `searchAddress` tool calls

**❌ Hide AI Suggestions When:**
1. **Manual mode**: `isRecording === false` (ManualSearchForm handles its own autocomplete)
2. **User has selected**: `selectedResult` exists (user made a confirmed selection)  
3. **Pure autocomplete**: User is typing in manual mode (widget handles this internally)

This ensures clean separation between manual autocomplete (widget-managed) and AI suggestions (brain-managed), preventing confusing duplicate displays.

#### Critical State Transition Rule
**A new search MUST clear the previous selection.** Any action that initiates a new search (e.g., the agent calling `searchAddress` or the user typing in `ManualSearchForm`) must programmatically set `selectedResult` to `null`. This is the only way to ensure the UI correctly transitions from a "confirmed" state to a "searching" state, allowing new suggestions to be displayed.

### 4. State Synchronization

- **React Query**: Single source of truth for API data
- **Zustand**: UI state and agent communication
- **Agent Sync**: Real-time sync with ElevenLabs variables

#### Synchronization Mechanism: Live State Updates vs. Dynamic Variables
It is critical to understand the method used for synchronization in this application.

- **Dynamic Variables (Not Used for Live Sync):** The [ElevenLabs Dynamic Variables](https://elevanlabs.io/docs/conversational-ai/customization/personalization/dynamic-variables) feature is designed to inject data **once** at the beginning of a conversation (e.g., a user's name). It is not suitable for the real-time, continuous state updates required by our application.

- **Live State Synchronization (Our Method):** This application uses a live, push-based method. The `useAgentSync` hook calls a function (`syncToAgent`) that continuously pushes a complete snapshot of "The Brain's" state to the agent during the conversation. This ensures the agent's context is always aligned with the UI in real-time. The `getCurrentState` tool is a mechanism to verify the success of this live push.

## Application Flow

### Manual Input Flow
1. User types in `ManualSearchForm` (self-contained autocomplete widget)
2. `ManualSearchForm` manages its own Google Places API calls and dropdown UX
3. When user selects a place → `onSelect(suggestion)` callback fires
4. Parent component (`address-finder.tsx`) updates Zustand store and syncs to agent

### Voice Conversation Flow
1. User starts recording via `VoiceInputController`.
2. ElevenLabs agent receives audio and processes natural language.
3. Agent uses the `searchAddress` client tool to find places based on the user's speech.
4. Results are displayed in the `SuggestionsDisplay` component.
5. From here, a selection can be made in two ways:
    - **Agent-driven selection**: The user can ask the agent to select an option, and the agent will use the `selectSuggestion` tool.
    - **User-driven selection**: The user can manually click on a suggestion at any time.
6. **Critical Interaction Pattern**: If the user manually clicks a suggestion while the conversation is active, the application sends a clarifying text message to the agent (e.g., "I have selected '123 Example Street'..."). This is a crucial step that prevents the agent from redundantly trying to perform a selection that the user has already made, ensuring the agent acts as a true conversational partner that is aware of the user's actions.
7. The `getConfirmedSelection` tool allows the agent to verify the final selection at any point.

### Client Tools (Agent Integration)
The application provides these tools to the ElevenLabs agent, all of which are implemented and managed within the **`app/hooks/useAddressFinderClientTools.ts`** hook. This isolates the agent's interaction capabilities from the main component.

- **`searchAddress(query)`** - Searches for places using the query
- **`getSuggestions()`** - Returns current available suggestions  
- **`selectSuggestion(placeId)`** - Selects a suggestion by place ID
- **`getConfirmedSelection()`** - Gets currently selected result
- **`clearSelection()`** - Clears current selection
- **`confirmUserSelection()`** - Acknowledges user's manual selection
- **`requestManualInput(reason, context)`** - **ENABLES HYBRID MODE**: Switches to collaborative voice + manual input

### Hybrid Voice + Manual Input Mode

**CRITICAL ARCHITECTURAL CONCEPT**: The `requestManualInput` tool enables **collaborative input mode** where the conversation **continues running** while simultaneously enabling the ManualSearchForm widget.

#### Purpose & Flow
When the agent encounters spelling difficulties, complex addresses, or user preference for typing, it calls `requestManualInput()` to:

1. **Keep the conversation ACTIVE** - Agent continues talking and listening
2. **Enable ManualSearchForm widget** - User can now type during conversation  
3. **Switch data source** - From agent API calls to user widget callbacks via Brain
4. **Maintain unified state** - All selections flow through same Brain coordination
5. **Show helpful UI** - Blue indicator explains the hybrid mode to user

#### Example Flow
```
User: "I need to find a really complex address with units"
Agent: "I'll enable manual input so you can type that precisely"
↓ calls requestManualInput("Complex address entry", "user_preference")
↓ Conversation stays ACTIVE (no stopRecording())
↓ ManualSearchForm becomes enabled WITH blue helper message
↓ User types while agent continues talking: "Take your time typing..."
↓ User selects → onSelect() → Brain updates → Agent sees selection via sync
Agent: "Perfect! I can see you selected 123 Complex Street. Let's continue..."
```

#### Technical Implementation
- **NO conversation termination** - `isRecording` stays `true`
- **UI state change** - `agentRequestedManual` flag shows blue helper
- **Widget activation** - ManualSearchForm enabled despite `isRecording=true`
- **Data flow preserved** - User selections → Brain → Agent sync continues

#### UI Behavior During Hybrid Mode
- **Voice controls** remain active (stop/start recording buttons)
- **ManualSearchForm** shows with blue "Agent requested manual input" message
- **Suggestions** can come from both agent searches AND user typing
- **Agent feedback** continues via voice while user types

This creates true **collaborative address finding** where voice AI and manual input work together seamlessly.

## Backend Implementation

### Location Service (`convex/location.ts`)
The main backend function `

### Agent Interaction Troubleshooting

When the agent fails to use a tool correctly, the errors can be cryptic. Here is a guide to diagnosing common issues, based on the specific error message received.

| Error Message                                                                        | Likely Cause                                                                                                                                                                  | How to Fix                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `I am sorry, I cannot use the [tool_name] tool because it does not exist.`             | **Dual Configuration Failure.** The tool is likely defined in the agent prompt but not registered in the ElevenLabs platform's Tool Registry UI.                               | Go to the ElevenLabs dashboard and ensure the tool is registered with the exact same name (`[tool_name]`) used in the client-side code and prompt.                                                                     |
| `I am sorry, an error occurred when calling the tool. Can you please try again?`       | **Data Serialization Error OR Race Condition.** This generic error usually means the platform failed to process the tool's response. The two most common causes are:            | **1. Simplify the Payload:** Ensure the tool returns a simple, flat JSON object serialized into a string. Remove any nested objects or complex data types. <br/> **2. Check for Race Conditions:** Use the "Wait for response" checkbox in the debug panel. If this fixes the issue, a race condition is confirmed. |
| The agent doesn't use the tool at all, or uses the wrong tool for the job.            | **Prompting Issue.** The instructions in the main agent prompt are likely not clear, direct, or specific enough for the LLM to understand when and how to use the desired tool. | Refine the agent's prompt. Make the instructions more explicit. For example, instead of "You can get the state," use "When asked for your state, you MUST use the `getCurrentState` tool."                             |

## Rural Address Exception

In rare cases, valid rural addresses cannot be confirmed at the property ("PREMISE") level by Google, but are real and deliverable. To maintain strict validation for urban/suburban addresses while supporting rural users, the system implements a **Rural Address Exception**:

- If an address with a house number fails validation **only** due to `validationGranularity` being `"ROUTE"` or `"LOCALITY"`, and the address appears rural (e.g., contains keywords like "Highway", "Road", "Lane", or known rural localities), the backend returns a special flag (`isRuralException`).
- The UI then prompts the user: "This address could not be confirmed at the property level, but appears to be a rural address. If you are sure this is correct, you may accept it anyway."
- If the user confirms, the address is accepted and marked as `user_confirmed_rural` in the system for downstream tracking.
- This ensures that only users with local knowledge can override the strict validation, and all such exceptions are auditable.

**User Flow:**
1. User enters a rural address (e.g., `2220 Midland Hwy, Springmount VIC 3364`).
2. Validation fails with `isRuralException`.
3. UI displays a confirmation prompt.
4. User clicks "Accept Anyway" to confirm.
5. Address is accepted, marked as `user_confirmed_rural`, and synced to the agent and backend.

**Rationale:**
- Maintains high data quality for most users.
- Supports real rural addresses that are not in Google's database.
- All exceptions are explicit and user-driven.

## High-Level Architecture

The application is built on a sophisticated state management model designed for real-time, bidirectional communication between the user interface and the ElevenLabs Conversational AI.