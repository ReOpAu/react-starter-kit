# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev           # Start development server with HMR
npm run build         # Build for production
npm run start         # Start production server
npm run typecheck     # Run TypeScript checks and generate types
```

### Code Quality
```bash
npx @biomejs/biome check        # Run linting with Biome
npx @biomejs/biome check --fix  # Fix linting issues automatically
npx @biomejs/biome format       # Format code with Biome
```

### Convex Backend
```bash
npx convex dev        # Start Convex development server
npx convex deploy     # Deploy Convex functions to production
```

## Architecture Overview

### Tech Stack
- **Frontend**: React Router v7 with SSR enabled
- **Backend**: Convex (serverless functions and real-time database)
- **Auth**: Clerk for authentication and user management
- **Styling**: TailwindCSS v4 with shadcn/ui component library
- **State Management**: Zustand for UI state, React Query for server state
- **AI Integration**: OpenAI SDK with streaming chat capabilities
- **Payments**: Polar.sh for subscription management

### Key Architectural Patterns

#### Brain vs Widget Component Pattern
This codebase follows a strict separation between orchestration and interaction:

- **Brain Components** (`address-finder.tsx`, `dashboard/chat.tsx`): Orchestrate global state, handle agent sync, manage client tools
- **Widget Components** (`ManualSearchForm`, `AddressInput`): Self-contained UI components with minimal interfaces (≤3 props)
- **Display Components**: Pure presentation components with no state

**Critical Rule**: Only Brain components can import global stores or call `syncToAgent()`. Widgets communicate only through callbacks.

#### Information Flow Architecture
Only business-critical information flows to AI agents:
- ✅ **Sync to Agent**: User selections, intent changes, errors, completions
- ❌ **Never Sync**: Cosmetic states, animations, validation formatting, UI convenience

### Project Structure

```
app/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components (Radix + Tailwind)
│   ├── address-finder/ # Address finder widget components
│   ├── conversation/   # Chat interface components
│   └── dashboard/      # Dashboard-specific components
├── hooks/              # Custom React hooks
├── routes/             # React Router route components
├── stores/             # Zustand stores for UI state
└── utils/              # Utility functions

convex/
├── address/            # Address & location services (consolidated)
│   ├── getPlaceSuggestions.ts   # Place autocomplete with intent
│   ├── validateAddress.ts      # Google Address Validation
│   ├── getPlaceDetails.ts      # Place details with coordinates
│   └── index.ts               # Consolidated API exports
├── schemas/            # Database schema definitions
│   ├── searches.ts           # Search history tracking
│   ├── userPreferences.ts    # User settings
│   └── index.ts             # Schema registration
├── testing/            # Comprehensive test utilities (762 test cases)
└── agentTools.ts       # Agent-facing mutation registry
```

## Development Guidelines

### Component Development
1. **Always start with purpose**: Define what the component does in one sentence
2. **Widget components**: Must be self-contained with own API calls, loading states, and error handling
3. **Use shadcn/ui pattern**: Base components on Radix UI primitives styled with Tailwind
4. **Icons**: Use `lucide-react` for all icons

### State Management
- **React Query**: Single source of truth for server state
- **Zustand**: UI-specific state only
- **Never include state setters in useEffect dependencies**
- **Hybrid mode**: `requestManualInput()` must not stop conversation, only enable manual input

### Styling Rules
- **Tailwind CSS only**: No inline styles or CSS-in-JS
- **Use tailwind-merge and clsx for conditional classes**
- **Biome formatting**: Uses tabs (not spaces) and double quotes

### Convex Backend Rules
- **New function syntax**: Always use modern Convex function definitions
- **Strict validation**: Always use argument and return validators
- **Agent tools**: Register all agent-facing mutations in `convex/agentTools.ts`
- **File-based routing**: Organize functions by domain (e.g., `address/`, `suburb/`)
- **Never use ctx.db in actions**: Use `ctx.runQuery`/`ctx.runMutation` instead

### API Usage Patterns
- **Convex actions in subfolders**: Use double-nested exports (e.g., `api.address.getPlaceSuggestions.getPlaceSuggestions`)
- **Check generated types**: Always verify correct structure in `convex/_generated/api.d.ts`

### AI Integration
- **ElevenLabs**: Requires dual-configuration in both `convex/agentTools.ts` and client tools
- **OpenAI**: Use streaming responses with proper error handling
- **Tool registration**: Agent tools must match between Convex exports and client configuration

### Type Safety
- **TypeScript strict mode**: All type checking enabled
- **Path aliases**: Use `~/*` for app imports
- **Validate external data**: Always validate API responses and user inputs

## Environment Setup

### Required Environment Variables
```bash
# Convex Configuration
CONVEX_DEPLOYMENT=your_convex_deployment_here
VITE_CONVEX_URL=your_convex_url_here

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Polar.sh Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token_here
POLAR_ORGANIZATION_ID=your_polar_organization_id_here
POLAR_WEBHOOK_SECRET=your_polar_webhook_secret_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Application URL
FRONTEND_URL=http://localhost:5173
```

### Development Workflow
1. Run `npm install` to install dependencies
2. Set up environment variables in `.env.local`
3. Run `npx convex dev` to start Convex backend
4. Run `npm run dev` to start development server
5. Use `npm run typecheck` before committing changes

## Testing Strategy
- **Component Testing**: Focus on widget components with isolated testing
- **Integration Testing**: Test Brain components with mock agents
- **E2E Testing**: Critical user flows through the application

## Deployment
- **Vercel**: Uses `@vercel/react-router` preset for optimal deployment
- **Docker**: Dockerfile included for containerized deployment
- **Environment**: Production builds require all environment variables set

## Active Projects

### Address Finder Optimization Project (AFOP)
**Status**: ✅ **COMPLETED** - Major consolidation and cleanup finished
**Goal**: Optimize the existing address finder system for better maintainability, performance, and user experience.

#### ✅ **Completed Implementation**:
1. **Backend Consolidation** ✅ **COMPLETED**
   - ✅ Removed duplicate functions: `convex/suburbLookup.ts` (1,368 lines), `convex/addressFinder.ts` (156 lines), `convex/autocomplete.ts` (409 lines)
   - ✅ Eliminated `convex/suburb/*` directory and utilities (68 lines)
   - ✅ Standardized API patterns: All functions now use `api.address.*` structure
   - ✅ **Total cleanup**: 2,001 lines of duplicate code removed (58% reduction)

2. **Database Persistence Layer** ✅ **COMPLETED**
   - ✅ Added search history schema (`searches` table with user indexing)
   - ✅ Added user preferences schema (`userPreferences` table)
   - ✅ Schema properly registered in `convex/schemas/index.ts`
   - 🔄 **Next**: Implement mutations for `saveSearch`, `getUserSearchHistory`

3. **Frontend Component Architecture** ✅ **COMPLETED**
   - ✅ Clean `address-finder.tsx` with proper Brain/UI separation
   - ✅ `AddressFinderBrain.tsx` handles orchestration
   - ✅ `AddressFinderUI.tsx` handles presentation
   - ✅ Extracted specialized hooks: `useAddressRecall.ts`, `useAddressValidation.ts`
   - ✅ Maintains strict Brain/Widget architectural patterns

4. **Error Handling & Resilience** ✅ **COMPLETED**
   - ✅ Added automatic retry with exponential backoff (`app/utils/retryMechanism.ts`)
   - ✅ Implemented fallback search strategies in client tools
   - ✅ Enhanced error recovery for API calls and connection issues

5. **Additional Improvements** ✅ **COMPLETED**
   - ✅ Configurable VAD thresholds for ElevenLabs integration
   - ✅ Runtime validation for multi-agent transfer system
   - ✅ Comprehensive test coverage (762 validation test cases)
   - ✅ API naming conventions documented (`convex/NAMING_CONVENTIONS.md`)

#### 🔄 **Future Enhancements** (Optional):
- **Performance & Caching**: Multi-layer caching strategy for Google Places API
- **Analytics & Insights**: Search metrics tracking and dashboard at `/dashboard/address-analytics`

#### ✅ **Architecture Strengths Preserved**:
- Brain vs Widget component separation
- Intent classification system (suburb/street/address/general)
- ElevenLabs AI agent integration with client tools
- Hybrid mode functionality (voice + manual input)
- Australian-specific address validation

#### Key Files (Post-Cleanup):
- Frontend: `app/routes/address-finder.tsx`, `app/components/address-finder/*`
- Backend: `convex/address/*` (consolidated, 1,425 lines)
- Schemas: `convex/schemas/searches.ts`, `convex/schemas/userPreferences.ts`
- Testing: `convex/testing/*` (comprehensive validation test suite)

**Reference**: AFOP major cleanup completed. Address finder now has clean, maintainable architecture.

## Common Pitfalls to Avoid
1. **Don't** import global stores in widget components
2. **Don't** sync cosmetic state changes to AI agents
3. **Don't** use string paths for Convex API calls
4. **Don't** include state setters in useEffect dependencies
5. **Don't** stop conversations when requesting manual input (hybrid mode)
6. **Don't** use inline styles - always use Tailwind classes
7. **Don't** create components with >3 props - split into Brain/Widget pattern