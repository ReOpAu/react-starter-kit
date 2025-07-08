import { StateDebugPanel } from "~/components/address-finder";
import AgentDebugCopyPanel from "~/components/address-finder/AgentDebugCopyPanel";
import AgentStatePanel from "~/components/address-finder/AgentStatePanel";
import { Button } from "~/components/ui/button";
import type { AddressFinderBrainState } from "./AddressFinderBrain";

interface AddressFinderDebugProps {
	brainState: AddressFinderBrainState;
}

export function AddressFinderDebug({ brainState }: AddressFinderDebugProps) {
	const {
		suggestions,
		isLoading,
		isError,
		error,
		debouncedSearchQuery,
		agentRequestedManual,
		sessionToken,
		conversationStatus,
		agentStateForDebug,
		history,
		handleRequestAgentState,
		handleClear,
	} = brainState;

	return (
		<div className="space-y-6">
			<details className="group rounded-lg bg-gray-50 p-4 border border-gray-200">
				<summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
					Toggle Debug Panels
				</summary>
				<div className="mt-4 space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<StateDebugPanel
							suggestions={suggestions}
							isLoading={isLoading}
							isError={isError}
							error={error}
							debouncedSearchQuery={debouncedSearchQuery}
							agentRequestedManual={agentRequestedManual}
							sessionToken={sessionToken}
							conversationStatus={conversationStatus}
							conversationConnected={conversationStatus === "connected"}
						/>
						<AgentStatePanel agentState={agentStateForDebug} />
					</div>
					<AgentDebugCopyPanel
						agentState={agentStateForDebug}
						history={history}
					/>
				</div>
			</details>

			<div className="text-center space-x-4">
				<Button onClick={handleRequestAgentState} variant="secondary">
					Get Agent State
				</Button>
				<Button onClick={() => handleClear("user")} variant="outline">
					Clear All State
				</Button>
			</div>
		</div>
	);
}
