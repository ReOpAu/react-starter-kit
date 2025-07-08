import { useConversation } from "@elevenlabs/react";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { VoiceIndicator } from "~/components/conversation/VoiceIndicator";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { RainbowButton } from "~/components/ui/magicui/rainbow-button";
import { ShinyButton } from "~/components/ui/magicui/shiny-button";
import { Separator } from "~/components/ui/separator";
import {
	type EnhancedPlaceSuggestion,
	useEnhancedPlaceSuggestions,
} from "~/hooks/useEnhancedPlaceSuggestions";
import { useSpellingAutocomplete } from "~/hooks/useSpellingAutocomplete";
import { cn } from "~/lib/utils";
import { EnhancedPlaceSuggestions } from "../../components/old/EnhancedPlaceSuggestions";
import { EnhancedPlaceSuggestionsDisplay } from "../../components/old/EnhancedPlaceSuggestionsDisplay";
import { GoogleMapsAutocomplete } from "../../components/old/GoogleMapsAutocomplete";

// Consolidated State Types
interface VoiceTranscription {
	text: string;
	timestamp: number;
	isSpelling?: boolean;
}

interface SearchHistoryItem {
	input: string;
	result: string | null;
	timestamp: number;
	isAgentCall?: boolean;
	detectedIntent?: string;
}

interface AgentToolCall {
	tool: string;
	input: string;
	result: string;
	timestamp: number;
}

interface PlaceData {
	description: string;
	mainText: string;
	secondaryText: string;
	placeId: string;
	resultType: string;
	confidence: number;
	types: string[];
	lat?: number;
	lng?: number;
}

// Consolidated State
interface AppState {
	// Voice/Recording State
	isVoiceActive: boolean;
	isRecording: boolean;
	voiceTranscriptions: VoiceTranscription[];

	// Search State
	manualInput: string;
	searchHistory: SearchHistoryItem[];
	agentToolCalls: AgentToolCall[];

	// Results State
	selectedResult: EnhancedPlaceSuggestion | null;
	currentPlaceData: PlaceData | null;

	// UI State
	isClientMounted: boolean;
	testInput: string;

	// Mode State
	currentMode: "idle" | "searching" | "selecting" | "confirmed" | "confirming";
	lastAction: string | null;
}

// State Actions
type AppAction =
	| { type: "SET_VOICE_ACTIVE"; payload: boolean }
	| { type: "SET_RECORDING"; payload: boolean }
	| { type: "ADD_TRANSCRIPTION"; payload: VoiceTranscription }
	| { type: "SET_MANUAL_INPUT"; payload: string }
	| { type: "ADD_SEARCH_HISTORY"; payload: SearchHistoryItem }
	| { type: "ADD_TOOL_CALL"; payload: AgentToolCall }
	| { type: "SET_SELECTED_RESULT"; payload: EnhancedPlaceSuggestion | null }
	| { type: "SET_CURRENT_PLACE_DATA"; payload: PlaceData | null }
	| { type: "SET_CLIENT_MOUNTED"; payload: boolean }
	| { type: "SET_TEST_INPUT"; payload: string }
	| {
			type: "SET_MODE";
			payload: { mode: AppState["currentMode"]; action: string };
	  }
	| { type: "RESET_RESULTS" }
	| { type: "CLEAR_ALL" };

// Initial State
const initialState: AppState = {
	isVoiceActive: false,
	isRecording: false,
	voiceTranscriptions: [],
	manualInput: "",
	searchHistory: [],
	agentToolCalls: [],
	selectedResult: null,
	currentPlaceData: null,
	isClientMounted: false,
	testInput: "",
	currentMode: "idle",
	lastAction: null,
};

// State Reducer
function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "SET_VOICE_ACTIVE":
			return { ...state, isVoiceActive: action.payload };

		case "SET_RECORDING":
			return {
				...state,
				isRecording: action.payload,
				currentMode: action.payload ? "searching" : "idle",
				lastAction: action.payload ? "start_recording" : "stop_recording",
			};

		case "ADD_TRANSCRIPTION":
			return {
				...state,
				voiceTranscriptions: [...state.voiceTranscriptions, action.payload],
			};

		case "SET_MANUAL_INPUT":
			return { ...state, manualInput: action.payload };

		case "ADD_SEARCH_HISTORY":
			return {
				...state,
				searchHistory: [action.payload, ...state.searchHistory.slice(0, 9)],
			};

		case "ADD_TOOL_CALL":
			return {
				...state,
				agentToolCalls: [action.payload, ...state.agentToolCalls.slice(0, 9)],
			};

		case "SET_SELECTED_RESULT":
			return {
				...state,
				selectedResult: action.payload,
				currentMode: action.payload ? "confirmed" : "idle",
				lastAction: action.payload ? "select_result" : "clear_selection",
			};

		case "SET_CURRENT_PLACE_DATA":
			return { ...state, currentPlaceData: action.payload };

		case "SET_CLIENT_MOUNTED":
			return { ...state, isClientMounted: action.payload };

		case "SET_TEST_INPUT":
			return { ...state, testInput: action.payload };

		case "SET_MODE":
			return {
				...state,
				currentMode: action.payload.mode,
				lastAction: action.payload.action,
			};

		case "RESET_RESULTS":
			return {
				...state,
				selectedResult: null,
				currentPlaceData: null,
				currentMode: "idle",
				lastAction: "reset_results",
			};

		case "CLEAR_ALL":
			return {
				...initialState,
				isClientMounted: state.isClientMounted,
				lastAction: "clear_all",
			};

		default:
			return state;
	}
}

// UI State Synchronization Hook
function useUIStateSync(
	state: AppState,
	spellingSuggestions: any[],
	placeSuggestions: EnhancedPlaceSuggestion[] | undefined,
) {
	const syncToElevenLabs = useCallback(() => {
		try {
			const windowWithElevenLabs = window as typeof window & {
				setVariable?: (name: string, value: unknown) => void;
			};

			if (typeof windowWithElevenLabs.setVariable === "function") {
				const uiStateForAgent = {
					isRecording: state.isRecording,
					isSpellingMode: spellingSuggestions.length > 0,
					hasResults: state.selectedResult !== null,
					hasMultipleResults: (placeSuggestions?.length ?? 0) > 1,
					hasSelectedResult: state.selectedResult !== null,
					currentMode: state.currentMode,
					resultCount: placeSuggestions?.length ?? 0,
					spellingActive: spellingSuggestions.length > 0,
					lastUserAction: state.lastAction,
					timestamp: Date.now(),
					selectedResult: state.selectedResult
						? {
								address: state.selectedResult.description,
								placeId: state.selectedResult.placeId,
							}
						: null,
					multipleOptions:
						placeSuggestions?.map((s) => ({
							address: s.description,
							placeId: s.placeId,
						})) ?? [],
				};
				// Sync complete UI state
				windowWithElevenLabs.setVariable("uiState", uiStateForAgent);

				// Sync result data
				windowWithElevenLabs.setVariable("currentFoundResult", null);
				windowWithElevenLabs.setVariable(
					"currentSelectedResult",
					state.selectedResult?.description || null,
				);
				windowWithElevenLabs.setVariable(
					"currentMultipleResults",
					placeSuggestions?.map((s) => s.description) ?? [],
				);
				windowWithElevenLabs.setVariable(
					"currentSpellingCandidates",
					spellingSuggestions.map((s: any) => s.address),
				);

				console.log("[UISync] Synced state to ElevenLabs:", uiStateForAgent);
			}
		} catch (error) {
			console.log("[UISync] ElevenLabs variables not available:", error);
		}
	}, [state, spellingSuggestions, placeSuggestions]);

	return { syncToElevenLabs };
}

export default function ConvAddress() {
	// Consolidated state with useReducer
	const [state, dispatch] = useReducer(appReducer, initialState);

	// Audio refs
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | undefined>(undefined);
	const lastUpdateRef = useRef<number>(0);

	// Custom hooks for various autocomplete and place search functionalities
	const {
		suggestions: spellingSuggestions,
		isLoading: isSpellingLoading,
		error: spellingError,
		debouncedGetSuggestions,
		resetSession: resetSpellingSession,
		clearSuggestions: clearSpellingSuggestions,
	} = useSpellingAutocomplete({
		minLength: 2,
		debounceMs: 300,
	});

	const {
		searchPlaces,
		isLoading,
		error,
		lastResult: enhancedPlaceResult,
		reset: resetEnhanced,
	} = useEnhancedPlaceSuggestions({
		maxResults: 8,
	});

	// UI State Synchronization
	const { syncToElevenLabs } = useUIStateSync(
		state,
		spellingSuggestions,
		enhancedPlaceResult?.suggestions,
	);

	// Optimized state update functions
	const updateRecording = useCallback(
		(recording: boolean) => {
			dispatch({ type: "SET_RECORDING", payload: recording });
			syncToElevenLabs();
		},
		[syncToElevenLabs],
	);

	const updateSelectedResult = useCallback(
		(result: EnhancedPlaceSuggestion | null) => {
			dispatch({ type: "SET_SELECTED_RESULT", payload: result });
			syncToElevenLabs();
		},
		[syncToElevenLabs],
	);

	const cleanupAudio = useCallback(() => {
		dispatch({ type: "SET_VOICE_ACTIVE", payload: false });

		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = undefined;
		}
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
		const audioContext = audioContextRef.current;
		if (audioContext && audioContext.state !== "closed") {
			audioContext.close();
			audioContextRef.current = null;
		}
	}, [dispatch]);

	const performSearch = useCallback(
		async (query: string) => {
			dispatch({ type: "RESET_RESULTS" });
			resetEnhanced();

			const searchStart = Date.now();
			dispatch({
				type: "ADD_SEARCH_HISTORY",
				payload: {
					input: query,
					result: "Searching...",
					timestamp: searchStart,
				},
			});

			try {
				// Always use the enhanced searchPlaces function.
				// The backend will handle intent detection.
				const searchResult = await searchPlaces(query);

				if (searchResult.success && searchResult.suggestions.length > 0) {
					dispatch({
						type: "ADD_SEARCH_HISTORY",
						payload: {
							input: query,
							result: `Found ${searchResult.suggestions.length} results.`,
							timestamp: searchStart,
							detectedIntent: searchResult.detectedIntent,
						},
					});
					return { success: true, results: searchResult.suggestions };
				}

				const errorMessage = searchResult.error || "No results found";
				dispatch({
					type: "ADD_SEARCH_HISTORY",
					payload: {
						input: query,
						result: errorMessage,
						timestamp: searchStart,
					},
				});
				return { success: false, error: errorMessage };
			} catch (err) {
				console.error("Search failed:", err);
				const errorMessage =
					err instanceof Error ? err.message : "Search failed";
				dispatch({
					type: "ADD_SEARCH_HISTORY",
					payload: {
						input: query,
						result: errorMessage,
						timestamp: searchStart,
					},
				});
				return { success: false, error: errorMessage };
			}
		},
		[dispatch, resetEnhanced, searchPlaces],
	);

	// Conversation setup with full client tool implementation
	const conversation = useConversation({
		apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
		onConnect: () => {
			console.log("Connected to ElevenLabs");
			dispatch({
				type: "SET_MODE",
				payload: { mode: "idle", action: "connected" },
			});
			syncToElevenLabs();
		},
		onDisconnect: () => {
			console.log("Disconnected from ElevenLabs");
			dispatch({ type: "SET_RECORDING", payload: false });
			dispatch({
				type: "SET_MODE",
				payload: { mode: "idle", action: "disconnected" },
			});
			cleanupAudio();
			syncToElevenLabs();
		},
		clientTools: {
			// Tool 1: AddressSearch - Simplified to use the robust performSearch
			AddressSearch: async (params: unknown) => {
				try {
					console.log("[ClientTool] AddressSearch called with params:", params);
					let address: string;
					if (typeof params === "string") {
						address = params;
					} else if (params && typeof params === "object") {
						const paramObj = params as Record<string, unknown>;
						const dataObj = paramObj.data as
							| Record<string, unknown>
							| undefined;
						address = String(
							paramObj.address ||
								paramObj.suburb ||
								paramObj.location ||
								paramObj.query ||
								paramObj.text ||
								paramObj.input ||
								paramObj.value ||
								dataObj?.address ||
								dataObj?.suburb ||
								"",
						);
					} else {
						address = "";
					}

					if (
						!address ||
						typeof address !== "string" ||
						address.trim() === ""
					) {
						return "I need an address or suburb name to look up.";
					}

					const toolCallStart = Date.now();
					dispatch({
						type: "ADD_TOOL_CALL",
						payload: {
							tool: "AddressSearch",
							input: address,
							result: "pending",
							timestamp: toolCallStart,
						},
					});

					const searchResult = await performSearch(address);

					if (
						searchResult.success &&
						searchResult.results &&
						searchResult.results.length > 0
					) {
						if (searchResult.results.length === 1) {
							const result = searchResult.results[0];
							dispatch({ type: "SET_SELECTED_RESULT", payload: result });
							return `✅ Validated address: ${result.description}.`;
						} else {
							return `Found ${searchResult.results.length} potential matches. Please choose one from the list.`;
						}
					}

					const responseMessage = `Could not find address: ${address}`;
					dispatch({
						type: "ADD_SEARCH_HISTORY",
						payload: {
							input: address,
							result: null,
							timestamp: toolCallStart,
							isAgentCall: true,
						},
					});
					return responseMessage;
				} catch (error) {
					console.log("AddressSearch client tool error:", error);
					return "Address lookup service is currently unavailable";
				}
			},
			// Tool 2: ConfirmPlace - Migrated from original file
			ConfirmPlace: async (params: unknown) => {
				try {
					let results: Array<{
						type: string;
						place_id: string;
						label: string;
					}> = [];
					if (params && typeof params === "object") {
						const paramObj = params as Record<string, unknown>;
						if (Array.isArray(paramObj.results)) {
							results = paramObj.results as typeof results;
						}
					}

					if (results.length === 0) {
						return "No place suggestions available to confirm.";
					}

					if (results.length === 1) {
						const place = results[0];
						const confirmedResult: EnhancedPlaceSuggestion = {
							description: place.label,
							placeId: place.place_id,
							types: [place.type],
							resultType: "general",
							confidence: 1,
							matchedSubstrings: [],
							structuredFormatting: {
								mainText: place.label,
								secondaryText: "",
							},
						};
						dispatch({ type: "SET_SELECTED_RESULT", payload: confirmedResult });
						dispatch({
							type: "ADD_SEARCH_HISTORY",
							payload: {
								input: `Confirmed: ${place.label}`,
								result: place.label,
								timestamp: Date.now(),
								isAgentCall: true,
							},
						});
						return `✅ Confirmed: ${place.label}`;
					}

					const compatibleResults: EnhancedPlaceSuggestion[] = results.map(
						(place) => ({
							description: place.label,
							placeId: place.place_id,
							types: [place.type],
							matchedSubstrings: [],
							structuredFormatting: {
								mainText: place.label,
								secondaryText: "",
							},
							resultType: "general",
							confidence: 1,
						}),
					);
					// This part of the tool seems to create a new set of suggestions.
					// For now, we'll just return the prompt to the user.
					// setEnhancedResult({ success: true, suggestions: compatibleResults, detectedIntent: 'general' });
					const placeLabels = results.map((r) => r.label).join(", ");
					return `📍 I found ${results.length} places for you: ${placeLabels}. Please select one.`;
				} catch (error) {
					console.log("ConfirmPlace client tool error:", error);
					return "Failed to confirm place selection";
				}
			},
			// Tool 3: GetUIState - Migrated from original file
			GetUIState: async () => {
				const currentState = {
					isRecording: state.isRecording,
					hasResults: state.selectedResult !== null,
					hasMultipleResults: false,
					hasSelectedResult: state.selectedResult !== null,
					currentMode: state.currentMode,
					selectedResult: state.selectedResult
						? {
								address: state.selectedResult.description,
								placeId: state.selectedResult.placeId,
							}
						: null,
					multipleOptions: [],
				};
				return `UI State: ${JSON.stringify(currentState, null, 2)}`;
			},
			// Tool 4: ClearResults - Migrated from original file
			ClearResults: async () => {
				dispatch({ type: "RESET_RESULTS" });
				clearSpellingSuggestions();
				resetSpellingSession();
				resetEnhanced();
				return "All results cleared.";
			},
		},
		onMessage: (message) => {
			if (message.source === "user" && message.message.trim()) {
				handleTranscription(message.message.trim());
			}
		},
		onTranscription: (text: string) => {
			if (text.trim()) {
				handleTranscription(text.trim());
			}
		},
		onError: (error) => {
			console.log("ElevenLabs Error:", error);
		},
		textOnly: false,
	});

	// Transcription handler
	const handleTranscription = useCallback(
		(text: string) => {
			const transcription: VoiceTranscription = {
				text: text.trim(),
				timestamp: Date.now(),
				isSpelling: spellingSuggestions.length > 0,
			};
			dispatch({ type: "ADD_TRANSCRIPTION", payload: transcription });

			if (spellingSuggestions.length > 0) {
				debouncedGetSuggestions(text.trim());
			}
		},
		[spellingSuggestions, debouncedGetSuggestions],
	);

	// Set up audio analysis
	const setupAudioAnalysis = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaStreamRef.current = stream;

			const audioContext = new AudioContext();
			audioContextRef.current = audioContext;

			const analyser = audioContext.createAnalyser();
			analyserRef.current = analyser;

			const source = audioContext.createMediaStreamSource(stream);
			source.connect(analyser);

			analyser.fftSize = 256;
			const bufferLength = analyser.frequencyBinCount;
			const dataArray = new Uint8Array(bufferLength);

			const checkAudioLevel = () => {
				if (!analyser) return;

				analyser.getByteFrequencyData(dataArray);
				const average = dataArray.reduce((a, b) => a + b) / bufferLength;
				const isActive = average > 15;
				const now = Date.now();

				if (
					isActive !== state.isVoiceActive &&
					(isActive || now - lastUpdateRef.current > 200)
				) {
					dispatch({ type: "SET_VOICE_ACTIVE", payload: isActive });
					lastUpdateRef.current = now;
				}

				animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
			};

			checkAudioLevel();
		} catch (error) {
			console.error("Failed to set up audio analysis:", error);
			throw error;
		}
	}, [state.isVoiceActive]);

	// Recording controls
	const startRecording = useCallback(async () => {
		try {
			await setupAudioAnalysis();
			await conversation.startSession({
				agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || "default_agent_id",
				textOnly: false,
			});
			dispatch({ type: "SET_RECORDING", payload: true });
			resetEnhanced();
		} catch (error) {
			console.error("Failed to start recording:", error);
			dispatch({
				type: "SET_MODE",
				payload: { mode: "idle", action: "recording_start_failed" },
			});
		}
	}, [conversation, setupAudioAnalysis, resetEnhanced]);

	const stopRecording = useCallback(async () => {
		try {
			await conversation.endSession();
			dispatch({ type: "SET_RECORDING", payload: false });
			cleanupAudio();
		} catch (error) {
			console.error("Failed to stop recording:", error);
			dispatch({
				type: "SET_MODE",
				payload: { mode: "idle", action: "recording_stop_failed" },
			});
		}
	}, [conversation, cleanupAudio]);

	// Manual input handling
	const handleManualSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (state.manualInput.trim()) {
				await performSearch(state.manualInput.trim());
				dispatch({ type: "SET_MANUAL_INPUT", payload: "" });
			}
		},
		[state.manualInput, performSearch, dispatch],
	);

	// Handle selection of a result from multiple options
	const handleResultSelection = async (result: EnhancedPlaceSuggestion) => {
		dispatch({ type: "SET_SELECTED_RESULT", payload: result });
		dispatch({
			type: "ADD_SEARCH_HISTORY",
			payload: {
				input: `Selected: ${result.description}`,
				result: result.description,
				timestamp: Date.now(),
			},
		});
		if (conversation.status === "connected") {
			const selectionSummary = `User has selected: "${result.description}". Selection is now confirmed.`;
			console.log(
				`[AgentComms] Sending selection to agent: ${selectionSummary}`,
			);
			try {
				await conversation.sendUserMessage(selectionSummary);
			} catch (error) {
				console.log("Failed to send selection summary to agent:", error);
			}
		}
	};

	// Handle selection of enhanced place suggestions
	const handleEnhancedPlaceSelection = async (
		suggestion: EnhancedPlaceSuggestion,
	) => {
		dispatch({ type: "SET_SELECTED_RESULT", payload: suggestion });
		resetEnhanced();
		dispatch({
			type: "ADD_SEARCH_HISTORY",
			payload: {
				input: `Enhanced: ${suggestion.structuredFormatting.mainText}`,
				result: suggestion.description,
				timestamp: Date.now(),
			},
		});
		if (conversation.status === "connected") {
			const selectionSummary = `User has selected: "${suggestion.description}". Selection is now confirmed.`;
			console.log(
				`[AgentComms] Sending selection to agent: ${selectionSummary}`,
			);
			try {
				await conversation.sendUserMessage(selectionSummary);
			} catch (error) {
				console.log("Failed to send selection summary to agent:", error);
			}
		}
	};

	// Set client mounted state after hydration
	useEffect(() => {
		dispatch({ type: "SET_CLIENT_MOUNTED", payload: true });
	}, []);

	// Sync UI state when dependencies change
	useEffect(() => {
		if (state.isClientMounted) {
			syncToElevenLabs();
		}
	}, [
		state.isClientMounted,
		spellingSuggestions.length,
		syncToElevenLabs,
		state.selectedResult,
		enhancedPlaceResult,
	]);

	// Animate out suggestions when a result is selected
	useEffect(() => {
		if (state.selectedResult && enhancedPlaceResult) {
			resetEnhanced();
		}
	}, [state.selectedResult, enhancedPlaceResult, resetEnhanced]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
			if (mediaStreamRef.current) {
				for (const track of mediaStreamRef.current.getTracks()) {
					track.stop();
				}
			}
			if (
				audioContextRef.current &&
				audioContextRef.current.state !== "closed"
			) {
				audioContextRef.current.close();
			}
		};
	}, []);

	return (
		<div className="container mx-auto py-8 px-4 max-w-4xl">
			<div className="space-y-6">
				{/* Header */}
				<div className="text-center space-y-2">
					<h1 className="text-3xl font-bold">Voice Address Lookup</h1>
					<p className="text-muted-foreground">
						Speak or type an address to get validated results from Google Places
					</p>
				</div>

				{/* Main Input Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<span>Address Lookup</span>
							<div className="flex items-center gap-2">
								{state.isRecording && (
									<Badge variant="secondary" className="animate-pulse">
										Recording
									</Badge>
								)}
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Voice Controls */}
						<div className="flex items-center justify-center gap-4">
							{!state.isRecording ? (
								<ShinyButton onClick={startRecording} className="px-6 py-3">
									🎤 Start Voice Input
								</ShinyButton>
							) : (
								<RainbowButton onClick={stopRecording} className="px-6 py-3">
									🛑 Stop Recording
								</RainbowButton>
							)}

							{state.isRecording && (
								<VoiceIndicator isVoiceActive={state.isVoiceActive} />
							)}
						</div>

						<Separator />

						{/* Manual Input */}
						<form onSubmit={handleManualSubmit} className="flex gap-2">
							<Input
								placeholder="Or type an address..."
								value={state.manualInput}
								onChange={(e) =>
									dispatch({
										type: "SET_MANUAL_INPUT",
										payload: e.target.value,
									})
								}
								disabled={isLoading}
							/>
							<Button
								type="submit"
								disabled={isLoading || !state.manualInput.trim()}
							>
								{isLoading ? "Searching..." : "Search"}
							</Button>
						</form>

						{/* Loading State */}
						{isLoading && (
							<div className="flex items-center justify-center py-4">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
								<span className="ml-2">Searching for places...</span>
							</div>
						)}

						{/* Error State */}
						{error && (
							<Card className="bg-red-50 border-red-200">
								<CardContent className="pt-4">
									<div className="flex items-center gap-2">
										<span className="text-2xl">❌</span>
										<p className="text-red-700">{error}</p>
									</div>
								</CardContent>
							</Card>
						)}
					</CardContent>
				</Card>

				{/* Enhanced Place Suggestions */}
				<AnimatePresence>
					{enhancedPlaceResult?.success &&
						enhancedPlaceResult.suggestions.length > 0 && (
							<motion.div
								key="place-suggestions"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: -20 }}
								transition={{ duration: 0.3 }}
							>
								<EnhancedPlaceSuggestionsDisplay
									suggestions={enhancedPlaceResult.suggestions}
									detectedIntent={enhancedPlaceResult.detectedIntent}
									onSelect={handleEnhancedPlaceSelection}
									onCancel={() => resetEnhanced()}
									isLoading={isLoading}
								/>
							</motion.div>
						)}
				</AnimatePresence>

				{/* Selected Result Display */}
				{state.selectedResult && (
					<Card className="bg-purple-50 border-purple-200">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<span>🎯</span>
								<span>Selected Result</span>
								<Badge
									variant="outline"
									className="ml-2 text-xs bg-green-100 text-green-700"
								>
									ACTIVE
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div>
									<p className="font-semibold text-purple-800">Location:</p>
									<p className="text-purple-700 font-medium">
										{state.selectedResult.description}
									</p>
								</div>
								<div className="bg-white p-3 rounded border">
									<p className="font-medium text-purple-800">Place ID:</p>
									<p className="text-purple-600 font-mono text-xs break-all">
										{state.selectedResult.placeId}
									</p>
								</div>
								{state.selectedResult.types.length > 0 && (
									<div className="bg-white p-3 rounded border">
										<p className="font-medium text-purple-800 mb-2">
											Google Place Types:
										</p>
										<div className="flex flex-wrap gap-1">
											{state.selectedResult.types.map((type: string) => (
												<Badge
													key={type}
													variant="outline"
													className="text-xs bg-purple-100 text-purple-700"
												>
													{type}
												</Badge>
											))}
										</div>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Voice Transcriptions */}
				{state.voiceTranscriptions.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Voice Transcriptions</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 max-h-40 overflow-y-auto">
								{state.voiceTranscriptions.map(
									(transcription: VoiceTranscription) => (
										<div
											key={transcription.timestamp}
											className={cn(
												"flex items-center justify-between p-2 rounded",
												"bg-muted",
											)}
										>
											<span>"{transcription.text}"</span>
											<span className="text-xs text-muted-foreground">
												{new Date(transcription.timestamp).toLocaleTimeString()}
											</span>
										</div>
									),
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Agent Tool Calls */}
				{state.agentToolCalls.length > 0 && (
					<Card className="bg-blue-50 border-blue-200">
						<CardHeader>
							<CardTitle className="text-lg flex items-center gap-2">
								🤖 Agent Tool Calls
								<Badge
									variant="outline"
									className="text-xs bg-blue-100 text-blue-700"
								>
									{state.agentToolCalls.length}
								</Badge>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3 max-h-40 overflow-y-auto">
								{state.agentToolCalls.map(
									(call: AgentToolCall, index: number) => (
										<div
											key={`${call.timestamp}-${index}`}
											className="flex justify-between items-start p-3 bg-blue-100 rounded-lg border border-blue-300"
										>
											<div className="flex-1">
												<p className="font-medium text-sm flex items-center gap-2">
													<span className="text-blue-600">🔧 {call.tool}</span>
													<span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded font-mono">
														"{call.input}"
													</span>
												</p>
											</div>
										</div>
									),
								)}
							</div>
						</CardContent>
					</Card>
				)}

				{/* Search History */}
				{state.searchHistory.length > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Search History</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2 max-h-60 overflow-y-auto">
								{state.searchHistory.map((search: SearchHistoryItem) => (
									<div
										key={search.timestamp}
										className={cn(
											"flex items-center justify-between p-3 rounded",
											search.isAgentCall
												? "bg-blue-50 border border-blue-200"
												: "bg-muted",
										)}
									>
										<div className="flex-1">
											<p className="font-medium flex items-center gap-2">
												{search.isAgentCall && (
													<span className="text-blue-600">🤖</span>
												)}
												"{search.input}"
											</p>
											{search.result ? (
												<p className="text-sm text-green-600">
													→ {search.result}
												</p>
											) : (
												<p className="text-sm text-red-600">→ No match found</p>
											)}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
