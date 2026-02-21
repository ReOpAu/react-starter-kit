# Voice Agent Follow-up Tasks

Identified during the agent ID / tool matrix / parallel API fix session (2026-02-21).
Fixes 1-3 are already shipped in commit `e4be855`.

---

## [ ] 4. Trim System Prompt Bloat

**File**: `master_prompt_base.txt`
**Problem**: ~14K chars, roughly half duplicates tool `description` fields that ElevenLabs already sends to the LLM via tool definitions.
**Fix**: Remove the tool documentation section from the prompt. Halves prompt size, reduces token cost per turn, and speeds up first response.

---

## [ ] 5. Auto-set `selectionAcknowledged` on Selection

**Files**: `app/elevenlabs/hooks/useAddressFinderClientTools.ts` (`selectSuggestion`, `confirmUserSelection`)
**Problem**: The agent must remember to call `setSelectionAcknowledged(true)` after confirming a selection, or the UI stalls. This "AI must remember" pattern is inherently fragile.
**Fix**: Set `selectionAcknowledged` automatically inside `selectSuggestion` and/or `confirmUserSelection` instead of relying on a separate tool call.

---

## [ ] 6. Consider Removing `confirmUserSelection`

**File**: `app/elevenlabs/hooks/useAddressFinderClientTools.ts`, `ai/tools.config.ts`
**Problem**: `selectSuggestion` already confirms the selection and updates the UI. The separate `confirmUserSelection` tool creates an extra round-trip where the agent talks again.
**Fix**: Collapse the flow from search -> select -> confirm (3 steps) to search -> select -> done (2 steps). Would also reduce tool count and simplify the prompt.
**Note**: Depends on fix 5 being done first.

---

## [ ] 7. Remove Ghost Tool Reference: `getNearbyServices`

**File**: `master_prompt_base.txt` (~lines 62, 91)
**Problem**: `getNearbyServices` is referenced in the system prompt but does not exist as a client tool. The agent may attempt to call it and fail silently.
**Fix**: Remove all references to `getNearbyServices` from the prompt.

---

## [ ] 8. Increase Prompt Temperature from 0

**File**: Agent config / ElevenLabs dashboard
**Current**: Temperature 0
**Problem**: Deterministic output is fine for tool use but makes voice conversation sound robotic and repetitive.
**Fix**: Set temperature to 0.3-0.5 for more natural-sounding voice while staying reliable for tool calls.

---

## [ ] 9. Update `.env` with Current Agent ID

**File**: `.env` or `.env.local`
**Problem**: `useConversationManager.ts:33` reads `VITE_ELEVENLABS_ADDRESS_AGENT_ID` from env vars at runtime. We updated `agentConfig.ts` but the env var may still point to the old stale ID.
**Fix**: Set `VITE_ELEVENLABS_ADDRESS_AGENT_ID=agent_01k063krh2f17b2t7e97t9ck1r` in `.env.local`.
**Priority**: High -- the app won't connect to the correct agent without this.
