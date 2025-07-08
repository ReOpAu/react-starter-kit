import { useConversation } from "@elevenlabs/react";
import { useCallback, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useSuburbAutocomplete } from "~/hooks/useSuburbAutocomplete";
import type { PlaceSuggestion } from "../../../convex/location";
import { EnhancedPlaceSuggestions } from "../../components/old/EnhancedPlaceSuggestions";
import { EnhancedPlaceSuggestionsDisplay } from "../../components/old/EnhancedPlaceSuggestionsDisplay";
import { GoogleMapsAutocomplete } from "../../components/old/GoogleMapsAutocomplete";

export default function EnhancedAddress() {
	const { getPlaceSuggestions } = useSuburbAutocomplete();
	const [isConversationActive, setIsConversationActive] = useState(false);
	const [aiSuggestions, setAiSuggestions] = useState<PlaceSuggestion[]>([]);
	const [lastAiQuery, setLastAiQuery] = useState<string>("");

	// Conversational AI that disables inputs and populates suggestions
	const conversation = useConversation({
		apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || "",
		onConnect: () => {
			if (!import.meta.env.VITE_ELEVENLABS_API_KEY) {
				console.error("[AI] API key is missing");
				return;
			}
			console.log("[AI] Connected - disabling input fields");
			setIsConversationActive(true);
		},
		onDisconnect: () => {
			console.log("[AI] Disconnected - enabling input fields");
			setIsConversationActive(false);
			setAiSuggestions([]);
			setLastAiQuery("");
		},

		clientTools: {
			// ClientTool to populate place suggestions component
			PopulatePlaceSuggestions: async (params: unknown) => {
				try {
					console.log(
						"[ClientTool] PopulatePlaceSuggestions called with:",
						params,
					);

					// Extract address from various parameter formats
					let query = "";
					if (typeof params === "string") {
						query = params;
					} else if (params && typeof params === "object") {
						const paramObj = params as Record<string, unknown>;
						query = String(
							paramObj.address ||
								paramObj.query ||
								paramObj.location ||
								paramObj.place ||
								paramObj.search ||
								paramObj.text ||
								"",
						);
					}

					if (!query || query.trim() === "") {
						return "I need a location or address to search for. Please specify what you're looking for.";
					}

					console.log("[ClientTool] Searching for:", query);
					setLastAiQuery(query);

					// Use existing place suggestions system
					const result = await getPlaceSuggestions(query, "general", {
						maxResults: 8,
					});

					if (result.success && "suggestions" in result) {
						console.log(
							"[ClientTool] Found",
							result.suggestions.length,
							"suggestions",
						);
						setAiSuggestions(result.suggestions);

						return `Found ${result.suggestions.length} place suggestions for "${query}". The suggestions are now displayed below for you to review.`;
					} else {
						console.log("[ClientTool] No suggestions found");
						setAiSuggestions([]);
						return `I couldn't find any places matching "${query}". Please try a different search term.`;
					}
				} catch (error) {
					console.error(
						"[ClientTool] Error in PopulatePlaceSuggestions:",
						error,
					);
					return "Sorry, I encountered an error while searching. Please try again.";
				}
			},

			// ClientTool to clear suggestions
			ClearPlaceSuggestions: async () => {
				console.log("[ClientTool] Clearing place suggestions");
				setAiSuggestions([]);
				setLastAiQuery("");
				return "Place suggestions have been cleared.";
			},
		},

		// Voice transcription handling
		onTranscription: (text: string) => {
			console.log("[AI] Voice transcription:", text);
			// Don't set input field values - let the AI use ClientTools
		},

		onMessage: (message) => {
			console.log("[AI] Message:", message);
		},

		textOnly: false,
	});

	// Handle starting/stopping conversation
	const startConversation = useCallback(async () => {
		try {
			await conversation.startSession({
				agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID || "default_agent_id",
			});
		} catch (error) {
			console.error("Failed to start conversation:", error);
		}
	}, [conversation]);

	const stopConversation = useCallback(async () => {
		try {
			await conversation.endSession();
		} catch (error) {
			console.error("Failed to stop conversation:", error);
		}
	}, [conversation]);

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-4xl mx-auto px-4">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900">
						Enhanced Place Suggestions
					</h1>
					<p className="text-gray-600 mt-2">
						Advanced address lookup with automatic intent classification and
						result type filtering
					</p>
					<div className="mt-3 flex items-center gap-3">
						<Badge variant={isConversationActive ? "default" : "secondary"}>
							🤖 AI {isConversationActive ? "Active" : "Inactive"}
						</Badge>
						{lastAiQuery && (
							<Badge variant="outline">Last Search: {lastAiQuery}</Badge>
						)}
						{isConversationActive && (
							<Badge variant="destructive" className="text-xs">
								Input Fields Disabled
							</Badge>
						)}
					</div>
				</div>

				{/* AI Control Panel */}
				<Card className="mb-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							🎤 Voice AI Control
							<Badge
								variant={
									conversation.status === "connected" ? "default" : "secondary"
								}
							>
								{conversation.status === "connected"
									? "Connected"
									: "Disconnected"}
							</Badge>
						</CardTitle>
					</CardHeader>
					<CardContent>
						{!isConversationActive ? (
							<div className="space-y-3">
								<p className="text-sm text-muted-foreground">
									Start voice conversation to disable input fields and use AI to
									populate suggestions.
								</p>
								<Button onClick={startConversation} className="w-full">
									🎤 Start AI Conversation
								</Button>
								<div className="text-xs text-muted-foreground">
									<p>
										<strong>Try saying:</strong>
									</p>
									<ul className="list-disc list-inside mt-1 space-y-1">
										<li>"Find places in Richmond"</li>
										<li>"Search for coffee shops in Melbourne"</li>
										<li>"Look up Collins Street"</li>
									</ul>
								</div>
							</div>
						) : (
							<div className="space-y-3">
								<p className="text-sm text-green-700 bg-green-50 p-2 rounded">
									🎤 AI is listening... Input fields are disabled. Speak your
									location query.
								</p>
								<Button
									onClick={stopConversation}
									variant="destructive"
									className="w-full"
								>
									🛑 Stop AI Conversation
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Enhanced Place Suggestions with AI integration */}
				<div
					className={
						isConversationActive ? "pointer-events-none opacity-60" : ""
					}
				>
					<EnhancedPlaceSuggestions
						aiSuggestions={aiSuggestions}
						isInputDisabled={isConversationActive}
					/>
				</div>

				<div
					className={`mt-8 ${isConversationActive ? "pointer-events-none opacity-60" : ""}`}
				>
					<GoogleMapsAutocomplete />
				</div>

				{/* AI-specific feedback when conversation is active */}
				{isConversationActive && aiSuggestions.length === 0 && (
					<Card className="mt-6 border-blue-200 bg-blue-50">
						<CardContent className="pt-6">
							<div className="text-center">
								<div className="text-4xl mb-2">🎤</div>
								<p className="text-sm text-blue-700">
									AI is ready to help! Say something like "Find places in
									[location]" to get started.
								</p>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
