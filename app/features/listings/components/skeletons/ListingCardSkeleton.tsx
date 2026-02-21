import type React from "react";
import { Card, CardContent } from "../../../../components/ui/card";

/**
 * Skeleton placeholder that matches the ListingCard layout exactly.
 * Uses animate-pulse on bg-gray-200 elements for shimmer effect.
 */
export const ListingCardSkeleton: React.FC = () => {
	return (
		<Card className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			{/* Map preview placeholder */}
			<div className="h-64 relative -m-6 mb-6">
				<div className="w-full h-full rounded-t-2xl bg-gray-200 animate-pulse" />
			</div>

			<CardContent className="p-6 space-y-4">
				{/* Badges */}
				<div className="flex flex-wrap gap-2 items-center">
					<div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
					<div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
				</div>

				{/* Headline - two lines, different widths */}
				<div className="space-y-2">
					<div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
					<div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
				</div>

				{/* Location */}
				<div className="h-5 w-2/3 bg-gray-200 rounded animate-pulse" />

				{/* Price */}
				<div className="h-7 w-1/2 bg-gray-200 rounded animate-pulse" />

				{/* Property icons row (building type, bed, bath, parking) */}
				<div className="flex flex-wrap gap-x-6 gap-y-2">
					<div className="flex items-center gap-1">
						<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
					</div>
					<div className="flex items-center gap-1">
						<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
					</div>
					<div className="flex items-center gap-1">
						<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
					</div>
					<div className="flex items-center gap-1">
						<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
					</div>
				</div>

				{/* Features pills */}
				<div className="flex flex-wrap gap-1">
					<div className="h-6 w-16 bg-gray-200 rounded-md animate-pulse" />
					<div className="h-6 w-20 bg-gray-200 rounded-md animate-pulse" />
					<div className="h-6 w-14 bg-gray-200 rounded-md animate-pulse" />
				</div>

				{/* Footer date */}
				<div className="pt-4 border-t border-gray-100">
					<div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
				</div>
			</CardContent>
		</Card>
	);
};
