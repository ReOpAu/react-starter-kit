# INTERNAL: AI Coding Agent Convex Conversation Rules

> **For AI Coding Agent use only. Not for general developer onboarding.**

## 1. Two Paths to the Database

- **User Path:**
  - User interacts with React UI (forms, buttons, etc.)
  - UI calls Convex mutations directly (e.g., `sendUserMessage`)
  - Mutations are defined in general-purpose files (e.g., `convex/messages.ts`)

- **Agent Path:**
  - ElevenLabs agent uses `clientTools` to call Convex mutations
  - Agent-facing mutations must be registered in a dedicated file (e.g., `convex/agentTools.ts`)
  - Only expose minimal, whitelisted actions to the agent

## 2. Schema Requirements

- Required tables:
  - `conversations` (or `channels`): stores conversation metadata
  - `messages`: stores individual messages, linked to conversations
  - (Optional) `users`: stores user metadata
- All tables must use strict field validators
- Indexes must be defined for efficient querying (e.g., `by_conversation` on `messages`)

## 3. Mutation Registration

- **User mutations:**
  - Registered in general-purpose files
  - Can use full range of Convex DB operations

- **Agent mutations:**
  - Must be registered in `convex/agentTools.ts` (or `convex/agent/` directory)
  - Must use strict argument and return validators
  - Must not allow arbitrary `patch`, `replace`, or `delete` operations
  - Must include a comment describing the intent and scope
  - Must be cross-referenced in the ElevenLabs `clientTools` registration

## 4. ClientTools Integration

- When adding a new agent tool:
  1. Define the Convex mutation in `convex/agentTools.ts`
  2. Register the tool in the ElevenLabs `clientTools` object
  3. Document the tool's parameters and expected behavior in the agent config
  4. Ensure the tool only exposes the minimal required functionality

## 5. Security & Auditing

- Never expose broad or unsafe mutations to the agent
- All agent-facing mutations must be easily auditable (single file or directory)
- All agent-facing mutations must use strict validators
- All agent-facing mutations must be documented with intent and scope

---

**The AI Coding Agent must always follow these rules when implementing or updating Convex conversational features.** 