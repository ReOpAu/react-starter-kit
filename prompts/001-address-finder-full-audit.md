<objective>
Perform a comprehensive code quality audit of the entire address-finder system. Thoroughly analyze every layer — frontend components, ElevenLabs integration, state management, services, Convex backend functions, and AI prompts — to identify defects, duplication, dead code, inconsistencies, and anti-patterns.

The goal is to produce a confidence report: can we trust this codebase is healthy, DRY, and production-quality? Every finding must cite the exact file and line number.
</objective>

<context>
Read `./CLAUDE.md` first for project conventions, architecture rules, and the Brain/Widget component pattern.

This is a React Router v7 + Convex + ElevenLabs voice agent application. The address-finder is the core feature — it lets users find Australian addresses via voice (ElevenLabs conversational AI) or manual text input.

Key architectural rules from CLAUDE.md that must be verified:
- Brain vs Widget separation (only Brain components import global stores or call syncToAgent)
- Widget components must be self-contained with <=3 props
- Only business-critical info flows to AI agents (no cosmetic state)
- React Query is single source of truth for server state
- Zustand for UI state only
- Tailwind CSS only, no inline styles
- Biome formatting (tabs, double quotes)
</context>

<files_to_audit>
Thoroughly read and analyze ALL of these files. Do not skim — read every line.

**Frontend Components:**
- `./app/routes/address-finder.tsx`
- `./app/components/address-finder/AddressFinderBrain.tsx`
- `./app/components/address-finder/AddressFinderUI.tsx`
- All files in `./app/components/address-finder/`

**ElevenLabs Integration (highest priority — this layer has had bugs):**
- `./app/elevenlabs/hooks/useAddressFinderClientTools.ts`
- `./app/elevenlabs/hooks/useAgentSync.ts`
- `./app/elevenlabs/types/clientTools.ts`
- All files in `./app/elevenlabs/`

**State Management:**
- `./app/stores/apiStore.ts`
- `./app/stores/intentStore.ts`
- `./app/stores/uiStore.ts`
- Any other stores in `./app/stores/`

**Service Layer:**
- `./app/services/address-search/AddressSearchService.ts`
- `./app/services/address-search/AddressCache.ts`
- `./app/services/address-search/types.ts`
- `./app/services/address-search/errors.ts`
- `./app/services/hooks/useAddressSearchService.ts`

**Hooks:**
- `./app/hooks/useAddressRecall.ts`
- `./app/hooks/useAddressValidation.ts`
- Any other custom hooks in `./app/hooks/`

**Convex Backend:**
- All files in `./convex/address/`
- `./convex/agentTools.ts`
- `./convex/schemas/searches.ts`
- `./convex/schemas/userPreferences.ts`
- `./convex/schemas/index.ts`

**AI Prompts:**
- `./ai/address-finder/master_prompt_base.txt`
- `./ai/conversation_agent/master_prompt.txt`
- `./ai/tools.config.ts`

**Agent Configuration:**
- `./shared/constants/agentConfig.ts`

**Sync Scripts (check for consistency with codebase):**
- `./scripts/2-sync-agent.ts`
- `./scripts/4-multi-agent-sync.ts`
</files_to_audit>

<audit_categories>
For each category, report findings with severity levels:
- **CRITICAL**: Bugs, logic errors, security issues, data loss risks
- **HIGH**: Significant duplication, architectural violations, stale code that misleads
- **MEDIUM**: Minor duplication, inconsistencies, missing error handling
- **LOW**: Style issues, naming inconsistencies, minor improvements

**1. Defects & Logic Errors**
- Look for race conditions, null pointer risks, unhandled error paths
- Check if tool responses match what the agent actually receives
- Verify all return paths in every tool function handle edge cases
- Check for off-by-one errors, wrong comparisons, inverted conditions
- Verify promises are properly awaited
- Check for stale closures in React hooks and callbacks

**2. DRY Violations (Duplication)**
- Identify duplicated logic across files (same pattern implemented in multiple places)
- Find duplicated string constants (especially agent messages, cache keys, status strings)
- Check for duplicated type definitions or near-identical interfaces
- Look for copy-pasted code blocks with minor variations
- Check if the service layer (SLIP) actually eliminated the duplication it was designed to fix

**3. Dead Code & Stale References**
- Identify unused exports, functions, variables, types
- Find imports that are no longer used
- Check for commented-out code blocks
- Look for TODO/FIXME/HACK comments that indicate unfinished work
- Find references to removed features or old patterns (e.g., old suburb/ directory references)

**4. Architectural Violations**
- Verify Brain/Widget separation: do any Widget components import global stores?
- Check that only Brain components call syncToAgent
- Verify no cosmetic state is synced to the AI agent
- Check prop counts on Widget components (should be <=3)
- Verify React Query is the single source of truth for server state
- Check that Zustand stores only hold UI state

**5. State Management Issues**
- Are there state setters in useEffect dependencies?
- Is state duplicated between React Query and Zustand?
- Are there stores that should be merged or split?
- Check for stale state reads (missing getState() in callbacks)

**6. Prompt & Agent Configuration Consistency**
- Do the tool descriptions in `tools.config.ts` match what the tools actually do in `useAddressFinderClientTools.ts`?
- Does the system prompt reference tools or variables that don't exist?
- Are there tool names in the prompt that don't match the actual tool names?
- Do the agent context variables in the prompt (e.g., `{{hasResults}}`, `{{agentLastSearchQuery}}`) match what `useAgentSync.ts` actually sends?
- Is the AGENT_TOOL_MATRIX in agentConfig.ts consistent with what the sync scripts send?

**7. Error Handling & Resilience**
- Are all Convex action calls wrapped in try/catch?
- Do error messages provide useful context?
- Is retry logic consistent across similar operations?
- Are there silent failures (catches that swallow errors)?

**8. Type Safety**
- Are there any `as any` or `as unknown` casts that could hide bugs?
- Are function parameters properly typed?
- Are return types explicit or inferred correctly?
- Check for type assertions that bypass safety (`as Record<string, unknown>`)
</audit_categories>

<output_format>
Save the audit report to `./analyses/address-finder-audit.md` using this structure:

```markdown
# Address Finder System Audit Report

## Executive Summary
[2-3 sentences: overall health assessment, number of findings by severity, top concerns]

## Findings by Severity

### CRITICAL
[Each finding with: file:line, description, evidence, recommended fix]

### HIGH
[Same format]

### MEDIUM
[Same format]

### LOW
[Same format]

## Category Deep Dives

### 1. Defects & Logic Errors
[Detailed findings]

### 2. DRY Violations
[Detailed findings with code snippets showing duplication]

### 3. Dead Code & Stale References
[List of dead code with file:line references]

### 4. Architectural Violations
[Findings mapped to CLAUDE.md rules]

### 5. State Management Issues
[Findings with store names and hook references]

### 6. Prompt & Agent Configuration Consistency
[Cross-reference table: prompt references vs actual implementation]

### 7. Error Handling & Resilience
[Findings with missing or weak error handling]

### 8. Type Safety
[Findings with unsafe casts or missing types]

## Health Score
[Rate each category 1-10, with brief justification]

| Category | Score | Notes |
|----------|-------|-------|
| Defects | X/10 | ... |
| DRY | X/10 | ... |
| Dead Code | X/10 | ... |
| Architecture | X/10 | ... |
| State Management | X/10 | ... |
| Prompt Consistency | X/10 | ... |
| Error Handling | X/10 | ... |
| Type Safety | X/10 | ... |
| **Overall** | **X/10** | ... |

## Recommendations (Priority Order)
[Numbered list of recommended actions, highest impact first]
```
</output_format>

<verification>
Before completing the audit:
- Confirm you read every file listed in files_to_audit (not just skimmed)
- Confirm every finding cites a specific file:line_number
- Confirm no false positives: verify each finding by re-reading the relevant code
- Confirm the health scores are justified by the evidence, not guesswork
- Cross-check: do any findings contradict each other?
</verification>

<success_criteria>
- Every file in the audit list has been read and analyzed
- Findings are specific (file:line), not vague ("there might be issues with...")
- The report gives a clear, honest health assessment — not overly critical or generous
- The priority recommendations are actionable and ordered by impact
- Report saved to `./analyses/address-finder-audit.md`
</success_criteria>
