/**
 * Audio encoding utilities for Cartesia WebSocket protocol.
 * Converts between browser AudioContext formats and PCM base64.
 */

/**
 * Convert Float32Array audio samples to Int16 PCM.
 * Browser AudioContext uses Float32 (-1.0 to 1.0), Cartesia expects Int16 PCM.
 */
export function float32ToInt16(float32: Float32Array): Int16Array {
	const int16 = new Int16Array(float32.length);
	for (let i = 0; i < float32.length; i++) {
		// Clamp to [-1, 1] then scale to Int16 range
		const s = Math.max(-1, Math.min(1, float32[i]));
		int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
	}
	return int16;
}

/**
 * Convert Int16 PCM to Float32Array for AudioContext playback.
 */
export function int16ToFloat32(int16: Int16Array): Float32Array {
	const float32 = new Float32Array(int16.length);
	for (let i = 0; i < int16.length; i++) {
		float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
	}
	return float32;
}

/**
 * Encode Int16Array as base64 string for WebSocket transmission.
 */
export function int16ToBase64(int16: Int16Array): string {
	const bytes = new Uint8Array(int16.buffer);
	let binary = "";
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Decode base64 string to Int16Array for audio playback.
 */
export function base64ToInt16(base64: string): Int16Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new Int16Array(bytes.buffer);
}

/**
 * Encode Float32 audio data to base64 PCM for WebSocket.
 * Convenience function combining float32ToInt16 + int16ToBase64.
 */
export function encodeAudioForWs(float32: Float32Array): string {
	return int16ToBase64(float32ToInt16(float32));
}

/**
 * Decode base64 PCM to Float32 for AudioContext playback.
 * Convenience function combining base64ToInt16 + int16ToFloat32.
 */
export function decodeAudioFromWs(base64: string): Float32Array {
	return int16ToFloat32(base64ToInt16(base64));
}
