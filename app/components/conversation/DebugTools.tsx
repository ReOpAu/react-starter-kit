import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import type { SpellingSuggestion } from "~/hooks/useSpellingAutocomplete";

interface DebugToolsProps {
	testInput: string;
	setTestInput: (value: string) => void;
	getSuggestions: (input: string) => Promise<void>;
	isAutocompleteLoading: boolean;
	clearSuggestions: () => void;
	autocompleteError: string | null;
	suggestions: SpellingSuggestion[];
	conversation: {
		status: string;
		sendUserMessage: (message: string) => Promise<void>;
	};
	isLoading: boolean;
	isEnhancedLoading: boolean;
	resetSession: () => void;
	testMultipleResults: (input: string) => Promise<void>;
	searchPlaces: (input: string) => Promise<unknown>;
	testAddressValidation: (input: string) => Promise<void>;
}

export function DebugTools({
	testInput,
	setTestInput,
	getSuggestions,
	isAutocompleteLoading,
	clearSuggestions,
	autocompleteError,
	suggestions,
	conversation,
	isLoading,
	isEnhancedLoading,
	resetSession,
	testMultipleResults,
	searchPlaces,
	testAddressValidation,
}: DebugToolsProps) {
	return (
		<Accordion type="single" collapsible className="w-full">
			<AccordionItem value="item-1">
				<AccordionTrigger className="text-sm px-4">
					<span className="flex items-center gap-2">🔧 Debug Tools</span>
				</AccordionTrigger>
				<AccordionContent>
					<div className="space-y-4 pt-4 border-t">
						{/* Enhanced Autocomplete Test */}
						<div className="space-y-2 px-4">
							<h4 className="text-sm font-medium">
								Enhanced Address Autocomplete Test
							</h4>
							<div className="flex gap-2">
								<Input
									value={testInput}
									onChange={(e) => setTestInput(e.target.value)}
									placeholder="Test address (e.g., 38 Clive Street West Footscray)"
									className="flex-1"
								/>
								<Button
									onClick={() => getSuggestions(testInput)}
									disabled={isAutocompleteLoading}
									variant="outline"
									size="sm"
								>
									{isAutocompleteLoading ? "Loading..." : "Test"}
								</Button>
								<Button onClick={clearSuggestions} variant="outline" size="sm">
									Clear
								</Button>
							</div>
							{autocompleteError && (
								<p className="text-sm text-red-600">
									Error: {autocompleteError}
								</p>
							)}
							{suggestions.length > 0 && (
								<div className="bg-white p-2 rounded border">
									<p className="text-xs text-muted-foreground mb-1">
										Results ({suggestions.length}):
									</p>
									{suggestions.map((suggestion) => (
										<div
											key={suggestion.placeId}
											className="text-xs p-1 border-b last:border-b-0"
										>
											<strong>{suggestion.address}</strong>
											<span className="text-muted-foreground">
												{" "}
												({suggestion.addressType}, {suggestion.confidence})
											</span>
										</div>
									))}
								</div>
							)}
						</div>

						<Separator />

						<div className="flex flex-wrap justify-center gap-2 px-4">
							<Button
								variant="outline"
								onClick={async () => {
									if (conversation.status === "connected") {
										await conversation.sendUserMessage(
											"Please look up Yarraville",
										);
									} else {
										console.log("Conversation not connected");
									}
								}}
								disabled={isLoading}
								className="text-xs"
							>
								🧪 Test Yarraville (via Agent)
							</Button>
							<Button
								variant="outline"
								onClick={async () => {
									console.log("[DEBUG] Starting spelling mode test");
									resetSession();
									console.log(
										"[DEBUG] Spelling mode started, now processing input",
									);
									await getSuggestions("Y-A-R-R");
									console.log("[DEBUG] Processing complete");
								}}
								disabled={isLoading}
								className="text-xs"
							>
								🔤 Test Spelling Mode
							</Button>
							<Button
								variant="outline"
								onClick={async () => {
									console.log("[DEBUG] Direct autocomplete test");
									const result = await getSuggestions("RICH");
									console.log("[DEBUG] Direct test result:", result);
								}}
								disabled={isLoading}
								className="text-xs"
							>
								🔍 Test "RICH"
							</Button>
							<Button
								variant="outline"
								onClick={async () => {
									console.log("[DEBUG] Canterbury autocomplete test");
									const result = await getSuggestions("CANT");
									console.log("[DEBUG] Canterbury test result:", result);
								}}
								disabled={isLoading}
								className="text-xs"
							>
								🏘️ Test "CANT"
							</Button>
							<Button
								variant="outline"
								onClick={() => testMultipleResults("Richmond")}
								disabled={isLoading}
								className="text-xs"
							>
								🔍 Multiple Results Test
							</Button>
							<Button
								variant="outline"
								onClick={() => searchPlaces("Richmond")}
								disabled={isEnhancedLoading}
								className="text-xs"
							>
								🎯 Enhanced Place Test
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									testAddressValidation("9999 Fake Street Nonexistent VIC")
								}
								disabled={isLoading}
								className="text-xs"
							>
								🏠 Invalid Address Test
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									testAddressValidation("123 Collins Street Melbourne VIC")
								}
								disabled={isLoading}
								className="text-xs"
							>
								🏢 Valid Address Test
							</Button>
							<Button
								variant="outline"
								onClick={() =>
									testAddressValidation("1189 Clive Street West Footscray VIC")
								}
								disabled={isLoading}
								className="text-xs"
							>
								🔍 Test Clive Street
							</Button>
						</div>
						<div className="mt-2 text-xs text-center text-muted-foreground px-4">
							Open browser console (F12) to see debug output
						</div>
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}
