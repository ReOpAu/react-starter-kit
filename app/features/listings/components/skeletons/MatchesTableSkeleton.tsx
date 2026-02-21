import type React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../../components/ui/table";

/**
 * Skeleton placeholder for the matches table on MatchesPage.
 * Renders 6 shimmer rows matching the table column layout.
 */
export const MatchesTableSkeleton: React.FC = () => {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Property</TableHead>
					<TableHead>Match Score</TableHead>
					<TableHead>Location</TableHead>
					<TableHead>Distance</TableHead>
					<TableHead>Price</TableHead>
					<TableHead>Details</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: 6 }).map((_, i) => (
					<TableRow key={i}>
						{/* Property */}
						<TableCell>
							<div className="space-y-2">
								<div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
								<div className="flex gap-1">
									<div className="h-5 w-12 bg-gray-200 rounded-full animate-pulse" />
									<div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
								</div>
							</div>
						</TableCell>
						{/* Match Score */}
						<TableCell>
							<div className="h-8 w-12 bg-gray-200 rounded animate-pulse" />
						</TableCell>
						{/* Location */}
						<TableCell>
							<div className="space-y-1">
								<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
								<div className="h-3 w-10 bg-gray-200 rounded animate-pulse" />
							</div>
						</TableCell>
						{/* Distance */}
						<TableCell>
							<div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
						</TableCell>
						{/* Price */}
						<TableCell>
							<div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
						</TableCell>
						{/* Details */}
						<TableCell>
							<div className="space-y-1">
								<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
								<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
							</div>
						</TableCell>
						{/* Actions */}
						<TableCell>
							<div className="flex gap-2">
								<div className="h-8 w-16 bg-gray-200 rounded-md animate-pulse" />
								<div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
};
