import type React from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Separator } from "../../../../components/ui/separator";

/**
 * Skeleton placeholder that matches the MatchDetailPage layout.
 * Mirrors: navigation, title section, comparison sections, distance card.
 */
export const MatchDetailSkeleton: React.FC = () => {
	return (
		<div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
				<div className="space-y-8">
					{/* Navigation Section */}
					<div className="mb-8 flex items-center gap-4">
						<div className="h-9 w-36 bg-gray-200 rounded-md animate-pulse" />
						<div className="h-9 w-36 bg-gray-200 rounded-md animate-pulse" />
					</div>

					{/* Main Content */}
					<div className="space-y-8">
						{/* Title Section */}
						<div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
							<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
								{/* Left side - listings summary */}
								<div className="flex-1 space-y-3">
									<div className="flex items-center gap-3">
										<div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
										<div className="h-6 w-8 bg-gray-200 rounded animate-pulse" />
										<div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
									</div>
									<div className="flex gap-2">
										<div className="h-5 w-14 bg-gray-200 rounded-full animate-pulse" />
										<div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
									</div>
								</div>
								{/* Right side - score */}
								<div className="h-16 w-16 bg-gray-200 rounded-full animate-pulse" />
							</div>
						</div>

						{/* Basic Comparison Section */}
						<Card>
							<CardContent className="pt-6">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{/* Original listing */}
									<div className="space-y-4">
										<div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
										<Separator />
										<div className="space-y-2">
											<div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
											<div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
											<div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
										</div>
										<div className="space-y-2">
											{[1, 2, 3, 4].map((i) => (
												<div key={i} className="flex justify-between py-1">
													<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
													<div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
												</div>
											))}
										</div>
									</div>

									{/* Matched listing */}
									<div className="space-y-4">
										<div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
										<Separator />
										<div className="space-y-2">
											<div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
											<div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
											<div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
										</div>
										<div className="space-y-2">
											{[1, 2, 3, 4].map((i) => (
												<div key={i} className="flex justify-between py-1">
													<div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
													<div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
												</div>
											))}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Detailed Comparison Section */}
						<Card>
							<CardContent className="pt-6">
								<div className="space-y-4">
									<div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
									<div className="grid grid-cols-3 gap-4">
										{[1, 2, 3, 4, 5, 6].map((i) => (
											<div
												key={i}
												className="space-y-2 p-3 bg-gray-50 rounded-lg"
											>
												<div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
												<div className="h-5 w-full bg-gray-200 rounded animate-pulse" />
											</div>
										))}
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Distance card */}
						<Card>
							<CardContent className="pt-6">
								<div className="flex items-center gap-2">
									<div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
									<div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
									<div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
};
