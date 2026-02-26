/**
 * Manages microphone capture and audio playback for Cartesia.
 * Captures mic PCM → base64 → sends via WebSocket.
 * Receives base64 PCM → decodes → plays via AudioContext.
 */

import { useCallback, useRef } from "react";
import { useUIStore } from "~/stores/uiStore";
import { encodeAudioForWs } from "../utils/audioEncoder";
import { AudioPlayer } from "../utils/audioPlayer";

const MIC_SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

interface UseCartesiaAudioManagerOptions {
	sendMediaInput: (base64Data: string) => void;
}

interface UseCartesiaAudioManagerReturn {
	startCapture: () => Promise<void>;
	stopCapture: () => void;
	playAudioChunk: (base64Data: string) => void;
	flushAudio: () => void;
	destroyAudio: () => Promise<void>;
}

export function useCartesiaAudioManager({
	sendMediaInput,
}: UseCartesiaAudioManagerOptions): UseCartesiaAudioManagerReturn {
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const processorRef = useRef<ScriptProcessorNode | null>(null);
	const playerRef = useRef<AudioPlayer | null>(null);

	const startCapture = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: MIC_SAMPLE_RATE,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});

			streamRef.current = stream;

			const audioContext = new AudioContext({
				sampleRate: MIC_SAMPLE_RATE,
			});
			audioContextRef.current = audioContext;

			const source = audioContext.createMediaStreamSource(stream);
			const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);
			processorRef.current = processor;

			processor.onaudioprocess = (event) => {
				const inputData = event.inputBuffer.getChannelData(0);
				const base64 = encodeAudioForWs(inputData);
				sendMediaInput(base64);
			};

			source.connect(processor);
			processor.connect(audioContext.destination);

			// Initialize the playback player
			if (!playerRef.current) {
				playerRef.current = new AudioPlayer();
			}
			await playerRef.current.init();

			useUIStore.getState().setIsRecording(true);
			useUIStore.getState().setIsVoiceActive(true);
		} catch (err) {
			console.error("[CartesiaAudio] Failed to start capture:", err);
			useUIStore.getState().setIsRecording(false);
			useUIStore.getState().setIsVoiceActive(false);
		}
	}, [sendMediaInput]);

	const stopCapture = useCallback(() => {
		// Stop mic stream
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) {
				track.stop();
			}
			streamRef.current = null;
		}

		// Disconnect processor
		if (processorRef.current) {
			processorRef.current.disconnect();
			processorRef.current = null;
		}

		// Close capture audio context
		if (audioContextRef.current) {
			audioContextRef.current.close();
			audioContextRef.current = null;
		}

		useUIStore.getState().setIsRecording(false);
		useUIStore.getState().setIsVoiceActive(false);
	}, []);

	const playAudioChunk = useCallback((base64Data: string) => {
		if (!playerRef.current) {
			playerRef.current = new AudioPlayer();
			playerRef.current.init();
		}
		playerRef.current.enqueue(base64Data);
	}, []);

	const flushAudio = useCallback(() => {
		playerRef.current?.flush();
	}, []);

	const destroyAudio = useCallback(async () => {
		stopCapture();
		if (playerRef.current) {
			await playerRef.current.destroy();
			playerRef.current = null;
		}
	}, [stopCapture]);

	return {
		startCapture,
		stopCapture,
		playAudioChunk,
		flushAudio,
		destroyAudio,
	};
}
