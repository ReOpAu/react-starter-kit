# Address Finder System -- Comprehensive Code Quality Audit

**Date**: 2026-02-21
**Auditor**: Claude Opus 4.6 (automated)
**Scope**: Full address-finder system across all layers

---

## Executive Summary

The address finder system demonstrates strong architectural vision -- the Brain/Widget separation, intent classification, and service layer patterns are well-conceived. However, **the system has significant gaps between what the AI prompt expects and what the code actually delivers**. Four context variables referenced in every agent prompt are never synced to ElevenLabs. A tool referenced in the prompt (`getNearbyServices`) does not exist in client code. The sync scripts push the address-finder prompt to the CONVERSATION_ASSISTANT agent, which has an entirely different purpose. These are not theoretical issues -- they mean the AI agent is operating with stale or missing context in production.

Beyond the agent integration issues, there are moderate DRY violations (duplicate type definitions across 3 layers), dead code that has accumulated from completed refactors, and a UI component that violates the project's own architectural rules. Error handling is generally solid, with a few blind spots where error details are silently discarded.

**Overall Confidence**: The system is functional but has integrity issues in the AI-agent communication layer that undermine reliability. Addressing the CRITICAL and HIGH findings would bring this to production-quality.

---

## Findings by Severity

### CRITICAL (4 findings)

#### C1. Missing Context Variable Sync to ElevenLabs Agent

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAgentSync.ts` (lines 63-82)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/address-finder/master_prompt_base.txt` (lines 21-29)

**Issue**: The master prompt defines 8 context variables in its `CURRENT CONTEXT` section. The `useAgentSync.ts` hook only syncs 4 of them (`isRecording`, `hasResults`, `selectedResult`, `suggestions`). The following are **never synced**:

| Prompt Variable | Prompt Line | Synced? |
|---|---|---|
| `{{searchResultsCount}}` | Line 24 | NO |
| `{{agentLastSearchQuery}}` | Line 25 | NO |
| `{{currentIntent}}` | Line 27 | NO |
| `{{activeSearchSource}}` | Line 28 | NO |
| `{{selectionAcknowledged}}` | Line 29 | NO |

The prompt instructs the agent to check `{{agentLastSearchQuery}}` before every selection (line 32) and to check `{{selectionAcknowledged}}` before clearing suggestions (line 36). Since these are never set, the agent is always operating with null/undefined values for these critical decision variables.

Note: `selectionAcknowledged` exists in `uiStore.ts` (line 10) and `agentLastSearchQuery` exists in `intentStore.ts` (line 11), but neither is wired through to `window.setVariable()`.

**Impact**: Agent makes selection decisions without validation context. Can select from stale results or fail to properly synchronize with UI state.

**Fix**: Add the missing variables to the sync function in `useAgentSync.ts`:
```typescript
windowWithElevenLabs.setVariable("searchResultsCount", agentState.api.resultCount);
windowWithElevenLabs.setVariable("agentLastSearchQuery", intent.agentLastSearchQuery);
windowWithElevenLabs.setVariable("currentIntent", intent.currentIntent);
windowWithElevenLabs.setVariable("activeSearchSource", intent.activeSearchSource);
windowWithElevenLabs.setVariable("selectionAcknowledged", ui.selectionAcknowledged);
```

---

#### C2. Prompt References Non-Existent `getNearbyServices` Tool

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/address-finder/master_prompt_base.txt` (lines 62, 91)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts` (entire file -- tool not present)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/tools.config.ts` (tool not defined)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/shared/constants/agentConfig.ts` (lines 16-57 -- tool not in any AGENT_TOOL_MATRIX)

**Issue**: The master prompt lists `getNearbyServices(address, serviceType?, radius?)` as an available tool (line 62) and provides detailed usage guidance (line 91). This tool:
1. Is not defined in `ai/tools.config.ts`
2. Is not implemented in `useAddressFinderClientTools.ts`
3. Is not listed in any `AGENT_TOOL_MATRIX` entry

The agent will attempt to call this tool and receive an error, wasting conversation turns and confusing users.

**Impact**: Agent hallucination of tool capability. Users asking about nearby services will experience failures.

**Fix**: Either implement the `getNearbyServices` tool or remove all references from the prompt (lines 62, 91, and the transfer guidance that references it).

---

#### C3. Sync Scripts Push Wrong Prompt to CONVERSATION_ASSISTANT

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/scripts/4-multi-agent-sync.ts` (lines 61-66, 189-202)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/scripts/2-sync-agent.ts` (lines 80-84)

**Issue**: Both sync scripts hardcode the base prompt path to `ai/address-finder/master_prompt_base.txt` (4-multi-agent-sync.ts, lines 61-66). When `syncAllAgents()` iterates over all agents (line 196), the CONVERSATION_ASSISTANT receives the address-finder prompt. The CONVERSATION_ASSISTANT has its own prompt at `ai/conversation_agent/master_prompt.txt`, which is never used by the sync scripts.

The only agent-specific customization is a single string replacement for `ADDRESS_FINDER_TEST` (lines 76-81). No customization exists for CONVERSATION_ASSISTANT.

**Impact**: The CONVERSATION_ASSISTANT agent is configured with the wrong system prompt, making it behave like an address finder instead of a general assistant.

**Fix**: Add per-agent prompt file resolution in the sync scripts:
```typescript
const AGENT_PROMPT_PATHS: Record<AgentKey, string> = {
  ADDRESS_FINDER: "ai/address-finder/master_prompt_base.txt",
  ADDRESS_FINDER_TEST: "ai/address-finder/master_prompt_base.txt",
  CONVERSATION_ASSISTANT: "ai/conversation_agent/master_prompt.txt",
};
```

---

#### C4. `validateToolAssignments()` Always Returns Valid (Broken Validation)

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/providers/ClientToolsProvider.ts` (lines 89-120)

**Issue**: The validation function creates an empty object `{} as ClientTools` on line 97, then calls `Object.keys()` on it (line 98), which always returns an empty array. The loop on line 104 checks if assigned tools exist in this empty array -- they never will. However, because the loop only adds to `agentErrors` when a tool is NOT in `availableTools`, and `availableTools` is empty, every single tool will be flagged as "not implemented". But since this function is never actually called at startup or in tests, the broken logic has no runtime effect.

The deeper problem: **there is no working validation that tool assignments in `agentConfig.ts` match actual implementations in `useAddressFinderClientTools.ts`**. This means tools can be added to the matrix without implementation (or vice versa) and nothing catches it.

**Impact**: Silent configuration drift between declared and implemented tools. The `getNearbyServices` ghost tool (C2) would have been caught by working validation.

**Fix**: Replace with runtime validation that imports actual tool keys, or add a build-time type check.

---

### HIGH (7 findings)

#### H1. AddressFinderUI Has ~20 Props (Violates <=3 Props Rule)

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/AddressFinderUI.tsx` (lines 30-70)

**Issue**: The `AddressFinderUIProps` interface defines 9 handler props, a `state` object with 11 fields, 7 computed boolean props, and 3 validation state props -- approximately 20 top-level props. The project's `CLAUDE.md` explicitly states: "Don't create components with >3 props - split into Brain/Widget pattern."

The UI component is already correctly separated from the Brain (no direct store imports), but the prop surface area is excessive for a Widget component.

**Impact**: Difficult to maintain, test, and reason about. Changes to the Brain ripple through the entire prop interface.

**Recommended approach**: Group related props into sub-objects or split into smaller Widget sub-components (e.g., `AddressFinderInputSection`, `AddressFinderResultSection`, `AddressFinderHistorySection`).

---

#### H2. `suggestions` Array Synced to ElevenLabs Agent (Cosmetic State Leak)

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAgentSync.ts` (lines 36, 80-82)

**Issue**: The full `suggestions` array is synced to the ElevenLabs agent via `window.setVariable("suggestions", agentState.api.suggestions)`. The `CLAUDE.md` architecture rules state: "Never Sync: Cosmetic states, animations, validation formatting, UI convenience."

The suggestions are already visible on screen (the prompt says "The UI already shows the address"). Sending the full array to the agent increases context window usage and may cause the agent to read suggestions aloud (violating voice interaction rules).

**Impact**: Increased token consumption, potential for agent to narrate on-screen content.

**Fix**: Remove the `suggestions` sync. The agent already has `hasResults` and `searchResultsCount` (once C1 is fixed) and can use `getSuggestions()` tool when it actually needs the data.

---

#### H3. Duplicate `LocationIntent` Type Definitions (Frontend vs Backend)

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/types.ts` (line 2): `"suburb" | "street" | "address" | "general" | null`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/types.ts` (line 3): `"suburb" | "street" | "address" | "general"`

**Issue**: The frontend type includes `null` as a valid value; the backend type does not. This means the frontend can set `currentIntent = null`, but if this value is ever sent to a Convex action expecting `LocationIntent`, it will fail validation.

Additionally, `useAddressRecall.ts` uses `as LocationIntent` casts (lines 35, 43, 84, 87) to bridge the gap, which suppresses type errors rather than fixing them.

**Impact**: Runtime type mismatch between frontend and backend. Potential for silent failures when intent is `null`.

**Fix**: Create a single shared `LocationIntent` type. If `null` is a valid state, both sides should accept it. If not, the frontend should use `"general"` as default.

---

#### H4. Duplicate `ENRICHMENT_CACHE_KEY` Constant

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts` (line 12): `const ENRICHMENT_CACHE_KEY = "placeDetails";`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/actions/types.ts` (line 133): `export const ENRICHMENT_CACHE_KEY = "placeDetails";`

**Issue**: Same constant defined in two files. If one changes without the other, cache lookups will miss, causing unnecessary API calls to Google Places.

**Impact**: Cache key divergence risk, potential for redundant API calls.

**Fix**: Import from `actions/types.ts` in `useAddressFinderClientTools.ts`.

---

#### H5. Duplicate `PlaceDetailsResult` Interface

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts` (lines 15-24)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/actions/types.ts` (contains equivalent `PlaceDetailsResult`)

**Issue**: The `PlaceDetailsResult` interface is defined locally in `useAddressFinderClientTools.ts` instead of importing from the shared types file.

**Impact**: Type drift between client tools and action handlers.

**Fix**: Import from `~/hooks/actions/types.ts`.

---

#### H6. Duplicate `SearchHistoryEntry` and `AddressSelectionEntry` Types

**Files**:
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/searchHistoryStore.ts` -- defines `SearchHistoryEntry`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/address-search/types.ts` -- defines `SearchHistoryEntry` (different shape)
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/addressSelectionStore.ts` -- defines `AddressSelectionEntry`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/address-search/types.ts` -- defines `AddressSelectionEntry` (different shape)

**Issue**: Two parallel type hierarchies exist for the same domain concepts. The store types and service types have diverged in shape, meaning data cannot flow between them without transformation.

**Impact**: Impedance mismatch between the service layer (SLIP) and Zustand stores. Makes future integration of the service layer with stores error-prone.

**Fix**: Establish one canonical location for these types (likely the service layer) and have the stores import from there.

---

#### H7. `currentIntent` in `useMemo` Dependencies Causes Unnecessary Tool Re-creation

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts` (line 1012)

**Issue**: The `clientTools` object is created inside a `useMemo` with `currentIntent` as a dependency (line 1012). Every time the intent changes (e.g., from "general" to "suburb"), all 14 client tool functions are re-created. The tools themselves access `currentIntent` via `useIntentStore.getState()` at call time, so the dependency is unnecessary.

**Impact**: Unnecessary re-renders and tool re-initialization on every intent classification change.

**Fix**: Remove `currentIntent` from the useMemo dependency array. The tools already use `getState()` for fresh values.

---

### MEDIUM (8 findings)

#### M1. `errorBody` Assigned but Never Used in `validateAddress.ts`

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/validateAddress.ts` (line 39)

**Issue**: `const errorBody = await response.text()` is called but `errorBody` is never referenced. The error message on line 42 uses `response.statusText` instead. The actual error body from Google's API (which often contains useful diagnostic information) is discarded.

**Fix**: Include `errorBody` in the error response: `error: \`Google API Error: ${response.statusText} - ${errorBody}\``

---

#### M2. `convex/address/index.ts` Uses `export *` Leaking Internal Utilities

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/index.ts` (line 28)

**Issue**: `export * from "./utils"` re-exports all 900+ lines of internal utility functions (confidence scoring, intent classification, API helpers) as part of the public API surface. This includes functions like `getPlacesApiSuggestions`, `calculateConfidenceScore`, `shouldIncludeResult`, etc. that are implementation details.

**Impact**: Consumers can depend on internal functions that may change without notice. Makes refactoring the utils module a breaking change.

**Fix**: Replace `export *` with explicit named exports of only the functions intended for external use.

---

#### M3. `getPreviousSearches` Tool Returns Empty Array (Stub)

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts` (lines 737-742)

**Issue**: The tool always returns `JSON.stringify([])` with a TODO comment about Convex integration. The prompt lists this as an available tool, so the agent may call it expecting useful data.

**Impact**: Agent receives misleading empty results when attempting to use previous search recall.

**Fix**: Either implement the Convex integration or remove from prompt and agent tool matrix.

---

#### M4. Unused Utility Functions in `agentTransfer.ts`

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/utils/agentTransfer.ts`

**Issue**: Multiple exported functions appear unused by any client tool or component: `getTransferRecommendations`, `formatTransferMessage`, `calculateTransferDelay`, `logTransferAttempt`, `getTransferContext`. The `transferToAgent` tool in `useAddressFinderClientTools.ts` uses the functions from `shared/constants/agentConfig.ts` instead.

**Impact**: Dead code increasing bundle size and maintenance surface.

**Fix**: Verify no imports exist, then remove the unused functions.

---

#### M5. Unused `toolValidation.ts` Utilities

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/utils/toolValidation.ts`

**Issue**: Contains validation utilities that are not used by `useAddressFinderClientTools.ts`, which has its own inline parameter validation. The centralized validation was likely created as part of an architectural improvement that was never integrated.

**Impact**: Misleading code that suggests a validation pattern that is not actually in use.

**Fix**: Either integrate these utilities into the client tools or remove them.

---

#### M6. `isSmartValidationEnabled` Appears Unused

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/intentStore.ts` (lines 9, 19, 30, 56-57)

**Issue**: The `isSmartValidationEnabled` field is defined in the store with a setter and default value of `true`, but no component or hook appears to read or set this value in a meaningful way.

**Impact**: Dead state that adds confusion when reading the store.

**Fix**: Verify no consumers exist, then remove.

---

#### M7. `conversationRef` Typed as `any`

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/AddressFinderBrain.tsx` (line 146)

**Issue**: `const conversationRef = useRef<any>(null)` bypasses TypeScript entirely for the conversation object. This ref is passed to `useActionHandler` and used to control the ElevenLabs conversation.

**Impact**: No type safety for conversation API calls. Typos or API changes will not be caught at compile time.

**Fix**: Type with the ElevenLabs conversation interface from their SDK.

---

#### M8. Searches Schema Missing Intent Types

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/schemas/searches.ts` (line 7)

**Issue**: `searchType` is defined as `v.union(v.literal("suburb"), v.literal("address"))`, but the system supports 4 intent types: "suburb", "street", "address", "general". Searches with "street" or "general" intent cannot be persisted.

**Impact**: Data loss when search history persistence is implemented. Two of four search types will fail validation.

**Fix**: Add `v.literal("street")` and `v.literal("general")` to the union.

---

### LOW (6 findings)

#### L1. Commented-Out Import in `uiStore.ts`

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/uiStore.ts` (line 3)

**Issue**: `// import type { LocationIntent, Suggestion, HistoryItem } from '~/stores/types';` -- dead commented-out import.

---

#### L2. Multiple `as any` Casts Throughout Codebase

**Files**: Various
- `AddressFinderBrain.tsx` line 146: `useRef<any>(null)`
- `useAddressFinderClientTools.ts` line 419: `as Record<string, unknown>`
- `useConversationManager.ts` line 7: `Record<string, any>` parameter type
- `useAgentConversation.ts` line 83: `as any` cast
- `ClientToolsProvider.ts` line 48: `(allClientTools as any)[toolName]`
- `convex/address/getPlaceDetails.ts` line 79: `as Record<string, any>`

**Impact**: Reduced type safety at integration boundaries.

---

#### L3. Sync Script Appends Duplicate "AVAILABLE TOOLS" Section

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/scripts/2-sync-agent.ts` (lines 87-90)
**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/scripts/4-multi-agent-sync.ts` (lines 55-58, 113)

**Issue**: Both sync scripts append a generated "AVAILABLE TOOLS" section to the prompt, but the master prompt already contains an "AVAILABLE TOOLS" section (line 38). The agent sees two tool lists -- one handcrafted, one auto-generated.

**Impact**: Prompt confusion, wasted context tokens.

---

#### L4. `context-variables.ts` References Non-Existent `useAddressFinderStore`

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/context-variables.ts` (lines 56, 69, 98, 111, 115)

**Issue**: Documentation file references `useAddressFinderStore` as the source for multiple context variables. This store does not exist -- the stores are split into `useIntentStore`, `useUIStore`, and `useApiStore`.

**Impact**: Misleading documentation for developers trying to understand the sync architecture.

---

#### L5. `handleRequestAgentState` Unused

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/AddressFinderBrain.tsx` (line 194)

**Issue**: Destructured from `useConversationLifecycle` but never used in the component.

---

#### L6. `_context` Parameter Unused in `useReliableSync.ts`

**File**: `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useReliableSync.ts` (line 11)

**Issue**: The `_context` parameter is prefixed with underscore indicating it is intentionally unused, but it suggests an incomplete integration.

---

## Category Deep Dives

### 1. Defects & Logic Errors

The most significant logic defect is the broken `validateToolAssignments()` function (C4) that can never validate anything due to using an empty mock object. This allowed the `getNearbyServices` ghost tool (C2) to persist undetected.

The missing context variable sync (C1) is a logic error in the integration layer -- the code exists in the stores to track these values, but the sync function was never updated to include them.

No critical data-loss bugs were found. The `errorBody` discard in `validateAddress.ts` (M1) loses diagnostic information but does not corrupt data.

### 2. DRY Violations (Duplication)

| Duplicated Item | Locations | Severity |
|---|---|---|
| `LocationIntent` type | `app/stores/types.ts`, `convex/address/types.ts` | HIGH (H3) |
| `ENRICHMENT_CACHE_KEY` | `useAddressFinderClientTools.ts`, `actions/types.ts` | HIGH (H4) |
| `PlaceDetailsResult` interface | `useAddressFinderClientTools.ts`, `actions/types.ts` | HIGH (H5) |
| `SearchHistoryEntry` type | `stores/searchHistoryStore.ts`, `services/types.ts` | HIGH (H6) |
| `AddressSelectionEntry` type | `stores/addressSelectionStore.ts`, `services/types.ts` | HIGH (H6) |
| "AVAILABLE TOOLS" prompt section | `master_prompt_base.txt`, sync scripts | LOW (L3) |

The duplication pattern centers on the boundary between the service layer (SLIP) and the Zustand stores. The SLIP project created its own type definitions rather than importing from stores, leading to parallel type hierarchies.

### 3. Dead Code & Stale References

- `getPreviousSearches` tool: Stub returning empty array (M3)
- `agentTransfer.ts` utility functions: Unused by any client tool (M4)
- `toolValidation.ts` utilities: Unused validation functions (M5)
- `isSmartValidationEnabled` store field: No meaningful consumers (M6)
- `handleRequestAgentState`: Destructured but unused (L5)
- `_context` parameter in `useReliableSync.ts` (L6)
- Commented-out import in `uiStore.ts` (L1)
- `context-variables.ts` references `useAddressFinderStore` which does not exist (L4)
- `convex/agentTools.ts` is empty (no server-side agent tools registered)

### 4. Architectural Violations

The primary architectural violation is AddressFinderUI's ~20 props (H1), which contradicts the "<=3 props" rule. The component correctly avoids importing stores directly (following the Widget pattern), but the prop surface area is excessive.

The `suggestions` sync to the agent (H2) violates the "never sync cosmetic state" rule documented in CLAUDE.md.

The Brain/Widget separation is otherwise well-maintained. Brain components (AddressFinderBrain.tsx) properly orchestrate stores, and Widget components (ManualSearchForm, VoiceInputController) are self-contained with minimal interfaces.

### 5. State Management Issues

The state architecture uses three Zustand stores (`uiStore`, `intentStore`, `apiStore`) plus React Query for server state. This is well-structured, but:

1. **Store-to-agent sync gap** (C1): The bridge between Zustand state and ElevenLabs context variables has holes.
2. **Type divergence** (H3): `LocationIntent` allows `null` in stores but not in Convex, creating a type boundary issue.
3. **useMemo dependency** (H7): `currentIntent` in the client tools useMemo causes unnecessary re-creation.

The service layer (AddressSearchService) maintains its own state snapshots separate from the stores, creating a potential for drift. The `validateStateIntegrity()` and `resyncFromStores()` methods exist to address this, which is good defensive design.

### 6. Prompt & Agent Configuration Consistency

This is the weakest area of the system.

| Check | Status | Details |
|---|---|---|
| All prompt tools exist in code | FAIL | `getNearbyServices` missing (C2) |
| All context vars are synced | FAIL | 5 of 8 not synced (C1) |
| Per-agent prompts used | FAIL | All agents get address-finder prompt (C3) |
| Tool matrix matches implementation | UNKNOWN | Validation is broken (C4) |
| Prompt tools match matrix | PARTIAL | Matrix is correct but prompt has extras |

### 7. Error Handling & Resilience

Error handling is generally competent:

- `withRetry` utility (`app/utils/retryMechanism.ts`) provides exponential backoff for API calls
- All Convex actions return typed success/error unions
- Client tools wrap operations in try/catch with JSON error responses
- The service layer has a structured error hierarchy (`errors.ts`) with user-friendly messages

Gaps:
- `errorBody` discarded in `validateAddress.ts` (M1)
- `getPlaceSuggestions.ts` catch block (line 154) returns generic "Failed to fetch place suggestions" without original error details
- `useAgentSync.ts` catch block (line 88-90) only `console.warn`s, providing no recovery mechanism

### 8. Type Safety

The codebase uses TypeScript strict mode and Convex validators, providing good type safety at the boundaries. However:

- 6+ instances of `as any` casts at integration boundaries (L2)
- `conversationRef` typed as `any` (M7)
- `ClientToolsProvider.ts` uses `(allClientTools as any)[toolName]` to circumvent type checking (line 48)
- Frontend `LocationIntent` includes `null` but backend does not (H3)
- `useAddressRecall.ts` uses 4 `as LocationIntent` casts to bridge the type gap

The `ai/tools.config.ts` file provides good Zod-based validation for tool parameters, and the `ClientToolsImplementation` type ensures all tools are implemented. This is one of the stronger type safety patterns in the codebase.

---

## Health Score Table

| Category | Score (1-10) | Notes |
|---|---|---|
| Defects & Logic Errors | 5 | Broken validation, missing sync, ghost tool |
| DRY Violations | 5 | 5 duplicate type definitions across layers |
| Dead Code & Stale References | 6 | Moderate accumulation from refactors |
| Architectural Violations | 7 | One major prop violation; otherwise good separation |
| State Management Issues | 7 | Good store structure; sync gaps and type mismatch |
| Prompt & Agent Config Consistency | 3 | Multiple critical gaps between prompt and code |
| Error Handling & Resilience | 7 | Generally solid with a few blind spots |
| Type Safety | 6 | Good foundation undermined by `any` casts and type duplication |

**Overall Health Score: 5.75 / 10**

---

## Priority Recommendations

### Immediate (This Sprint)

1. **Fix context variable sync** (C1): Add the 5 missing variables to `useAgentSync.ts`. This is a ~10-line change that fixes the most critical agent behavior issue.

2. **Remove or implement `getNearbyServices`** (C2): If the feature is not needed, remove lines 62 and 91 from `master_prompt_base.txt`. If it is needed, implement the tool in `useAddressFinderClientTools.ts` and add it to `ai/tools.config.ts` and `AGENT_TOOL_MATRIX`.

3. **Fix sync scripts for per-agent prompts** (C3): Add a prompt path mapping so CONVERSATION_ASSISTANT gets its own prompt.

### Short-Term (Next 2 Sprints)

4. **Fix `validateToolAssignments()`** (C4): Replace the broken mock approach with actual runtime or build-time validation.

5. **Consolidate `LocationIntent` type** (H3): Create a single shared type. Decide whether `null` is valid and enforce consistently.

6. **Remove `suggestions` from agent sync** (H2): The agent has tool-based access via `getSuggestions()`.

7. **Consolidate duplicate types** (H4, H5, H6): Import `ENRICHMENT_CACHE_KEY`, `PlaceDetailsResult`, `SearchHistoryEntry`, and `AddressSelectionEntry` from canonical locations.

### Medium-Term (Next Quarter)

8. **Refactor AddressFinderUI props** (H1): Split into sub-Widget components with <=3 props each.

9. **Clean up dead code** (M3, M4, M5, M6): Remove stubs, unused utility functions, and dead store fields.

10. **Fix searches schema** (M8): Add missing intent types before implementing persistence.

11. **Replace `any` casts** (L2, M7): Type the conversation ref and integration boundaries properly.

---

## Files Audited

### Frontend Components
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/routes/address-finder.tsx`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/AddressFinderBrain.tsx`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/AddressFinderUI.tsx`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/ManualSearchForm.tsx`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/VoiceInputController.tsx`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/components/address-finder/index.ts`

### ElevenLabs Integration
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAddressFinderClientTools.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAgentSync.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useConversationManager.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useReliableSync.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/hooks/useAgentConversation.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/types/clientTools.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/providers/ClientToolsProvider.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/utils/toolValidation.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/elevenlabs/utils/agentTransfer.ts`

### State Management
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/apiStore.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/intentStore.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/uiStore.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/types.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/searchHistoryStore.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/stores/addressSelectionStore.ts`

### Service Layer
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/address-search/AddressSearchService.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/address-search/AddressCache.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/address-search/types.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/address-search/errors.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/services/hooks/useAddressSearchService.ts`

### Hooks
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/useAddressRecall.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/useAddressValidation.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/useActionHandler.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/useConversationLifecycle.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/useAddressAutoSelection.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/actions/selectionActions.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/app/hooks/actions/types.ts`

### Convex Backend
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/getPlaceSuggestions.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/validateAddress.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/getPlaceDetails.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/index.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/utils.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/address/types.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/agentTools.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/schemas/searches.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/convex/schemas/userPreferences.ts`

### AI Prompts & Configuration
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/address-finder/master_prompt_base.txt`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/conversation_agent/master_prompt.txt`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/tools.config.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/ai/context-variables.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/shared/constants/agentConfig.ts`

### Sync Scripts
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/scripts/2-sync-agent.ts`
- `/Users/stewartmilne/MetaBureau/2025/REOPMAIN/react-starter-kit/scripts/4-multi-agent-sync.ts`
