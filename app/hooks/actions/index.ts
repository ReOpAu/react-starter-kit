/**
 * Action modules for useActionHandler decomposition.
 *
 * This module exports factory functions that create focused action handlers.
 * Each factory takes a context object and returns the actions for that category.
 *
 * Usage:
 * ```typescript
 * const selectionActions = createSelectionActions(ctx, state);
 * const clearActions = createClearActions(ctx);
 * const ruralActions = createRuralActions(ctx, state);
 * ```
 */

// Types
export type {
	ActionContext,
	ActionInternalState,
	RuralConfirmationState,
	ValidationState,
} from "./types";
export { ENRICHMENT_CACHE_KEY } from "./types";

// Enrichment utilities
export {
	enrichSuggestion,
	isResultEnriched,
	logEnrichment,
} from "./enrichmentUtils";

// Action factories
export { createClearActions } from "./clearActions";
export { createRuralActions } from "./ruralActions";
export { createSelectionActions } from "./selectionActions";
