<objective>
Fix CRITICAL finding C2: The master prompt references a `getNearbyServices` tool that does not exist in the codebase. The agent will attempt to call it and fail, wasting conversation turns and confusing users. Remove all references to this non-existent tool from the prompt.
</objective>

<context>
Read `./CLAUDE.md` for project conventions.

The `getNearbyServices(address, serviceType?, radius?)` tool is listed in the master prompt but:
1. Is NOT defined in `ai/tools.config.ts`
2. Is NOT implemented in `app/elevenlabs/hooks/useAddressFinderClientTools.ts`
3. Is NOT listed in any `AGENT_TOOL_MATRIX` entry in `shared/constants/agentConfig.ts`

This is a ghost reference from a planned-but-never-implemented feature.
</context>

<files>
- `./ai/address-finder/master_prompt_base.txt` — PRIMARY FILE TO MODIFY
</files>

<requirements>
1. Read `ai/address-finder/master_prompt_base.txt` completely
2. Find ALL references to `getNearbyServices` — the audit identified lines 62 and 91, but search the entire file
3. Remove the tool from any tool list sections
4. Remove any usage examples, parameter descriptions, or guidance about this tool
5. If there are transfer-related instructions that reference nearby services capabilities, update them to reflect actual capabilities
6. Do NOT remove other tools — only `getNearbyServices`
</requirements>

<constraints>
- Only modify the prompt file — no code changes needed
- Preserve the formatting and structure of surrounding content
- Do not add new tools or features — this is a removal-only fix
</constraints>

<post_fix>
After editing the prompt, this change needs to be deployed to ElevenLabs. Run:
```
npx tsx scripts/4-multi-agent-sync.ts --agent=ADDRESS_FINDER
```
Confirm the sync returns 200 OK.
</post_fix>

<verification>
1. Search the entire prompt file for "getNearbyServices" — should return zero matches
2. Search for "nearby" — review any remaining references to ensure they don't promise this capability
3. Run the sync script and confirm 200 OK
</verification>

<success_criteria>
- Zero references to `getNearbyServices` in the prompt
- Prompt still reads coherently after removal
- Successfully synced to ElevenLabs ADDRESS_FINDER agent
</success_criteria>
