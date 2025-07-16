"use client";

import { Radio } from "lucide-react";
import { cn } from "~/lib/utils";

interface VoiceIndicatorProps {
	isVoiceActive: boolean;
}

export function VoiceIndicator({ isVoiceActive }: VoiceIndicatorProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200",
				isVoiceActive
					? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
					: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
			)}
			aria-label={isVoiceActive ? "Voice active" : "Voice ready"}
		>
			<div
				className={cn(
					"w-2 h-2 rounded-full transition-all duration-200",
					isVoiceActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400",
				)}
			/>
			<span className="text-xs font-medium">
				{isVoiceActive ? "Listening" : "Ready"}
			</span>
		</div>
	);
}
