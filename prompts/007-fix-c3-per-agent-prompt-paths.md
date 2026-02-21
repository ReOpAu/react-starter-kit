<objective>
Fix CRITICAL finding C3: The sync scripts push the address-finder prompt to ALL agents, including CONVERSATION_ASSISTANT, which has its own dedicated prompt at `ai/conversation_agent/master_prompt.txt`. Add per-agent prompt file resolution so each agent gets the correct prompt.
</objective>

<context>
Read `./CLAUDE.md` for project conventions.

Currently, both sync scripts (`scripts/2-sync-agent.ts` and `scripts/4-multi-agent-sync.ts`) hardcode the prompt path to `ai/address-finder/master_prompt_base.txt`. When `4-multi-agent-sync.ts` syncs all agents, CONVERSATION_ASSISTANT incorrectly receives the address-finder prompt instead of its own prompt at `ai/conversation_agent/master_prompt.txt`.

The correct mapping is:
- ADDRESS_FINDER → `ai/address-finder/master_prompt_base.txt`
- ADDRESS_FINDER_TEST → `ai/address-finder/master_prompt_base.txt`
- CONVERSATION_ASSISTANT → `ai/conversation_agent/master_prompt.txt`
</context>

<files>
- `./scripts/4-multi-agent-sync.ts` — PRIMARY FILE TO MODIFY
- `./scripts/2-sync-agent.ts` — SECONDARY (single-agent script, may need prompt path parameterization)
- `./shared/constants/agentConfig.ts` — reference for agent keys
- `./ai/address-finder/master_prompt_base.txt` — address finder prompt
- `./ai/conversation_agent/master_prompt.txt` — conversation assistant prompt
</files>

<requirements>
1. Read both sync scripts completely
2. Read `agentConfig.ts` for the `AgentKey` type and agent definitions
3. Add a prompt path mapping (either in the sync script or in `agentConfig.ts`) that maps each agent key to its prompt file:
   ```typescript
   const AGENT_PROMPT_PATHS: Record<string, string> = {
     ADDRESS_FINDER: "ai/address-finder/master_prompt_base.txt",
     ADDRESS_FINDER_TEST: "ai/address-finder/master_prompt_base.txt",
     CONVERSATION_ASSISTANT: "ai/conversation_agent/master_prompt.txt",
   };
   ```
4. Update the sync logic to use this mapping instead of the hardcoded path
5. If `2-sync-agent.ts` is ADDRESS_FINDER-specific, that's fine — just ensure it doesn't accidentally sync to wrong agents
6. Ensure the scripts fall back gracefully if a prompt path is missing (error with clear message, don't silently use wrong prompt)
</requirements>

<constraints>
- Do NOT modify the prompt files themselves
- Do NOT change the ElevenLabs API call structure — only the prompt content that gets sent
- Keep the existing tool generation logic (reading from `ai/tools.config.ts`) — each agent still gets tools appended
- Preserve the `--dry-run` and `--agent=X` CLI flags
</constraints>

<post_fix>
After editing the scripts, verify by running dry-runs for each agent:
```
npx tsx scripts/4-multi-agent-sync.ts --agent=ADDRESS_FINDER --dry-run
npx tsx scripts/4-multi-agent-sync.ts --agent=CONVERSATION_ASSISTANT --dry-run
```
Confirm each shows different prompt content and correct prompt lengths.

Then do a live sync of CONVERSATION_ASSISTANT only (it currently has the wrong prompt):
```
npx tsx scripts/4-multi-agent-sync.ts --agent=CONVERSATION_ASSISTANT
```
</post_fix>

<verification>
1. TypeScript compiles: the script should have no type errors
2. Dry-run for ADDRESS_FINDER shows address-finder prompt content
3. Dry-run for CONVERSATION_ASSISTANT shows conversation-agent prompt content
4. Prompt lengths differ between the two agents
5. Live sync of CONVERSATION_ASSISTANT returns 200 OK
</verification>

<success_criteria>
- Per-agent prompt resolution implemented
- Each agent gets its correct prompt
- CONVERSATION_ASSISTANT synced with its own prompt (live, not just dry-run)
- Existing ADDRESS_FINDER sync behavior unchanged
</success_criteria>
