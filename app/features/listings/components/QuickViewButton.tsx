import React, { useState } from "react";
import { Button } from "../../../components/ui/button";
import { MatchPreviewModal } from "./MatchPreviewModal";
import { Eye } from "lucide-react";
import type { Listing } from "../types";

interface QuickViewButtonProps {
	originalListing: Listing;
	matchedListing: Listing;
	matchScore?: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export const QuickViewButton: React.FC<QuickViewButtonProps> = ({
	originalListing,
	matchedListing,
	matchScore = 0,
	variant = "default",
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
				Quick View
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