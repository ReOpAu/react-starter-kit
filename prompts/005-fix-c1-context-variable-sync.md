<objective>
Fix CRITICAL finding C1: 5 of 8 ElevenLabs context variables referenced in the agent prompt are never synced. The agent operates with null/undefined for `searchResultsCount`, `agentLastSearchQuery`, `currentIntent`, `activeSearchSource`, and `selectionAcknowledged` — breaking its ability to validate selections and manage conversation flow.
</objective>

<context>
Read `./CLAUDE.md` for project conventions.

The ElevenLabs agent receives context variables via `window.setVariable()` calls in `useAgentSync.ts`. The master prompt at `ai/address-finder/master_prompt_base.txt` references 8 context variables using `{{variable}}` syntax. Only 4 are actually synced. The missing 5 are critical to agent decision-making:

- `{{agentLastSearchQuery}}` — used to validate selection context isn't stale (prompt line 32)
- `{{selectionAcknowledged}}` — UI waits for this before clearing suggestions (prompt line 36)
- `{{searchResultsCount}}` — agent needs to know how many results are on screen
- `{{currentIntent}}` — agent adjusts behavior based on intent classification
- `{{activeSearchSource}}` — agent knows if search came from voice or manual input

The values already exist in the Zustand stores — they just need to be wired through.
</context>

<files>
- `./app/elevenlabs/hooks/useAgentSync.ts` — PRIMARY FILE TO MODIFY
- `./app/stores/intentStore.ts` — source for `agentLastSearchQuery`, `currentIntent`, `activeSearchSource`
- `./app/stores/uiStore.ts` — source for `selectionAcknowledged`
- `./ai/address-finder/master_prompt_base.txt` — reference for expected variable names
</files>

<requirements>
1. Read `useAgentSync.ts` completely
2. Read `intentStore.ts` and `uiStore.ts` to confirm the source field names
3. Read the prompt's CURRENT CONTEXT section (lines 20-30) to confirm the exact `{{variable}}` names
4. Add the 5 missing `window.setVariable()` calls to the sync function, matching the exact variable names from the prompt
5. The variables are already available in the `agentState` object or directly from the stores — wire them through

The sync function already reads from all 3 stores via `getState()`. Add the missing variable syncs in the same section as the existing ones (around lines 67-82).
</requirements>

<constraints>
- Do NOT change the prompt variable names — the code must match what the prompt expects
- Do NOT add new store fields — the data already exists
- Do NOT change the sync frequency or trigger mechanism
- Keep the same pattern as existing `setVariable` calls
</constraints>

<verification>
After making changes:
1. Run `npm run typecheck` to confirm no type errors
2. Verify all 8 prompt variables now have corresponding `setVariable` calls
3. Cross-reference: every `{{variable}}` in the prompt's CURRENT CONTEXT section should have a matching sync
</verification>

<success_criteria>
- All 8 context variables from the prompt are synced via `window.setVariable()`
- TypeScript compiles cleanly
- No changes to prompt file needed — code now matches the prompt's expectations
</success_criteria>
