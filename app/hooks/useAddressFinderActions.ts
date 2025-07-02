import { useCallback } from "react";
import { useApiStore } from "~/stores/apiStore";
// import { useUIStore } from '~/stores/uiStore'; // No longer resetting UI state here
import { useIntentStore } from "~/stores/intentStore";
// import { useHistoryStore } from '~/stores/historyStore'; // History is preserved

/**
 * Custom hook for complex actions that span multiple stores.
 * This centralizes cross-store logic, keeping individual stores simple.
 */
export function useAddressFinderActions() {
	// const { resetUiState } = useUIStore(); // Do not reset UI state on a simple clear
	const { resetIntentState } = useIntentStore();
	const { resetApiState } = useApiStore();
	// const { resetHistoryState } = useHistoryStore();

	/**
	 * Clears the user's current selection and search query, along with any
	 * related API results. It intentionally does NOT reset the UI state
	 * (like `isRecording`) to preserve the application's interaction mode.
	 */
	const clearSelectionAndSearch = useCallback(() => {
		// resetUiState(); // This is the problem
		resetIntentState();
		resetApiState();
	}, [resetIntentState, resetApiState]);

	return { clearSelectionAndSearch };
}
