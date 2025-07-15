import React, { useState } from "react";
import { Button } from "../../../components/ui/button";
import { MatchPreviewModal } from "./MatchPreviewModal";
import { Eye } from "lucide-react";
import type { Listing } from "../types";

interface MatchPreviewButtonProps {
	originalListing: Listing;
	matchedListing: Listing;
	matchScore?: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export const MatchPreviewButton: React.FC<MatchPreviewButtonProps> = ({
	originalListing,
	matchedListing,
	matchScore = 0,
	variant = "outline",
	size = "sm",
	className = "",
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setIsModalOpen(true)}
				className={className}
			>
				<Eye className="w-4 h-4 mr-2" />
				Quick Preview
			</Button>

			<MatchPreviewModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				originalListing={originalListing}
				matchedListing={matchedListing}
				matchScore={matchScore}
			/>
		</>
	);
};