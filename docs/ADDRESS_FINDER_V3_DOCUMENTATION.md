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
User Input (Manual/Voice) → React Query → Convex Location API → Google Places API → UI Display
                                    ↓
                           Zustand Store ← ElevenLabs Agent Sync
```

## File Structure & Dependencies

### Main Application File
- **`app/routes/address-finder.tsx`** - Main component orchestrating the entire application

### Convex Backend Files Used
- **`convex/location.ts`** - Primary backend function (`getPlaceSuggestions` action)
  - Handles Google Places API integration
  - Intent classification (suburb, street, address, general)
  - Address validation using Google's Address Validation API
  - Smart fallback mechanisms

### Child Components
- **`app/components/address-finder/VoiceInputController.tsx`** - Voice recording controls
- **`app/components/address-finder/ManualSearchForm.tsx`** - Self-contained Google Places autocomplete widget
  - Internal state management for UX (input, dropdown, keyboard navigation, debouncing)
  - Single responsibility: calls `onSelect(suggestion)` to feed selections to the Brain
  - Isolated from global state, agent sync, and recording mode awareness
- **`app/components/address-finder/AddressInput.tsx`** - Styled input component
- **`app/components/address-finder/SuggestionsDisplay.tsx`** - AI-generated suggestions display
- **`app/components/address-finder/SelectedResultCard.tsx`** - Shows confirmed selection
- **`app/components/address-finder/HistoryPanel.tsx`** - Interaction history

### State Management
- **`app/stores/addressFinderStore.ts`** - Zustand store for global state
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

### 4. State Synchronization
- **React Query**: Single source of truth for API data
- **Zustand**: UI state and agent communication
- **Agent Sync**: Real-time sync with ElevenLabs variables

## Application Flow

### Manual Input Flow
1. User types in `ManualSearchForm` (self-contained autocomplete widget)
2. `ManualSearchForm` manages its own Google Places API calls and dropdown UX
3. When user selects a place → `onSelect(suggestion)` callback fires
4. Parent component (`address-finder.tsx`) updates Zustand store and syncs to agent

### Voice Conversation Flow
1. User starts recording via `VoiceInputController`
2. ElevenLabs agent receives audio and processes natural language
3. Agent uses `clientTools` to call backend functions:
   - `searchAddress()` - Search for places
   - `getSuggestions()` - Get current suggestions
   - `selectSuggestion()` - Make a selection
   - `getConfirmedSelection()` - Check current selection
4. Results display in `SuggestionsDisplay` component
5. User can click suggestions or let agent auto-select

### Client Tools (Agent Integration)
The application provides these tools to the ElevenLabs agent:

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
The main backend function `getPlaceSuggestions` provides:

1. **Intent Detection**: Analyzes query to determine search type
2. **Multi-API Strategy**: 
   - Google Places API for general searches
   - Address Validation API for complete addresses
   - Smart fallback between APIs
3. **Result Enhancement**: Adds confidence scores, suburb extraction, result classification
4. **Session Management**: Supports Google's session tokens for billing optimization

### Key Parameters
```typescript
getPlaceSuggestions({
  query: string,           // Search query
  intent?: LocationIntent, // Optional intent override
  maxResults?: number,     // Result limit (default: 5)
  isAutocomplete?: boolean,// Autocomplete vs explicit search
  sessionToken?: string    // Google billing optimization
})
```

## State Management Strategy

### React Query (API Data)
- **Primary cache** for all API responses
- **Query keys**: `['autocomplete', query]` and `['aiSuggestions', query]`
- **Automatic refetching** and caching
- **Error handling** and loading states

### Zustand Store (UI State)
- **UI-specific state**: recording status, voice activity, history
- **Current selection**: selected result and intent
- **Agent synchronization**: syncs FROM React Query TO ElevenLabs

### Memory References (Persistent Cache)
- **Agent suggestions cache**: Survives conversation state changes
- **Session management**: Google Places session tokens

## Error Handling & Edge Cases

### Network Failures
- React Query automatic retries
- Graceful fallback to empty results
- User-friendly error messages

### Voice Recognition Issues  
- Empty transcription handling
- Conversation state validation
- Manual fallback always available

### Duplicate Results
- Source-based deduplication (agentCache > unified > ai > autocomplete)
- Place ID matching across different sources

### Intent Misclassification
- Fallback to 'general' intent
- Multiple API strategy handles edge cases

## Configuration

### Environment Variables
```bash
VITE_ELEVENLABS_API_KEY=          # ElevenLabs API key
VITE_ELEVENLABS_ADDRESS_AGENT_ID= # Agent ID for voice conversations
CONVEX_DEPLOYMENT=                # Convex deployment URL
GOOGLE_PLACES_API_KEY=            # Google Places API key (backend)
```

### Feature Toggles
- **Smart Validation**: Toggle between Google standard and enhanced validation
- **Logging**: Enable/disable console logging
- **Voice Mode**: Can be disabled to use manual-only mode

## Performance Optimizations

### Query Optimization
- **Debounced input**: 300ms delay for autocomplete
- **Minimum characters**: 3-character threshold following Google best practices
- **Session tokens**: Reduces Google API billing
- **Stale time**: 5-minute cache for autocomplete results

### State Management
- **Memoized components**: React.memo on child components
- **Stable callbacks**: useCallback for event handlers
- **Ref-based caching**: Persistent agent cache surviving state changes

### Network Efficiency
- **Conditional queries**: Disabled during voice mode
- **Result deduplication**: Reduces redundant API calls
- **Parallel tool calls**: Multiple agent tools can run simultaneously

## Troubleshooting

### Common Issues
1. **Infinite loops**: Caused by unstable dependencies in useEffect
2. **Missing selections**: Agent cache vs React Query synchronization
3. **Transcription failures**: ElevenLabs connection issues
4. **API rate limits**: Google Places API quotas

### Debug Features
- **Comprehensive logging**: Toggle via UI switch
- **History panel**: Shows all user/agent/system interactions
- **State inspection**: Zustand devtools integration
- **Network monitoring**: React Query devtools

## Future Enhancements

### Planned Features
- **Address validation**: Enhanced validation for unit/apartment addresses
- **Geocoding**: Lat/lng coordinates for selected addresses
- **Favorites**: Save frequently used addresses
- **Batch processing**: Multiple address lookup

### Technical Improvements
- **Offline support**: Service worker for cached results
- **Progressive enhancement**: Graceful degradation without JavaScript
- **Accessibility**: Screen reader and keyboard navigation improvements
- **Internationalization**: Support for non-Australian addresses 

## Component Architecture & Responsibilities

### The "Brain" vs "Widget" Pattern

The application follows a clear separation between the "Brain" (global state orchestration) and "Widgets" (self-contained UI components):

**The Brain: `app/routes/address-finder.tsx`**
- Orchestrates all global state (React Query + Zustand)
- Manages agent synchronization via `useAgentSync`
- Handles mode switching (voice vs manual)
- Coordinates between components
- Contains all `clientTools` for agent interaction

**Widget: `ManualSearchForm.tsx`**
- **Purpose**: Self-contained Google Places autocomplete widget with independent query management
- **Scope**: Complete autocomplete functionality including API calls, session management, and UX
- **Interface**: Single `onSelect(suggestion)` callback to the Brain - no other props needed
- **Internal Features**: 
  - Independent React Query for autocomplete (`['manualAutocomplete', query]`)
  - Google Places session token management for billing optimization
  - Debounced input with 300ms delay and 3-character minimum
  - Keyboard navigation, error handling, and loading states
  - Automatic session cleanup on selection
- **Isolation**: Completely unaware of recording state, agent sync, or global application flow

### When to Use Manual vs Voice

- **User doesn't want to talk** → Use `ManualSearchForm` widget
- **Agent can't understand/spell a place** → Agent calls `requestManualInput()` to enable hybrid mode
- **User prefers typing** → Use `ManualSearchForm` widget  
- **Complex addresses with units/apartments** → Manual input often more precise

### Widget Design Principles

**✅ Widget Should:**
- Be completely self-contained with own API calls and state management
- Have excellent internal UX (loading states, error handling, keyboard navigation)
- Use minimal callback interface with parent (`onSelect` only)
- Handle all aspects of its functionality (queries, sessions, debouncing, caching)
- Be testable in isolation without any global state
- Never know about application modes or agent status

**❌ Widget Should NOT:**
- Accept complex prop interfaces (multiple callbacks, external state, loading props)
- Depend on parent for API calls or suggestion data
- Know about global application state (recording mode, agent status)
- Handle agent synchronization directly
- Manage cross-component communication
- Be coupled to specific parent implementations

### Current Interface (Simplified)

```typescript
interface ManualSearchFormProps {
  onSelect: (suggestion: Suggestion) => void;  // ONLY callback needed
}

// Usage in Brain - minimal and clean:
<ManualSearchForm 
  onSelect={handleManualSelection}  // Brain handles global state update
/>
```

**Previous Interface (Deprecated):**
```typescript
// ❌ OLD COMPLEX INTERFACE - DO NOT USE
interface ManualSearchFormProps {
  onSearch: (query: string) => void;           // ❌ Removed - widget handles own queries
  isLoading: boolean;                          // ❌ Removed - widget manages own loading
  suggestions?: Suggestion[];                  // ❌ Removed - widget gets own suggestions  
  onSelect: (suggestion: Suggestion) => void;  // ✅ Kept - only needed callback
  searchQuery: string;                         // ❌ Removed - widget manages own input
  onClear: () => void;                         // ❌ Removed - widget handles own clearing
}
```

This architecture ensures clear separation of concerns and prevents the infinite loop issues that occur when widgets try to manage global state directly.