/**
 * ElevenLabs Tool Parameter Validation Utilities
 * Centralized validation logic for client tool parameters
 */

import type { ToolResponse, ToolResponseStatus } from "../types/clientTools";

/**
 * Validate placeId parameter (used by selectSuggestion and related tools)
 */
export function validatePlaceId(params: unknown): {
	isValid: boolean;
	placeId?: string;
	error?: string;
} {
	let placeId: string | undefined;

	if (typeof params === "string") {
		placeId = params;
	} else if (params && typeof params === "object") {
		const paramObj = params as Record<string, unknown>;
		placeId = (paramObj.placeId || paramObj.place_id) as string | undefined;
	}

	if (typeof placeId !== "string" || !placeId.trim()) {
		return {
			isValid: false,
			error: "Invalid or missing 'placeId' or 'place_id' parameter.",
		};
	}

	return {
		isValid: true,
		placeId: placeId.trim(),
	};
}

/**
 * Validate search query parameter
 */
export function validateSearchQuery(params: { query?: string }): {
	isValid: boolean;
	query?: string;
	error?: string;
} {
	const { query } = params;

	if (typeof query !== "string" || !query.trim()) {
		return {
			isValid: false,
			error: "Invalid or missing 'query' parameter.",
		};
	}

	return {
		isValid: true,
		query: query.trim(),
	};
}

/**
 * Validate ordinal parameter (for selectByOrdinal tool)
 */
export function validateOrdinal(params: { ordinal?: string }): {
	isValid: boolean;
	ordinal?: string;
	normalizedOrdinal?: string;
	error?: string;
} {
	const { ordinal } = params;

	if (typeof ordinal !== "string" || !ordinal.trim()) {
		return {
			isValid: false,
			error: "Invalid or missing 'ordinal' parameter.",
		};
	}

	const trimmed = ordinal.trim().toLowerCase();

	// Validate and normalize ordinal values
	const validOrdinals = {
		"1": "first",
		first: "first",
		"1st": "first",
		"2": "second",
		second: "second",
		"2nd": "second",
		"3": "third",
		third: "third",
		"3rd": "third",
		"4": "fourth",
		fourth: "fourth",
		"4th": "fourth",
		"5": "fifth",
		fifth: "fifth",
		"5th": "fifth",
	};

	const normalized = validOrdinals[trimmed as keyof typeof validOrdinals];

	if (!normalized) {
		return {
			isValid: false,
			error: `Invalid ordinal '${ordinal}'. Must be 'first', 'second', 'third', '1', '2', '3', etc.`,
		};
	}

	return {
		isValid: true,
		ordinal: trimmed,
		normalizedOrdinal: normalized,
	};
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
	error: string,
	status: ToolResponseStatus = "error",
): string {
	const response: ToolResponse = {
		status,
		error,
		timestamp: Date.now(),
	};

	return JSON.stringify(response);
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
	data: Partial<ToolResponse>,
	status: ToolResponseStatus = "success",
): string {
	const response: ToolResponse = {
		status,
		timestamp: Date.now(),
		...data,
	};

	return JSON.stringify(response);
}

/**
 * Validate required parameters exist
 */
export function validateRequiredParams<T extends Record<string, unknown>>(
	params: unknown,
	requiredFields: Array<keyof T>,
): {
	isValid: boolean;
	validatedParams?: T;
	error?: string;
} {
	if (!params || typeof params !== "object") {
		return {
			isValid: false,
			error: `Parameters must be an object with required fields: ${requiredFields.join(", ")}`,
		};
	}

	const paramObj = params as Record<string, unknown>;
	const missing = requiredFields.filter(
		(field) =>
			paramObj[field as string] === undefined ||
			paramObj[field as string] === null ||
			(typeof paramObj[field as string] === "string" &&
				!String(paramObj[field as string]).trim()),
	);

	if (missing.length > 0) {
		return {
			isValid: false,
			error: `Missing required parameters: ${missing.join(", ")}`,
		};
	}

	return {
		isValid: true,
		validatedParams: paramObj as T,
	};
}

/**
 * Validate numeric parameter within range
 */
export function validateNumericRange(
	value: unknown,
	fieldName: string,
	min: number,
	max: number,
): {
	isValid: boolean;
	value?: number;
	error?: string;
} {
	if (typeof value !== "number") {
		return {
			isValid: false,
			error: `${fieldName} must be a number`,
		};
	}

	if (value < min || value > max) {
		return {
			isValid: false,
			error: `${fieldName} must be between ${min} and ${max}`,
		};
	}

	return {
		isValid: true,
		value,
	};
}

/**
 * Log tool validation result
 */
export function logValidation(
	toolName: string,
	params: unknown,
	isValid: boolean,
	error?: string,
): void {
	console.log(`🔧 [ToolValidation] ${toolName}:`, {
		params,
		isValid,
		error,
		timestamp: new Date().toISOString(),
	});
}
