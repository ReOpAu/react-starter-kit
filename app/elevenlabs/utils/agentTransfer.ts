/**
 * ElevenLabs Agent Transfer Utilities
 * Helper functions for agent-to-agent transfer logic
 */

import {
	getAgentByTransferIndex,
	getAvailableTransferTargets,
	recommendTransferAgent,
} from "@shared/constants/agentConfig";
import type { AgentKey, TransferTarget } from "../types/agentConfig";

/**
 * Validate transfer parameters
 */
export function validateTransferParams(params: {
	agent_number: number;
	reason?: string;
	transfer_message?: string;
	delay?: number;
}): { isValid: boolean; error?: string } {
	const { agent_number, delay } = params;

	if (typeof agent_number !== "number" || agent_number < 0) {
		return {
			isValid: false,
			error: "Invalid agent_number. Must be a non-negative number.",
		};
	}

	if (delay !== undefined && (typeof delay !== "number" || delay < 0)) {
		return {
			isValid: false,
			error: "Invalid delay. Must be a non-negative number of seconds.",
		};
	}

	return { isValid: true };
}

/**
 * Get transfer recommendations based on user request
 */
export function getTransferRecommendations(userRequest: string): {
	recommendedAgent: number | null;
	reason: string;
	confidence: number;
} {
	const request = userRequest.toLowerCase();

	// Nearby services pattern
	if (
		request.includes("restaurant") ||
		request.includes("cafe") ||
		request.includes("shop") ||
		request.includes("store") ||
		request.includes("nearby") ||
		request.includes("near")
	) {
		return {
			recommendedAgent: 1, // ADDRESS_FINDER_TEST with nearby services
			reason: "User request involves nearby services or places of interest",
			confidence: 0.9,
		};
	}

	// Enhanced location services
	if (
		request.includes("best") ||
		request.includes("recommend") ||
		request.includes("what are") ||
		request.includes("where can")
	) {
		return {
			recommendedAgent: 1, // ADDRESS_FINDER_TEST with enhanced capabilities
			reason: "User request requires enhanced location recommendations",
			confidence: 0.8,
		};
	}

	// Standard address validation
	if (
		request.includes("validate") ||
		request.includes("check") ||
		request.includes("verify") ||
		request.includes("address")
	) {
		return {
			recommendedAgent: 0, // ADDRESS_FINDER for standard validation
			reason: "Standard address validation request",
			confidence: 0.7,
		};
	}

	return {
		recommendedAgent: null,
		reason: "No clear transfer pattern identified",
		confidence: 0.0,
	};
}

/**
 * Format transfer message for user
 */
export function formatTransferMessage(
	targetAgentName: string,
	reason: string,
	customMessage?: string,
): string {
	if (customMessage) {
		return customMessage;
	}

	const messages = {
		nearby_services: `Connecting you to ${targetAgentName} for nearby services information`,
		enhanced_location: `Transferring to ${targetAgentName} for enhanced location assistance`,
		address_validation: `Connecting you to ${targetAgentName} for address validation`,
		default: `You are being transferred to ${targetAgentName} for specialized assistance`,
	};

	// Match reason to appropriate message
	if (reason.includes("nearby") || reason.includes("services")) {
		return messages.nearby_services;
	}
	if (reason.includes("enhanced") || reason.includes("recommendation")) {
		return messages.enhanced_location;
	}
	if (reason.includes("validation") || reason.includes("verify")) {
		return messages.address_validation;
	}

	return messages.default;
}

/**
 * Create transfer delay based on complexity
 */
export function calculateTransferDelay(reason: string): number {
	// Complex requests get longer delays for better UX
	if (reason.includes("nearby") || reason.includes("enhanced")) {
		return 2; // 2 seconds for complex transfers
	}

	return 1; // 1 second for standard transfers
}

/**
 * Log transfer attempt for debugging
 */
export function logTransferAttempt(params: {
	agent_number: number;
	reason?: string;
	targetAgent?: any;
	success: boolean;
	error?: string;
}): void {
	const { agent_number, reason, targetAgent, success, error } = params;

	// Debug logging removed for production cleanliness
}

/**
 * Get transfer context for logging and history
 */
export function getTransferContext(
	agentNumber: number,
	reason: string,
): {
	contextMessage: string;
	historyEntry: string;
} {
	const targetAgent = getAgentByTransferIndex(agentNumber);

	return {
		contextMessage: `Transfer initiated to Agent ${agentNumber} (${targetAgent?.name || "Unknown"})`,
		historyEntry: `🔄 Initiating transfer to ${targetAgent?.name || "Unknown"}: ${reason}`,
	};
}
