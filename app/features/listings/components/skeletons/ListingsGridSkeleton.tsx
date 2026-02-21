import type React from "react";
import { ListingCardSkeleton } from "./ListingCardSkeleton";

/**
 * Skeleton placeholder that matches the ListingsGrid layout exactly.
 * Renders 6 ListingCardSkeleton components in the same responsive grid.
 */
export const ListingsGridSkeleton: React.FC = () => {
	return (
		<div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
				{Array.from({ length: 6 }).map((_, i) => (
					<ListingCardSkeleton key={i} />
				))}
			</div>
		</div>
	);
};
