/**
 * Retry mechanism utilities for tool calls and connection issues
 */

export interface RetryConfig {
	maxAttempts: number;
	baseDelay: number; // Base delay in milliseconds
	maxDelay: number; // Maximum delay in milliseconds
	backoffFactor: number; // Exponential backoff multiplier
	retryCondition?: (error: any) => boolean; // Custom condition to determine if retry should happen
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	backoffFactor: 2,
	retryCondition: (error) => {
		// Retry on network errors, timeouts, and server errors
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("network") ||
				message.includes("timeout") ||
				message.includes("fetch") ||
				message.includes("connection") ||
				message.includes("503") ||
				message.includes("502") ||
				message.includes("504")
			);
		}
		return false;
	},
};

export interface RetryResult<T> {
	success: boolean;
	result?: T;
	error?: any;
	attempts: number;
	totalTime: number;
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	config: Partial<RetryConfig> = {},
	operationName = "operation",
): Promise<RetryResult<T>> {
	const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
	const startTime = Date.now();

	let lastError: any;

	for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
		try {
			const result = await operation();
			return {
				success: true,
				result,
				attempts: attempt,
				totalTime: Date.now() - startTime,
			};
		} catch (error) {
			lastError = error;

			// Check if we should retry this error
			if (!finalConfig.retryCondition?.(error)) {
				console.warn(
					`[Retry] ${operationName} failed with non-retryable error:`,
					error,
				);
				break;
			}

			// Don't wait after the last attempt
			if (attempt === finalConfig.maxAttempts) {
				console.error(
					`[Retry] ${operationName} failed after ${attempt} attempts:`,
					error,
				);
				break;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(
				finalConfig.baseDelay *
					Math.pow(finalConfig.backoffFactor, attempt - 1),
				finalConfig.maxDelay,
			);

			console.warn(
				`[Retry] ${operationName} attempt ${attempt} failed, retrying in ${delay}ms:`,
				error,
			);

			// Wait before retrying
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return {
		success: false,
		error: lastError,
		attempts: finalConfig.maxAttempts,
		totalTime: Date.now() - startTime,
	};
}

/**
 * Specialized retry config for API calls
 */
export const API_RETRY_CONFIG: RetryConfig = {
	...DEFAULT_RETRY_CONFIG,
	maxAttempts: 3,
	baseDelay: 500,
	maxDelay: 5000,
	retryCondition: (error) => {
		// Retry on network and server errors, but not on validation errors
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("network") ||
				message.includes("timeout") ||
				message.includes("fetch") ||
				message.includes("5") || // 5xx errors
				message.includes("429") // Rate limiting
			);
		}
		return false;
	},
};

/**
 * Specialized retry config for ElevenLabs connection issues
 */
export const ELEVENLABS_RETRY_CONFIG: RetryConfig = {
	...DEFAULT_RETRY_CONFIG,
	maxAttempts: 2,
	baseDelay: 2000,
	maxDelay: 8000,
	retryCondition: (error) => {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("websocket") ||
				message.includes("connection") ||
				message.includes("disconnect") ||
				message.includes("timeout")
			);
		}
		return false;
	},
};

/**
 * Utility to wrap an async function with retry logic
 */
export function createRetryWrapper<TArgs extends any[], TReturn>(
	fn: (...args: TArgs) => Promise<TReturn>,
	config: Partial<RetryConfig> = {},
	operationName?: string,
) {
	return async (...args: TArgs): Promise<TReturn> => {
		const result = await withRetry(
			() => fn(...args),
			config,
			operationName || fn.name,
		);

		if (result.success) {
			return result.result!;
		} else {
			throw result.error;
		}
	};
}
