<objective>
Fix CRITICAL finding C4: `validateToolAssignments()` in `ClientToolsProvider.ts` uses an empty mock object and can never detect missing tools. Replace with working validation that catches drift between the tool matrix (declared tools) and actual implementations.
</objective>

<context>
Read `./CLAUDE.md` for project conventions.

The current `validateToolAssignments()` at `app/elevenlabs/providers/ClientToolsProvider.ts` (lines 89-120) creates `{} as ClientTools`, calls `Object.keys()` on it (always empty), then tries to validate against that empty set. This means:
- Tools can be added to `AGENT_TOOL_MATRIX` in `agentConfig.ts` without implementation
- Tools can be implemented without being added to the matrix
- The ghost `getNearbyServices` tool (C2) would have been caught by working validation

The tool implementations live in `useAddressFinderClientTools.ts` and their names are defined in `ai/tools.config.ts`. The matrix is in `shared/constants/agentConfig.ts`.
</context>

<files>
- `./app/elevenlabs/providers/ClientToolsProvider.ts` — PRIMARY FILE TO MODIFY
- `./ai/tools.config.ts` — source of truth for tool definitions (has `toolDefinitions` export)
- `./shared/constants/agentConfig.ts` — `AGENT_TOOL_MATRIX` and `CLIENT_TOOLS` derived from `toolDefinitions`
- `./app/elevenlabs/hooks/useAddressFinderClientTools.ts` — actual tool implementations
</files>

<requirements>
1. Read `ClientToolsProvider.ts` completely to understand the current broken validation
2. Read `ai/tools.config.ts` to see the `toolDefinitions` export — this is the authoritative tool list
3. Read `agentConfig.ts` to see how `CLIENT_TOOLS` is derived from `toolDefinitions`
4. Replace the broken validation with one that actually works. The approach should:
   - Get the list of implemented tool names from the actual client tools object (not an empty mock)
   - Compare against the agent's assigned tools from `AGENT_TOOL_MATRIX`
   - Log warnings for: tools in matrix but not implemented, tools implemented but not in matrix
   - Run at initialization time (dev mode only is acceptable)
5. The validation should be defensive — it should warn, not crash. Missing tools should log errors but not prevent the app from starting.
</requirements>

<constraints>
- Do NOT modify `agentConfig.ts` or `tools.config.ts` — they are correct
- Do NOT modify `useAddressFinderClientTools.ts` — the implementations are fine
- The validation must work at runtime, not just at build time (since tool implementations are created dynamically in hooks)
- Keep it simple — this doesn't need to be a framework, just a working check
</constraints>

<verification>
1. Run `npm run typecheck` — no type errors
2. The validation should correctly identify any mismatches if you temporarily add a fake tool name to the matrix
3. In dev mode, the console should show validation results on startup
</verification>

<success_criteria>
- `validateToolAssignments()` actually validates against real tool implementations
- Mismatches between matrix and implementations produce clear console warnings
- TypeScript compiles cleanly
- No impact on production runtime (validation is dev-mode or startup-only)
</success_criteria>
