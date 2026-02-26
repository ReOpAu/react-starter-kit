# Alpha Release Preparation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the React starter kit for alpha release by fixing security issues, removing debug artifacts, cleaning production code, and adding essential SEO/deployment infrastructure.

**Architecture:** The app is a React Router v7 SSR app backed by Convex (serverless DB), Clerk (auth), and Polar.sh (payments). Changes are mostly config/cleanup - no new features, no architectural changes. We touch routes, env files, gitignore, static assets, Convex backend utils, and listing form components.

**Tech Stack:** React Router v7, Convex, Clerk, TailwindCSS, Biome (linter), Vercel deployment

---

## Phase 1: Critical Security Fixes

### Task 1: Remove exposed API keys from tracked .env file

**Files:**
- Modify: `.env` (remove secrets)
- Modify: `.gitignore` (add .env)

**Step 1: Add .env to .gitignore**

Add `.env` to the gitignore so it stops being tracked:

```gitignore
.DS_Store
/node_modules/

# React Router
/.react-router/
/build/

# Environment files - never commit secrets
.env
.env.local
.env.production
.env.*.local
```

**Step 2: Remove .env from git tracking (without deleting local file)**

Run: `git rm --cached .env`
Expected: `.env` removed from index, local file preserved

**Step 3: Verify .env is now untracked**

Run: `git status`
Expected: `.env` appears as untracked (not staged), `.gitignore` shows as modified

**Step 4: Commit the gitignore fix**

```bash
git add .gitignore
git commit -m "security: stop tracking .env file, add all env patterns to gitignore"
```

> **Post-release action (manual):** Regenerate the exposed Google Maps / Gemini API keys in Google Cloud Console since they exist in git history. Consider using `git filter-branch` or BFG Repo-Cleaner to scrub history if this repo will be public.

---

### Task 2: Harden auth utility - remove debug logging and tighten bypass

**Files:**
- Modify: `convex/utils/auth.ts`

**Step 1: Rewrite auth.ts to remove debug logging**

Replace the entire file with a production-safe version:

```typescript
import type { ActionCtx, MutationCtx } from "../_generated/server";

export async function checkAuth(ctx: MutationCtx | ActionCtx) {
	if (process.env.DISABLE_AUTH_FOR_MUTATIONS === "true") {
		return {
			identity: null,
			user: null,
		};
	}

	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Not authenticated");
	}

	return { identity };
}
```

Key changes:
- Removed `console.log("DISABLE_AUTH_FOR_MUTATIONS:", ...)` - leaks env config
- Removed `console.log("All env vars:", ...)` - leaks all env var names
- Removed `console.warn(...)` - unnecessary noise
- Kept the bypass flag (needed for local dev) but silent

**Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add convex/utils/auth.ts
git commit -m "security: remove debug logging from auth utility"
```

---

### Task 3: Remove debug/test routes from production

**Files:**
- Modify: `app/routes.ts`

**Step 1: Comment out or remove debug routes**

Remove these three lines from `app/routes.ts`:

```typescript
// REMOVE these lines:
route("test-aldi", "routes/test-aldi.tsx"),
route("address-validation-tests", "routes/address-validation-tests.tsx"),
route("debug-listings", "routes/debug-listings.tsx"),
```

The route files themselves (`app/routes/test-aldi.tsx`, `app/routes/address-validation-tests.tsx`, `app/routes/debug-listings.tsx`) can stay in the codebase for development - they just won't be routable in production.

The final routes.ts should look like:

```typescript
import {
	type RouteConfig,
	index,
	layout,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("sign-in/*", "routes/sign-in.tsx"),
	route("sign-up/*", "routes/sign-up.tsx"),
	route("pricing", "routes/pricing.tsx"),
	route("success", "routes/success.tsx"),
	route("subscription-required", "routes/subscription-required.tsx"),
	route("about", "routes/about.tsx"),
	route("address-finder", "routes/address-finder.tsx"),
	route("address-finder-cartesia", "routes/address-finder-cartesia.tsx"),
	route("blog", "routes/blog/index.tsx"),
	route("blog/:slug", "routes/blog/$slug.tsx"),
	route("listings", "routes/listings/index.tsx"),
	route("listings/my-listings", "routes/listings/my-listings.tsx"),
	route("listings/create", "routes/listings/create.tsx"),
	route("listings/:state", "routes/listings/$state.tsx"),
	route("listings/:state/:type", "routes/listings/$state.$type.tsx"),
	route(
		"listings/:state/:type/:suburb",
		"routes/listings/$state.$type.$suburb.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id",
		"routes/listings/$state.$type.$suburb.$id.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id/edit",
		"routes/listings/$state.$type.$suburb.$id/edit.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id/matches",
		"routes/listings/$state.$type.$suburb.$id/matches.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id/matches/:matchId",
		"routes/listings/$state.$type.$suburb.$id/matches/$matchId.tsx",
	),
	route("admin", "routes/admin/index.tsx"),
	route("admin/listings", "routes/admin/listings/index.tsx"),
	route("admin/listings/create", "routes/admin/listings/create.tsx"),
	route("admin/listings/edit/:id", "routes/admin/listings/edit/$id.tsx"),
	layout("routes/dashboard/layout.tsx", [
		route("dashboard", "routes/dashboard/index.tsx"),
		route("dashboard/chat", "routes/dashboard/chat.tsx"),
		route("dashboard/settings", "routes/dashboard/settings.tsx"),
	]),
] satisfies RouteConfig;
```

**Step 2: Verify the build succeeds**

Run: `npm run build`
Expected: Build completes without errors

**Step 3: Commit**

```bash
git add app/routes.ts
git commit -m "chore: remove debug/test routes from production routing"
```

---

## Phase 2: Code Quality Cleanup

### Task 4: Fix hardcoded geohash "temp" in listing forms

**Files:**
- Modify: `app/features/listings/components/forms/CreateSellerListingForm.tsx:130`
- Modify: `app/features/listings/components/forms/CreateBuyerListingForm.tsx:128`
- Modify: `app/features/listings/components/forms/CreateListingFormRHF.tsx:181`
- Modify: `app/features/listings/components/forms/CreateListingFormSimple.tsx:125-126`
- Reference: `ngeohash` package already in dependencies (`package.json:64`)

**Step 1: Verify ngeohash is available**

Run: `ls node_modules/ngeohash/main.js`
Expected: File exists (package is already a dependency)

**Step 2: Fix CreateSellerListingForm.tsx**

At line ~130, replace:

```typescript
geohash: "temp", // TODO: Generate proper geohash
```

with:

```typescript
geohash: ngeohash.encode(formData.latitude, formData.longitude, 7),
```

Add import at top of file:

```typescript
import ngeohash from "ngeohash";
```

Precision 7 gives ~153m accuracy - appropriate for property listings.

**Step 3: Fix CreateBuyerListingForm.tsx**

Same pattern at line ~128. Replace:

```typescript
geohash: "temp", // TODO: Generate proper geohash
```

with:

```typescript
geohash: ngeohash.encode(formData.latitude, formData.longitude, 7),
```

Add same `ngeohash` import.

**Step 4: Fix CreateListingFormRHF.tsx**

At line ~181, replace:

```typescript
geohash: "temp", // Would calculate based on lat/lng
```

with:

```typescript
geohash: ngeohash.encode(values.latitude, values.longitude, 7),
```

Add same `ngeohash` import.

**Step 5: Fix CreateListingFormSimple.tsx**

At lines ~125-126, replace:

```typescript
userId: user?.id || ("dev-user" as any), // Fallback for development
geohash: "temp", // Would calculate based on lat/lng
```

with:

```typescript
userId: user?.id ?? ("" as any),
geohash: ngeohash.encode(values.latitude, values.longitude, 7),
```

Add same `ngeohash` import. The empty string fallback will fail validation server-side (better than silently creating orphaned records).

**Step 6: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add app/features/listings/components/forms/CreateSellerListingForm.tsx \
       app/features/listings/components/forms/CreateBuyerListingForm.tsx \
       app/features/listings/components/forms/CreateListingFormRHF.tsx \
       app/features/listings/components/forms/CreateListingFormSimple.tsx
git commit -m "fix: generate real geohash values in listing creation forms"
```

---

### Task 5: Clean up console.log statements in Convex backend

**Files:**
- Modify: `convex/listings.ts` (remove ~12 console.log calls)
- Modify: `convex/address/getNearbyAldiStores.ts` (remove ~7 console.log calls)
- Modify: `convex/address/getPlaceDetails.ts` (remove debug logs, keep error logs)
- Modify: `convex/address/getPlacePhotos.ts` (remove debug logs, keep error logs)
- Modify: `convex/subscriptions.ts` (remove checkout debug log)
- Modify: `convex/http.ts` (remove `console.log("HTTP routes configured")` and text debug log)

**Guiding principle:** Remove all `console.log()` and `console.debug()`. Keep `console.error()` for genuine errors. Remove `console.warn()` unless it warns about a real production concern.

**Step 1: Clean convex/listings.ts**

Remove all `console.log` calls (lines ~38, 40, 60, 61, 64, 100, 115, 127, 128, 135, 147). These are CRUD debug logs that leak data structure details.

**Step 2: Clean convex/address/getNearbyAldiStores.ts**

Remove all `console.log` calls (lines ~21, 42, 58, 62, 70, 77). These are API request/response debug logs.

**Step 3: Clean convex/address/getPlaceDetails.ts**

Remove `console.log` at ~130. Keep `console.error` calls (they handle real API failures).

**Step 4: Clean convex/address/getPlacePhotos.ts**

Remove `console.log` calls at ~138, 157, 216. Keep `console.error` at ~227.

**Step 5: Clean convex/subscriptions.ts**

Remove `console.log` at ~58 (checkout debug). Change `console.log` at ~443 (`Unhandled event type`) to `console.warn` (this is a genuine warning worth keeping).

**Step 6: Clean convex/http.ts**

Remove `console.log("HTTP routes configured")` at ~292. Remove `console.log(text)` at ~173. Keep `console.error` calls.

**Step 7: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add convex/listings.ts convex/address/getNearbyAldiStores.ts \
       convex/address/getPlaceDetails.ts convex/address/getPlacePhotos.ts \
       convex/subscriptions.ts convex/http.ts
git commit -m "chore: remove debug console.log statements from Convex backend"
```

---

### Task 6: Clean up console.log statements in frontend app code

**Files:**
- Modify: `app/components/conversation/index.tsx` (remove ~8 console.log calls)
- Modify: `app/hooks/useVelocityIntentClassification.ts` (remove emoji debug logs)
- Modify: `app/elevenlabs/utils/toolValidation.ts` (remove debug log)
- Modify: `app/elevenlabs/utils/agentTransfer.ts` (remove debug log)
- Modify: `app/hooks/actions/enrichmentUtils.ts` (remove debug log)
- Modify: `app/elevenlabs/hooks/useConversationManager.ts` (remove raw transcription debug)
- Modify: `app/features/listings/components/NearbyPlacesTabs.tsx` (remove fetch debug)

**Guiding principle:** Same as Task 5. Remove `console.log`. Keep `console.error`. Keep `console.warn` only for genuine warnings. Leave gated debug logs (those behind `enableLogging` checks in AddressSearchService) alone - they're already production-safe.

**Step 1: Clean app/components/conversation/index.tsx**

Replace connection/message debug logs with no-ops:

```typescript
onConnect: () => {},
onDisconnect: () => {},
```

Remove the `console.log` calls in `onMessage`, `onUserMessage`, `onTranscription`, and `startSession` handlers.

**Step 2: Clean app/hooks/useVelocityIntentClassification.ts**

Remove emoji debug logs at ~534 and ~594.

**Step 3: Clean app/elevenlabs/utils/toolValidation.ts**

Remove `console.log` at ~230.

**Step 4: Clean app/elevenlabs/utils/agentTransfer.ts**

Remove `console.log` at ~159.

**Step 5: Clean app/hooks/actions/enrichmentUtils.ts**

Remove `console.log` at ~20. Keep `console.warn` calls (they warn about missing data).

**Step 6: Clean app/elevenlabs/hooks/useConversationManager.ts**

Remove `console.log` at ~48 (raw transcription event dump).

**Step 7: Clean app/features/listings/components/NearbyPlacesTabs.tsx**

Remove `console.log` at ~132.

**Step 8: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

**Step 9: Commit**

```bash
git add app/components/conversation/index.tsx \
       app/hooks/useVelocityIntentClassification.ts \
       app/elevenlabs/utils/toolValidation.ts \
       app/elevenlabs/utils/agentTransfer.ts \
       app/hooks/actions/enrichmentUtils.ts \
       app/elevenlabs/hooks/useConversationManager.ts \
       app/features/listings/components/NearbyPlacesTabs.tsx
git commit -m "chore: remove debug console.log statements from frontend code"
```

---

## Phase 3: Deployment & SEO Infrastructure

### Task 7: Add robots.txt and basic sitemap.xml

**Files:**
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`

**Step 1: Create robots.txt**

```
User-agent: *
Allow: /

# Disallow internal/auth pages
Disallow: /dashboard/
Disallow: /admin/
Disallow: /sign-in/
Disallow: /sign-up/
Disallow: /success
Disallow: /subscription-required

Sitemap: https://www.reopmain.com.au/sitemap.xml
```

> **Note:** Update the domain once finalized. This is a placeholder.

**Step 2: Create sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.reopmain.com.au/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.reopmain.com.au/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://www.reopmain.com.au/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://www.reopmain.com.au/listings</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://www.reopmain.com.au/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

**Step 3: Commit**

```bash
git add public/robots.txt public/sitemap.xml
git commit -m "seo: add robots.txt and sitemap.xml"
```

---

### Task 8: Add per-route meta tags to key public pages

**Files:**
- Modify: `app/routes/home.tsx` (add meta export)
- Modify: `app/routes/pricing.tsx` (add meta export)
- Modify: `app/routes/about.tsx` (add meta export)
- Modify: `app/routes/listings/index.tsx` (add meta export)

React Router v7 supports a `meta` export on each route. Each route module can export a `meta` function.

**Step 1: Add meta to home.tsx**

Add this export to the home route file:

```typescript
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = () => [
	{ title: "REOP Main - Australian Real Estate Marketplace" },
	{
		name: "description",
		content:
			"Find and list properties across Australia. AI-powered address search, buyer-seller matching, and real-time listings.",
	},
	{ property: "og:title", content: "REOP Main - Australian Real Estate Marketplace" },
	{
		property: "og:description",
		content:
			"Find and list properties across Australia. AI-powered address search, buyer-seller matching, and real-time listings.",
	},
	{ property: "og:type", content: "website" },
];
```

**Step 2: Add meta to pricing.tsx**

```typescript
export const meta: Route.MetaFunction = () => [
	{ title: "Pricing - REOP Main" },
	{
		name: "description",
		content: "Simple, transparent pricing for REOP Main. Choose the plan that fits your real estate needs.",
	},
];
```

**Step 3: Add meta to about.tsx**

```typescript
export const meta: Route.MetaFunction = () => [
	{ title: "About - REOP Main" },
	{
		name: "description",
		content: "Learn about REOP Main - an AI-powered Australian real estate marketplace.",
	},
];
```

**Step 4: Add meta to listings/index.tsx**

```typescript
export const meta: Route.MetaFunction = () => [
	{ title: "Property Listings - REOP Main" },
	{
		name: "description",
		content: "Browse property listings across Australia. Filter by state, type, and suburb.",
	},
];
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add app/routes/home.tsx app/routes/pricing.tsx \
       app/routes/about.tsx app/routes/listings/index.tsx
git commit -m "seo: add meta tags to key public-facing routes"
```

---

### Task 9: Improve .env.example with all required variables

**Files:**
- Modify: `.env.example`

**Step 1: Rewrite .env.example to be comprehensive**

```bash
# ===========================================
# REOP Main - Environment Variables
# ===========================================
# Copy this file to .env.local and fill in values
# NEVER commit .env.local to git

# --- Convex ---
CONVEX_DEPLOYMENT=
VITE_CONVEX_URL=
VITE_CONVEX_SITE_URL=

# --- Clerk Authentication ---
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# --- Polar.sh Payments ---
POLAR_ACCESS_TOKEN=
POLAR_ORGANIZATION_ID=
POLAR_WEBHOOK_SECRET=

# --- OpenAI ---
OPENAI_API_KEY=

# --- Google Maps ---
GOOGLE_MAPS_API_KEY=
VITE_GOOGLE_MAPS_API_KEY=

# --- ElevenLabs Voice AI ---
ELEVENLABS_API_KEY=
VITE_ELEVENLABS_API_KEY=
VITE_ELEVENLABS_ADDRESS_AGENT_ID=

# --- Cartesia Voice AI (optional) ---
CARTESIA_API_KEY=
VITE_CARTESIA_API_KEY=
VITE_CARTESIA_AGENT_ID=

# --- Mapbox ---
VITE_MAPBOX_ACCESS_TOKEN=

# --- App ---
FRONTEND_URL=http://localhost:5173

# --- Development Only (do NOT set in production) ---
# DISABLE_AUTH_FOR_MUTATIONS=true
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: comprehensive .env.example with all required variables"
```

---

### Task 10: Improve .dockerignore for production builds

**Files:**
- Modify: `.dockerignore`

**Step 1: Expand .dockerignore**

```
.react-router
build
node_modules
README.md

# Git
.git
.gitignore

# Environment files
.env
.env.local
.env.production
.env.*.local

# IDE
.vscode
.idea
*.swp
*.swo

# Claude/AI
.claude

# Development artifacts
docs/
prompts/
analyses/
scripts/
*.md
!README.md

# Vercel
.vercel
```

**Step 2: Commit**

```bash
git add .dockerignore
git commit -m "chore: expand .dockerignore for cleaner production builds"
```

---

## Phase 4: Production Polish

### Task 11: Style the root error boundary

**Files:**
- Modify: `app/root.tsx` (ErrorBoundary function, lines 103-130)

**Step 1: Replace ErrorBoundary with a branded version**

Replace the existing `ErrorBoundary` export:

```typescript
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
			<h1 className="text-6xl font-bold text-foreground">{message}</h1>
			<p className="mt-4 text-lg text-muted-foreground">{details}</p>
			<a
				href="/"
				className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Go home
			</a>
			{stack && (
				<pre className="mt-8 w-full max-w-2xl overflow-x-auto rounded-md bg-muted p-4 text-left text-xs">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: PASS

**Step 3: Commit**

```bash
git add app/root.tsx
git commit -m "ui: style root error boundary with branded layout and navigation"
```

---

### Task 12: Run Biome lint/format check and fix

**Step 1: Run Biome check**

Run: `npx @biomejs/biome check --fix app/ convex/`
Expected: Auto-fixes formatting issues. Note any remaining errors.

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Run build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: biome lint and format fixes for alpha release"
```

---

### Task 13: Final build validation

**Step 1: Clean build**

Run: `rm -rf build .react-router && npm run build`
Expected: Clean production build completes

**Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS with no errors

**Step 3: Biome check (no auto-fix)**

Run: `npx @biomejs/biome check app/ convex/`
Expected: No errors or warnings

**Step 4: Verify no secrets in tracked files**

Run: `git diff --cached --name-only | head -20` and `git status`
Expected: No .env or .env.local in tracked files

**Step 5: Tag the alpha release**

```bash
git tag -a v0.1.0-alpha -m "Alpha release: REOP Main React Starter Kit"
```

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1: Security | Tasks 1-3 | Remove exposed keys, harden auth, remove debug routes |
| 2: Code Quality | Tasks 4-6 | Fix geohash, clean console.log (backend + frontend) |
| 3: Deployment/SEO | Tasks 7-10 | robots.txt, meta tags, env docs, dockerignore |
| 4: Polish | Tasks 11-13 | Error boundary styling, lint, final validation |

**Total estimated tasks:** 13
**Key constraint:** No new features - cleanup and hardening only
