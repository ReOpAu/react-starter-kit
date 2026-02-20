/**
 * ElevenLabs Agent Context Variables
 *
 * These variables are injected into agent prompts at runtime by the ElevenLabs platform.
 * They are referenced using double-brace syntax: {{variableName}}
 *
 * This file documents the contract between the client application and the AI agent.
 */

/**
 * Context variable definitions with their types, sources, and update triggers
 */
export const CONTEXT_VARIABLES = {
	/**
	 * Whether voice recording is currently active
	 * @source Client VAD (Voice Activity Detection)
	 * @updates When user starts/stops speaking
	 */
	isRecording: {
		type: "boolean",
		description: "Whether voice recording is currently active",
		source: "Client VAD",
		example: "true",
	},

	/**
	 * Whether there are search results available
	 * @source React Query cache state
	 * @updates After searchAddress completes or results are cleared
	 */
	hasResults: {
		type: "boolean",
		description: "Whether search results are available for display",
		source: "React Query cache",
		example: "true",
	},

	/**
	 * Number of search results currently available
	 * @source React Query cache
	 * @updates After searchAddress completes
	 */
	searchResultsCount: {
		type: "number",
		description: "Count of available search suggestions",
		source: "React Query cache",
		example: "5",
	},

	/**
	 * The most recent search query executed by the agent
	 * @source useAddressFinderStore
	 * @updates When searchAddress is called
	 * @critical Used to validate selection context is not stale
	 */
	agentLastSearchQuery: {
		type: "string | null",
		description:
			"The query that produced current results (null if no search performed)",
		source: "useAddressFinderStore.agentLastSearchQuery",
		example: '"Richmond VIC"',
		critical: true,
	},

	/**
	 * The currently selected/confirmed place
	 * @source useAddressFinderStore.selectedSuggestion
	 * @updates When selectSuggestion or selectByOrdinal succeeds
	 * @critical Primary indicator that selection workflow is complete
	 */
	selectedResult: {
		type: "PlaceSuggestion | null",
		description:
			"The confirmed place selection (null if nothing selected)",
		source: "useAddressFinderStore.selectedSuggestion",
		example:
			'{ placeId: "ChIJ...", description: "Richmond VIC 3121, Australia" }',
		critical: true,
	},

	/**
	 * Inferred intent classification for the current search
	 * @source Intent classifier in searchAddress
	 * @updates After searchAddress analyzes the query
	 */
	currentIntent: {
		type: '"suburb" | "street" | "address" | "general"',
		description: "Classified intent of the current search query",
		source: "Intent classifier",
		example: '"suburb"',
	},

	/**
	 * Source of the current search (how it was initiated)
	 * @source useAddressFinderStore
	 * @updates When a search is triggered
	 */
	activeSearchSource: {
		type: '"manual" | "voice" | "autocomplete"',
		description: "How the current search was initiated",
		source: "useAddressFinderStore.activeSearchSource",
		example: '"voice"',
	},

	/**
	 * Whether the agent has acknowledged the current selection to the user
	 * @source useAddressFinderStore.selectionAcknowledged
	 * @updates When setSelectionAcknowledged is called
	 * @critical UI waits for this before clearing suggestions
	 */
	selectionAcknowledged: {
		type: "boolean",
		description:
			"Whether agent has verbally confirmed the selection to user",
		source: "useAddressFinderStore.selectionAcknowledged",
		example: "true",
		critical: true,
	},

	/**
	 * Current place suggestions for display (legacy, use getSuggestions tool instead)
	 * @source React Query cache
	 * @deprecated Use getSuggestions() tool for current suggestions
	 */
	placeSuggestions: {
		type: "PlaceSuggestion[]",
		description: "Array of place suggestions (deprecated - use getSuggestions tool)",
		source: "React Query cache",
		deprecated: true,
	},
} as const;

/**
 * Type for context variable names
 */
export type ContextVariableName = keyof typeof CONTEXT_VARIABLES;

/**
 * Critical variables that must be checked before key operations
 */
export const CRITICAL_VARIABLES: ContextVariableName[] = [
	"agentLastSearchQuery",
	"selectedResult",
	"selectionAcknowledged",
];

/**
 * Variable validation rules for agent prompts
 */
export const VALIDATION_RULES = {
	beforeSelection: {
		description: "Check before using selectSuggestion or selectByOrdinal",
		check: "{{agentLastSearchQuery}} is not null AND {{hasResults}} is true",
	},
	afterSelection: {
		description: "Check after a selection is made",
		check: "{{selectedResult}} is not null",
	},
	beforeClearingSuggestions: {
		description: "Check before UI clears the suggestions list",
		check: "{{selectionAcknowledged}} is true",
	},
	staleContext: {
		description: "Detect when selection context may be invalid",
		check: "{{agentLastSearchQuery}} does not match user's current intent",
	},
};

/**
 * Mapping of tools to the variables they update
 */
export const TOOL_VARIABLE_EFFECTS = {
	searchAddress: ["agentLastSearchQuery", "hasResults", "searchResultsCount", "currentIntent"],
	selectSuggestion: ["selectedResult"],
	selectByOrdinal: ["selectedResult"],
	setSelectionAcknowledged: ["selectionAcknowledged"],
	clearSelection: ["selectedResult", "agentLastSearchQuery", "hasResults", "selectionAcknowledged"],
	getSuggestions: [], // Read-only, no updates
	getCurrentState: [], // Read-only, no updates
} as const;
