# ElevenLabs Agent Sync Issue & Resolution Path

## Current Situation

### What We Have
A React application with ElevenLabs conversational AI integration featuring:
- **3 configured agents** in `shared/constants/agentConfig.ts`:
  - `ADDRESS_FINDER` (13 tools) - Production address finder
  - `ADDRESS_FINDER_TEST` (14 tools) - Test agent with enhanced services
  - `CONVERSATION_ASSISTANT` (7 tools) - General conversation agent

- **Custom sync scripts** in `scripts/`:
  - `4-multi-agent-sync.ts` - Syncs all agents to ElevenLabs API
  - `sync-conversation-agent.ts` - Dedicated conversation agent sync

- **Centralized tool definitions** in `ai/tools.config.ts`:
  - 12 modern tools with Zod schemas
  - Type-safe `ClientToolsImplementation` interface
  - Single source of truth for tool parameters

- **Agent prompts** in `ai/`:
  - `address-finder/master_prompt_base.txt` (156 lines, comprehensive)
  - `conversation_agent/master_prompt.txt` (64 lines, modernized)
  - `context-variables.ts` (documents ElevenLabs injected variables)

### The Problem
When running the sync script, one agent fails:

```
🚀 Multi-Agent Configuration Sync
📋 Mode: LIVE SYNC

🔧 Syncing agent: AddressFinder (agent_01jydc3p56er8tn495y66hybmn)
📊 Response: 404 Not Found
❌ Sync failed for AddressFinder!
Response body: {"detail":{"status":"document_not_found","message":"Document with id agent_01jydc3p56er8tn495y66hybmn not found."}}

🔧 Syncing agent: AddressFinder-Test (agent_01jzvft1wjfr49ghzgswxcrhwr)
✅ AddressFinder-Test synced successfully!

🔧 Syncing agent: ConversationAssistant (agent_01jwsxt8vseg6933dfd2jb4vkd)
✅ ConversationAssistant synced successfully!
```

**Root Cause**: The `ADDRESS_FINDER` agent ID (`agent_01jydc3p56er8tn495y66hybmn`) no longer exists in the ElevenLabs platform. The agent was likely deleted or recreated with a new ID.

---

## Investigation Completed

### 1. Codebase Cleanup (Already Done)
- ✅ Consolidated `AGENT_TOOL_MATRIX` to single source of truth
- ✅ Removed duplicate tool assignments from sync scripts
- ✅ Documented all ElevenLabs context variables
- ✅ Modernized conversation agent prompt
- ✅ Removed legacy tool definitions (AddressSearch, ConfirmPlace, etc.)
- ✅ Fixed prompt file path bug in sync script

### 2. Current Agent Configuration
```typescript
// shared/constants/agentConfig.ts
export const ELEVENLABS_AGENTS = {
  ADDRESS_FINDER: {
    id: "agent_01jydc3p56er8tn495y66hybmn",  // ❌ INVALID - returns 404
    name: "AddressFinder",
    tools: AGENT_TOOL_MATRIX.ADDRESS_FINDER,  // 13 tools
  },
  ADDRESS_FINDER_TEST: {
    id: "agent_01jzvft1wjfr49ghzgswxcrhwr",  // ✅ VALID - syncs OK
    name: "AddressFinder-Test",
    tools: AGENT_TOOL_MATRIX.ADDRESS_FINDER_TEST,  // 14 tools
  },
  CONVERSATION_ASSISTANT: {
    id: "agent_01jwsxt8vseg6933dfd2jb4vkd",  // ✅ VALID - syncs OK
    name: "ConversationAssistant",
    tools: AGENT_TOOL_MATRIX.CONVERSATION_ASSISTANT,  // 7 tools
  },
};
```

---

## Recommended Resolution Path

### Option A: Discover Existing Agent (Preferred)
Use the ElevenLabs CLI to list all agents and find if ADDRESS_FINDER exists with a different ID.

```bash
# 1. Install ElevenLabs CLI
npm install -g @elevenlabs/cli

# 2. Authenticate
elevenlabs auth login
# Enter your API key when prompted

# 3. List all agents
elevenlabs agents list
# This will show all agents with their IDs

# 4. If ADDRESS_FINDER exists with different ID:
# Update shared/constants/agentConfig.ts line 67 with correct ID

# 5. Re-run sync
npx tsx scripts/4-multi-agent-sync.ts
```

### Option B: Create New Agent
If ADDRESS_FINDER no longer exists, create a new one.

**Using CLI:**
```bash
elevenlabs agents add "AddressFinder" --template assistant
# Note the returned agent_id
# Update agentConfig.ts with new ID
# Run sync to configure it
```

**Using API directly:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/convai/agents/create" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_config": {
      "agent": {
        "prompt": {
          "prompt": "You are an intelligent address finder assistant."
        },
        "first_message": "Hello! How can I help you find an address today?"
      }
    }
  }'
# Returns: {"agent_id": "agent_01..."}
```

### Option C: Use ADDRESS_FINDER_TEST as Production
Since ADDRESS_FINDER_TEST works and has a superset of tools (14 vs 13), temporarily use it:

```typescript
// In code that references ADDRESS_FINDER:
const agentId = ELEVENLABS_AGENTS.ADDRESS_FINDER_TEST.id;
```

---

## Files to Update

Once you have the correct agent ID:

### 1. `shared/constants/agentConfig.ts`
```typescript
ADDRESS_FINDER: {
  id: "agent_01XXXXXXXXXXXXXXXXXXXXXX",  // ← Replace with valid ID
  name: "AddressFinder",
  // ... rest unchanged
},
```

### 2. Environment Variables (if applicable)
Check if `VITE_ELEVENLABS_ADDRESS_AGENT_ID` is used anywhere and update `.env.local`.

---

## Verification Steps

After updating the agent ID:

```bash
# 1. Dry run to verify configuration
npx tsx scripts/4-multi-agent-sync.ts --dry-run

# 2. Live sync
npx tsx scripts/4-multi-agent-sync.ts

# 3. Expected output:
# ✅ AddressFinder synced successfully!
# ✅ AddressFinder-Test synced successfully!
# ✅ ConversationAssistant synced successfully!
```

---

## Architecture Reference

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT SYNC ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ai/tools.config.ts                                         │
│  └── toolDefinitions (Zod schemas)                          │
│         │                                                   │
│         ▼                                                   │
│  shared/constants/agentConfig.ts                            │
│  └── AGENT_TOOL_MATRIX (tool assignments per agent)         │
│  └── ELEVENLABS_AGENTS (agent IDs & metadata)               │
│         │                                                   │
│         ▼                                                   │
│  scripts/4-multi-agent-sync.ts                              │
│  └── Reads tool definitions + matrix                        │
│  └── Generates prompts from ai/address-finder/*.txt         │
│  └── Converts Zod → JSON Schema                             │
│  └── PATCH to ElevenLabs API                                │
│         │                                                   │
│         ▼                                                   │
│  ElevenLabs Platform                                        │
│  └── agent_01jydc... (ADDRESS_FINDER) ❌ NOT FOUND          │
│  └── agent_01jzvft... (ADDRESS_FINDER_TEST) ✅              │
│  └── agent_01jwsxt... (CONVERSATION_ASSISTANT) ✅           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

| Task | Status | Action Required |
|------|--------|-----------------|
| Tool matrix consolidation | ✅ Done | None |
| Context variable docs | ✅ Done | None |
| Prompt modernization | ✅ Done | None |
| Legacy tools removal | ✅ Done | None |
| ADDRESS_FINDER sync | ❌ Failed | Get valid agent ID |
| ADDRESS_FINDER_TEST sync | ✅ Working | None |
| CONVERSATION_ASSISTANT sync | ✅ Working | None |

**Next Step**: Run `elevenlabs agents list` to discover the correct ADDRESS_FINDER agent ID, or create a new agent if it was deleted.
