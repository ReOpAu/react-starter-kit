import type React from "react";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Separator } from "../../../../components/ui/separator";

/**
 * Skeleton placeholder that matches the ListingDetailPage layout exactly.
 * Mirrors: back button, breadcrumbs, 3-column grid (main col-span-2, sidebar col-span-1).
 */
export const ListingDetailSkeleton: React.FC = () => {
	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				{/* Header with navigation */}
				<div className="flex items-center gap-4 mb-8">
					{/* Back button */}
					<div className="h-9 w-36 bg-gray-200 rounded-md animate-pulse" />
					{/* Breadcrumb shimmer */}
					<div className="flex items-center gap-2">
						<div className="h-4 w-10 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-2 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-2 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-2 bg-gray-200 rounded animate-pulse" />
						<div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
					</div>
				</div>

				{/* Main content area - 3-column grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main listing content (col-span-2) */}
					<div className="lg:col-span-2 space-y-6">
						{/* Location Map Card */}
						<Card>
							<CardHeader>
								<div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{/* Map placeholder */}
									<div className="w-full h-[300px] bg-gray-200 rounded-lg animate-pulse" />
									{/* Street view button */}
									<div className="flex justify-center">
										<div className="h-9 w-32 bg-gray-200 rounded-md animate-pulse" />
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Main Details Card */}
						<Card>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="space-y-3 flex-1">
										{/* Title */}
										<div className="h-7 w-3/4 bg-gray-200 rounded animate-pulse" />
										{/* Badges */}
										<div className="flex gap-2">
											<div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
											<div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
										</div>
										{/* Location */}
										<div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse" />
									</div>
									{/* Price */}
									<div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
								</div>
							</CardHeader>
							<CardContent>
								{/* Description */}
								<div className="space-y-2 mb-4">
									<div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
									<div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
									<div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
								</div>

								<Separator className="my-4" />

								{/* Property Details Table */}
								<div className="mb-6">
									<div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-3" />
									<div className="space-y-3">
										{[1, 2, 3, 4].map((i) => (
											<div
												key={i}
												className="flex justify-between py-2 border-b border-gray-50"
											>
												<div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
												<div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
											</div>
										))}
									</div>
								</div>

								<Separator className="my-4" />

								{/* Features */}
								<div className="flex flex-wrap gap-2">
									{[1, 2, 3, 4, 5].map((i) => (
										<div
											key={i}
											className="h-7 w-20 bg-gray-200 rounded-md animate-pulse"
										/>
									))}
								</div>

								<Separator className="my-4" />

								{/* Metadata dates */}
								<div className="space-y-1">
									<div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
									<div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar (col-span-1) */}
					<div className="lg:col-span-1">
						<Card className="sticky top-4">
							<CardHeader>
								<div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
							</CardHeader>
							<CardContent className="space-y-4">
								{/* Save button */}
								<div className="flex justify-center">
									<div className="h-9 w-24 bg-gray-200 rounded-md animate-pulse" />
								</div>
								<Separator />
								{/* Contact button */}
								<div className="h-9 w-full bg-gray-200 rounded-md animate-pulse" />
								<Separator />
								{/* Street view button */}
								<div className="h-9 w-full bg-gray-200 rounded-md animate-pulse" />
								<Separator />
								{/* Nearby places button */}
								<div className="h-9 w-full bg-gray-200 rounded-md animate-pulse" />
								<Separator />
								{/* View matches button */}
								<div className="h-9 w-full bg-gray-200 rounded-md animate-pulse" />
								{/* Listing metadata */}
								<div className="space-y-1">
									<div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};
