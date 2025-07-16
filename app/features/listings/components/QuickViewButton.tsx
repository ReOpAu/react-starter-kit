import type React from "react";
import type { Listing } from "../types";
import { MatchPreviewButton } from "./MatchPreviewButton";

interface QuickViewButtonProps {
	originalListing: Listing;
	matchedListing: Listing;
	matchScore?: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

/**
 * @deprecated Use MatchPreviewButton instead. This component is kept for backward compatibility.
 */
export const QuickViewButton: React.FC<QuickViewButtonProps> = ({
	originalListing,
	matchedListing,
	matchScore = 0,
	variant = "default",
	size = "sm",
	className = "",
}) => {
	return (
		<MatchPreviewButton
			originalListing={originalListing}
			matchedListing={matchedListing}
			matchScore={matchScore}
			variant={variant}
			size={size}
			className={className}
			text="Quick View"
		/>
	);
};
