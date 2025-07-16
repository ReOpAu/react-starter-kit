import { useMutation, useQuery } from "convex/react";
import { Heart } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/button";

export interface SaveButtonProps {
	listingId: Id<"listings">;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ listingId }) => {
	const [isOptimistic, setIsOptimistic] = useState(false);

	// Check if listing is saved (this would need to be implemented in convex)
	const isSaved = useQuery(api.listings.isListingSaved, { listingId }) ?? false;

	// Save/unsave mutations (these would need to be implemented)
	const saveListing = useMutation(api.listings.saveListing);
	const unsaveListing = useMutation(api.listings.unsaveListing);

	const handleClick = async (e: React.MouseEvent) => {
		e.preventDefault(); // Prevent navigation when clicking save button
		e.stopPropagation();

		setIsOptimistic(!isSaved);

		try {
			if (isSaved) {
				await unsaveListing({ listingId });
			} else {
				await saveListing({ listingId });
			}
		} catch (error) {
			// Revert optimistic update on error
			setIsOptimistic(isSaved);
			console.error("Failed to save/unsave listing:", error);
		}
	};

	const displaySaved = isOptimistic !== isSaved ? isOptimistic : isSaved;

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleClick}
			className="h-8 w-8 rounded-full bg-white/80 hover:bg-white/90"
		>
			<Heart
				className={`h-4 w-4 ${
					displaySaved ? "fill-red-500 text-red-500" : "text-gray-600"
				}`}
			/>
		</Button>
	);
};
