import type React from "react";
import { VoiceIndicator } from "~/components/conversation/VoiceIndicator";
import { RainbowButton } from "~/components/ui/magicui/rainbow-button";
import { ShinyButton } from "~/components/ui/magicui/shiny-button";

interface VoiceInputControllerProps {
	isRecording: boolean;
	isVoiceActive: boolean;
	startRecording: () => void;
	stopRecording: () => void;
}

const VoiceInputController: React.FC<VoiceInputControllerProps> = ({
	isRecording,
	isVoiceActive,
	startRecording,
	stopRecording,
}) => {
	return (
		<div className="flex items-center justify-center gap-4">
			{!isRecording ? (
				<ShinyButton onClick={startRecording} className="px-6 py-3">
					🎤 Start Voice Input
				</ShinyButton>
			) : (
				<RainbowButton onClick={stopRecording} className="px-6 py-3">
					🛑 Stop Recording
				</RainbowButton>
			)}

			{isRecording && <VoiceIndicator isVoiceActive={isVoiceActive} />}
		</div>
	);
};

export default VoiceInputController;
