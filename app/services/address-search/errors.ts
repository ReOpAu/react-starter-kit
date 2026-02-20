/**
 * Error codes for address search operations.
 * Each code maps to a specific business scenario.
 */
export type AddressSearchErrorCode =
	// Cache errors
	| "CACHE_KEY_MISMATCH"
	| "CACHE_NOT_FOUND"
	| "CACHE_CORRUPTED"
	// Search errors
	| "SEARCH_FAILED"
	| "SEARCH_NO_RESULTS"
	| "SEARCH_INVALID_QUERY"
	| "SEARCH_RATE_LIMITED"
	// Selection errors
	| "SELECTION_NOT_FOUND"
	| "SELECTION_INVALID_PLACE_ID"
	| "SELECTION_NO_CURRENT_SEARCH"
	// Validation errors
	| "VALIDATION_FAILED"
	| "VALIDATION_SERVICE_UNAVAILABLE"
	| "VALIDATION_RURAL_EXCEPTION"
	// Show options errors
	| "OPTIONS_NO_SELECTION"
	| "OPTIONS_NO_CACHE"
	| "OPTIONS_EMPTY_CACHE"
	// State errors
	| "STATE_INCONSISTENT"
	| "STATE_MISSING_DEPENDENCY";

/**
 * User-friendly messages for each error code.
 */
const USER_MESSAGES: Record<AddressSearchErrorCode, string> = {
	// Cache errors
	CACHE_KEY_MISMATCH:
		"An internal error occurred. Please try your search again.",
	CACHE_NOT_FOUND: "Previous search results are no longer available.",
	CACHE_CORRUPTED:
		"Search results were corrupted. Please try your search again.",
	// Search errors
	SEARCH_FAILED:
		"Unable to search for addresses. Please try again in a moment.",
	SEARCH_NO_RESULTS:
		"No addresses found matching your search. Please try a different search.",
	SEARCH_INVALID_QUERY:
		"Please enter a valid address or location to search for.",
	SEARCH_RATE_LIMITED:
		"Too many searches. Please wait a moment before trying again.",
	// Selection errors
	SELECTION_NOT_FOUND:
		"The selected address could not be found. Please select from the available options.",
	SELECTION_INVALID_PLACE_ID:
		"Invalid address selection. Please select from the available options.",
	SELECTION_NO_CURRENT_SEARCH:
		"No addresses available to select from. Please search for an address first.",
	// Validation errors
	VALIDATION_FAILED:
		"The address could not be validated. Please check the address and try again.",
	VALIDATION_SERVICE_UNAVAILABLE:
		"Address validation service is temporarily unavailable.",
	VALIDATION_RURAL_EXCEPTION:
		"This appears to be a rural address. Please confirm if this is correct.",
	// Show options errors
	OPTIONS_NO_SELECTION:
		"No address has been selected yet. Please select an address first.",
	OPTIONS_NO_CACHE:
		"Previous address options are no longer available. Please search again.",
	OPTIONS_EMPTY_CACHE: "No previous address options found to display.",
	// State errors
	STATE_INCONSISTENT:
		"An internal state error occurred. Please refresh and try again.",
	STATE_MISSING_DEPENDENCY: "Required service dependencies are not available.",
};

/**
 * Base error class for address search service.
 * Provides clear business context for all errors.
 */
export class AddressSearchError extends Error {
	public readonly code: AddressSearchErrorCode;
	public readonly context?: Record<string, unknown>;
	public readonly recoverable: boolean;

	constructor(
		code: AddressSearchErrorCode,
		message: string,
		options?: {
			context?: Record<string, unknown>;
			recoverable?: boolean;
			cause?: Error;
		},
	) {
		super(message, { cause: options?.cause });
		this.name = "AddressSearchError";
		this.code = code;
		this.context = options?.context;
		this.recoverable = options?.recoverable ?? false;
	}

	/**
	 * Create a user-friendly error message.
	 */
	toUserMessage(): string {
		return USER_MESSAGES[this.code] ?? this.message;
	}
}

/**
 * Create a cache-related error.
 */
export function createCacheError(
	code: Extract<AddressSearchErrorCode, `CACHE_${string}`>,
	context?: Record<string, unknown>,
): AddressSearchError {
	return new AddressSearchError(code, USER_MESSAGES[code], {
		context,
		recoverable: true,
	});
}

/**
 * Create a search-related error.
 */
export function createSearchError(
	code: Extract<AddressSearchErrorCode, `SEARCH_${string}`>,
	context?: Record<string, unknown>,
	cause?: Error,
): AddressSearchError {
	return new AddressSearchError(code, USER_MESSAGES[code], {
		context,
		recoverable: code !== "SEARCH_INVALID_QUERY",
		cause,
	});
}

/**
 * Create a selection-related error.
 */
export function createSelectionError(
	code: Extract<AddressSearchErrorCode, `SELECTION_${string}`>,
	context?: Record<string, unknown>,
): AddressSearchError {
	return new AddressSearchError(code, USER_MESSAGES[code], {
		context,
		recoverable: true,
	});
}

/**
 * Create a validation-related error.
 */
export function createValidationError(
	code: Extract<AddressSearchErrorCode, `VALIDATION_${string}`>,
	context?: Record<string, unknown>,
	cause?: Error,
): AddressSearchError {
	return new AddressSearchError(code, USER_MESSAGES[code], {
		context,
		recoverable: code !== "VALIDATION_RURAL_EXCEPTION",
		cause,
	});
}

/**
 * Create a show-options-related error.
 */
export function createOptionsError(
	code: Extract<AddressSearchErrorCode, `OPTIONS_${string}`>,
	context?: Record<string, unknown>,
): AddressSearchError {
	return new AddressSearchError(code, USER_MESSAGES[code], {
		context,
		recoverable: false,
	});
}

/**
 * Create a state-related error.
 */
export function createStateError(
	code: Extract<AddressSearchErrorCode, `STATE_${string}`>,
	context?: Record<string, unknown>,
): AddressSearchError {
	return new AddressSearchError(code, USER_MESSAGES[code], {
		context,
		recoverable: false,
	});
}
