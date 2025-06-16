'use client';

import { Radio } from "lucide-react";
import { cn } from "~/lib/utils";

interface VoiceIndicatorProps {
  isVoiceActive: boolean;
}

export function VoiceIndicator({ isVoiceActive }: VoiceIndicatorProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-1",
        isVoiceActive 
          ? "text-primary animate-pulse" 
          : "text-muted-foreground"
      )}
      role="status"
      aria-label={isVoiceActive ? "Voice active" : "Voice ready"}
    >
      <Radio className="h-4 w-4" />
      <span className="text-xs">
        {isVoiceActive ? "Voice Active" : "Voice Ready"}
      </span>
    </div>
  );
} 