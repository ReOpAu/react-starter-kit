import { useCallback } from "react";
import { useAgentSync } from "./useAgentSync";

export function useReliableSync() {
	const { syncToAgent } = useAgentSync();

	// Sync current store state to the ElevenLabs agent.
	// Zustand stores are updated synchronously, so a single
	// getState() read inside syncToAgent is sufficient.
	const performReliableSync = useCallback(
		async (_context = "general") => {
			try {
				syncToAgent();
			} catch (error) {
				console.warn("[ReliableSync] Sync failed:", error);
			}
		},
		[syncToAgent],
	);

	return {
		performReliableSync,
	};
}
