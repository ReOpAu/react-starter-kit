import type React from "react";
import { Badge } from "../../../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import type { ConvexListing } from "../types";
import type { ListingTypeInfo } from "../utils/matchUtils";
import { getListingTypeLabel } from "../utils/matchUtils";
import { MatchSummary } from "./MatchSummary";

interface BasicComparisonSectionProps {
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	listingTypeInfo: ListingTypeInfo;
	score?: number;
	distance?: number;
	scoreBreakdown?: any;
}

export const BasicComparisonSection: React.FC<BasicComparisonSectionProps> = ({
	originalListing,
	matchedListing,
	listingTypeInfo,
	score,
	distance,
	scoreBreakdown,
}) => {
	const { isOriginalBuyer, isMatchedBuyer } = listingTypeInfo;

	// Determine listing types for labels
	const originalListingLabel = getListingTypeLabel(originalListing);
	const matchedListingLabel = getListingTypeLabel(matchedListing);

	const formatPrice = (listing: ConvexListing) => {
		return `$${listing.priceMin.toLocaleString()} - $${listing.priceMax.toLocaleString()}`;
	};

	return (
		<div className="space-y-8">
			{/* Match Summary with Score Breakdown */}
			<div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
				<MatchSummary
					originalListing={originalListing}
					matchedListing={matchedListing}
					overrideScore={score}
					overrideBreakdown={scoreBreakdown}
					showDetailedBreakdown={true}
				/>
			</div>

			{/* Side by side comparison */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Original Listing */}
				<Card className="overflow-hidden">
					<CardHeader
						className={`${
							isOriginalBuyer
								? "bg-gradient-to-r from-orange-50 to-orange-100"
								: "bg-gradient-to-r from-purple-50 to-purple-100"
						}`}
					>
						<CardTitle
							className={`${
								isOriginalBuyer ? "text-orange-700" : "text-purple-700"
							}`}
						>
							{originalListingLabel} Listing
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 space-y-4">
						<div>
							<h3 className="font-semibold text-lg">
								{originalListing.headline}
							</h3>
							<p className="text-gray-600">
								{originalListing.suburb}, {originalListing.state}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-500">Price:</span>
								<p className="font-medium">{formatPrice(originalListing)}</p>
							</div>
							<div>
								<span className="text-gray-500">Type:</span>
								<p className="font-medium">{originalListing.buildingType}</p>
							</div>
							<div>
								<span className="text-gray-500">Bedrooms:</span>
								<p className="font-medium">{originalListing.bedrooms}</p>
							</div>
							<div>
								<span className="text-gray-500">Parking:</span>
								<p className="font-medium">{originalListing.parking}</p>
							</div>
						</div>

						{originalListing.features &&
							originalListing.features.length > 0 && (
								<div>
									<span className="text-gray-500 text-sm">Features:</span>
									<div className="flex flex-wrap gap-1 mt-1">
										{originalListing.features.slice(0, 3).map((feature) => (
											<Badge
												key={feature}
												variant="secondary"
												className="text-xs"
											>
												{feature}
											</Badge>
										))}
										{originalListing.features.length > 3 && (
											<Badge variant="outline" className="text-xs">
												+{originalListing.features.length - 3} more
											</Badge>
										)}
									</div>
								</div>
							)}

						{originalListing.images && originalListing.images.length > 0 && (
							<img
								src={originalListing.images[0]}
								alt={originalListing.headline}
								className="w-full aspect-video object-cover rounded"
							/>
						)}
					</CardContent>
				</Card>

				{/* Matched Listing */}
				<Card className="overflow-hidden">
					<CardHeader
						className={`${
							isMatchedBuyer
								? "bg-gradient-to-r from-orange-50 to-orange-100"
								: "bg-gradient-to-r from-purple-50 to-purple-100"
						}`}
					>
						<CardTitle
							className={`${
								isMatchedBuyer ? "text-orange-700" : "text-purple-700"
							}`}
						>
							{matchedListingLabel} Listing
						</CardTitle>
					</CardHeader>
					<CardContent className="p-6 space-y-4">
						<div>
							<h3 className="font-semibold text-lg">
								{matchedListing.headline}
							</h3>
							<p className="text-gray-600">
								{matchedListing.suburb}, {matchedListing.state}
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<span className="text-gray-500">Price:</span>
								<p className="font-medium">{formatPrice(matchedListing)}</p>
							</div>
							<div>
								<span className="text-gray-500">Type:</span>
								<p className="font-medium">{matchedListing.buildingType}</p>
							</div>
							<div>
								<span className="text-gray-500">Bedrooms:</span>
								<p className="font-medium">{matchedListing.bedrooms}</p>
							</div>
							<div>
								<span className="text-gray-500">Parking:</span>
								<p className="font-medium">{matchedListing.parking}</p>
							</div>
						</div>

						{matchedListing.features && matchedListing.features.length > 0 && (
							<div>
								<span className="text-gray-500 text-sm">Features:</span>
								<div className="flex flex-wrap gap-1 mt-1">
									{matchedListing.features.slice(0, 3).map((feature) => (
										<Badge
											key={feature}
											variant="secondary"
											className="text-xs"
										>
											{feature}
										</Badge>
									))}
									{matchedListing.features.length > 3 && (
										<Badge variant="outline" className="text-xs">
											+{matchedListing.features.length - 3} more
										</Badge>
									)}
								</div>
							</div>
						)}

						{matchedListing.images && matchedListing.images.length > 0 && (
							<img
								src={matchedListing.images[0]}
								alt={matchedListing.headline}
								className="w-full aspect-video object-cover rounded"
							/>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default BasicComparisonSection;
