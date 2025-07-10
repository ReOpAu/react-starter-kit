import { useCallback, useRef } from "react";

/**
 * Custom hook for managing address finder session tokens
 * Handles session token generation, retrieval, and cleanup
 */
export function useAddressSession() {
	const sessionTokenRef = useRef<string | null>(null);

	// Logging utility - simplified to avoid circular dependencies
	const log = useCallback((...args: unknown[]) => {
		// Simple logging without store dependency to avoid circular imports
		console.log("[useAddressSession]", ...args);
	}, []);

	const getSessionToken = useCallback(() => {
		if (!sessionTokenRef.current) {
			sessionTokenRef.current = crypto.randomUUID();
			log("Generated new session token:", sessionTokenRef.current);
		}
		return sessionTokenRef.current;
	}, [log]);

	const clearSessionToken = useCallback(() => {
		if (sessionTokenRef.current) {
			log("Clearing session token:", sessionTokenRef.current);
			sessionTokenRef.current = null;
		}
	}, [log]);

	const getCurrentSessionToken = useCallback(() => {
		return sessionTokenRef.current;
	}, []);

	return {
		getSessionToken,
		clearSessionToken,
		getCurrentSessionToken,
	};
}