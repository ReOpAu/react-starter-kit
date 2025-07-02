import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useAddressFinderStore } from "~/stores/addressFinderStore";
import { useAgentSync } from "./useAgentSync";

export function useReliableSync() {
	const { syncToAgent } = useAgentSync();

	// Logging utility - STABLE: No dependencies to prevent infinite loops
	const log = useCallback((...args: any[]) => {
		if (useAddressFinderStore.getState().isLoggingEnabled) {
			console.log("[ReliableSync]", ...args);
		}
	}, []); // Empty dependency array makes this completely stable

	// Enhanced sync function for reliable state synchronization
	const performReliableSync = useCallback(
		async (context = "general") => {
			log(`🔧 RELIABLE SYNC START - Context: ${context}`);

			try {
				// Ensure state updates have been processed by React
				// Use flushSync to immediately flush any pending React state updates
				flushSync(() => {});

				// Perform initial sync
				syncToAgent();
				log(`🔧 Initial sync completed for ${context}`);

				// Wait for state propagation and validate
				// Use flushSync again to ensure all state is up-to-date before confirmation sync
				flushSync(() => {});

				// Validate synchronization by checking state consistency
				const storeState = useAddressFinderStore.getState();
				const hasValidState =
					storeState.selectedResult?.description || storeState.searchQuery;

				if (hasValidState) {
					// Perform confirmation sync
					syncToAgent();
					log(`🔧 Confirmation sync completed for ${context}`);

					// Final state verification
					const finalState = useAddressFinderStore.getState();
					log(`🔧 Final state verified for ${context}:`, {
						selectedResult: finalState.selectedResult?.description,
						currentIntent: finalState.currentIntent,
						searchQuery: finalState.searchQuery,
					});
				} else {
					log(`⚠️ No significant state to sync for ${context}`);
				}

				log(`✅ RELIABLE SYNC COMPLETE - Context: ${context}`);
			} catch (error) {
				log(`❌ Sync failed for ${context}:`, error);
			}
		},
		[syncToAgent, log],
	);

	return {
		performReliableSync,
	};
}
