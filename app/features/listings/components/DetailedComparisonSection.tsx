import type React from "react";
import { Check, X } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../components/ui/table";
import type { ConvexListing } from "../types";
import type { ColorClasses, ListingTypeInfo, LocationInfo, PriceComparison } from "../utils/matchUtils";
import { getListingTypeLabel } from "../utils/matchUtils";
import { PropertyFeatures } from "./PropertyFeatures";

interface DetailedComparisonSectionProps {
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	listingTypeInfo: ListingTypeInfo;
	colorClasses: ColorClasses;
	locationInfo: LocationInfo;
	priceComparison: PriceComparison;
	score?: number;
	distance?: number;
	scoreBreakdown?: any;
}

export const DetailedComparisonSection: React.FC<DetailedComparisonSectionProps> = ({
	originalListing,
	matchedListing,
	listingTypeInfo,
	colorClasses,
	locationInfo,
	priceComparison,
	score,
	distance,
	scoreBreakdown,
}) => {
	const renderComparisonIcon = (val1: any, val2: any) => {
		if (val1 === val2) {
			return <Check className="w-4 h-4 text-green-500" />;
		}
		return <X className="w-4 h-4 text-red-500" />;
	};

	const renderComparisonCell = (value: any, otherValue: any, label?: string) => {
		const isMatch = value === otherValue;
		return (
			<TableCell className="text-center">
				<div className="flex items-center justify-center gap-2">
					{renderComparisonIcon(value, otherValue)}
					<span className={isMatch ? "font-medium text-green-700" : "text-gray-700"}>
						{label || value || "N/A"}
					</span>
				</div>
			</TableCell>
		);
	};

	const renderPriceCell = (listing: ConvexListing) => {
		return (
			<TableCell className="text-center">
				<div className="flex items-center justify-center gap-2">
					{priceComparison.hasOverlap ? (
						<Check className="w-4 h-4 text-green-500" />
					) : (
						<X className="w-4 h-4 text-red-500" />
					)}
					<div className="text-sm">
						<div className={priceComparison.hasOverlap ? "font-medium text-green-700" : "text-gray-700"}>
							${listing.priceMin.toLocaleString()} - ${listing.priceMax.toLocaleString()}
						</div>
					</div>
				</div>
			</TableCell>
		);
	};

	const renderFeaturesCell = (features?: string[]) => {
		if (!features || features.length === 0) {
			return (
				<TableCell className="text-center">
					<span className="text-gray-500">None listed</span>
				</TableCell>
			);
		}

		const commonFeatures = originalListing.features && matchedListing.features
			? features.filter(feature => 
				originalListing.features?.includes(feature) && 
				matchedListing.features?.includes(feature)
			)
			: [];

		return (
			<TableCell className="text-center">
				<div className="space-y-2">
					<div className="text-sm font-medium">{features.length} features</div>
					{commonFeatures.length > 0 && (
						<div className="flex flex-wrap gap-1 justify-center">
							{commonFeatures.slice(0, 3).map(feature => (
								<Badge key={feature} className="bg-green-100 text-green-800 text-xs">
									{feature}
								</Badge>
							))}
							{commonFeatures.length > 3 && (
								<Badge variant="outline" className="text-xs">
									+{commonFeatures.length - 3}
								</Badge>
							)}
						</div>
					)}
				</div>
			</TableCell>
		);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Detailed Property Comparison</span>
					{locationInfo.sameSuburb && (
						<Badge className="bg-green-100 text-green-800">
							Same Suburb
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="font-semibold">Property Details</TableHead>
								<TableHead className={`text-center font-semibold ${listingTypeInfo.isOriginalBuyer ? "text-orange-700" : "text-purple-700"}`}>
									{getListingTypeLabel(originalListing)} Listing
								</TableHead>
								<TableHead className={`text-center font-semibold ${listingTypeInfo.isMatchedBuyer ? "text-orange-700" : "text-purple-700"}`}>
									{getListingTypeLabel(matchedListing)} Listing
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{/* Basic Information */}
							<TableRow className="border-b-2">
								<TableCell className="font-medium bg-gray-50">Listing Type</TableCell>
								<TableCell className="text-center">
									<Badge variant={listingTypeInfo.isOriginalBuyer ? "default" : "secondary"}>
										{originalListing.listingType}
									</Badge>
								</TableCell>
								<TableCell className="text-center">
									<Badge variant={listingTypeInfo.isMatchedBuyer ? "default" : "secondary"}>
										{matchedListing.listingType}
									</Badge>
								</TableCell>
							</TableRow>

							{/* Location Details */}
							<TableRow>
								<TableCell className="font-medium">Suburb</TableCell>
								{renderComparisonCell(originalListing.suburb, matchedListing.suburb)}
								{renderComparisonCell(matchedListing.suburb, originalListing.suburb)}
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">State</TableCell>
								{renderComparisonCell(originalListing.state, matchedListing.state)}
								{renderComparisonCell(matchedListing.state, originalListing.state)}
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Postcode</TableCell>
								{renderComparisonCell(originalListing.postcode, matchedListing.postcode)}
								{renderComparisonCell(matchedListing.postcode, originalListing.postcode)}
							</TableRow>

							{/* Distance Information */}
							{distance !== undefined && (
								<TableRow>
									<TableCell className="font-medium">Distance Apart</TableCell>
									<TableCell className="text-center" colSpan={2}>
										<Badge variant="outline" className="text-sm">
											{locationInfo.distanceText}
										</Badge>
									</TableCell>
								</TableRow>
							)}

							{/* Property Type */}
							<TableRow className="border-b-2">
								<TableCell className="font-medium bg-gray-50">Building Type</TableCell>
								{renderComparisonCell(originalListing.buildingType, matchedListing.buildingType)}
								{renderComparisonCell(matchedListing.buildingType, originalListing.buildingType)}
							</TableRow>

							{/* Property Specifications */}
							<TableRow>
								<TableCell className="font-medium">Bedrooms</TableCell>
								{renderComparisonCell(originalListing.bedrooms, matchedListing.bedrooms)}
								{renderComparisonCell(matchedListing.bedrooms, originalListing.bedrooms)}
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Bathrooms</TableCell>
								{renderComparisonCell(originalListing.bathrooms, matchedListing.bathrooms)}
								{renderComparisonCell(matchedListing.bathrooms, originalListing.bathrooms)}
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Parking Spaces</TableCell>
								{renderComparisonCell(originalListing.parking, matchedListing.parking)}
								{renderComparisonCell(matchedListing.parking, originalListing.parking)}
							</TableRow>

							{/* Price Comparison */}
							<TableRow className="border-b-2">
								<TableCell className="font-medium bg-gray-50">Price Range</TableCell>
								{renderPriceCell(originalListing)}
								{renderPriceCell(matchedListing)}
							</TableRow>

							{/* Price Analysis */}
							<TableRow>
								<TableCell className="font-medium">Price Compatibility</TableCell>
								<TableCell className="text-center" colSpan={2}>
									<div className="space-y-2">
										<div className="flex items-center justify-center gap-2">
											{priceComparison.hasOverlap ? (
												<Check className="w-4 h-4 text-green-500" />
											) : (
												<X className="w-4 h-4 text-red-500" />
											)}
											<span className={priceComparison.hasOverlap ? "text-green-700 font-medium" : "text-red-700"}>
												{priceComparison.comparisonText}
											</span>
										</div>
										{priceComparison.hasOverlap && (
											<Badge className="bg-green-100 text-green-800">
												{priceComparison.overlapPercentage.toFixed(0)}% price overlap
											</Badge>
										)}
									</div>
								</TableCell>
							</TableRow>

							{/* Property Features */}
							<TableRow>
								<TableCell className="font-medium">Features</TableCell>
								{renderFeaturesCell(originalListing.features)}
								{renderFeaturesCell(matchedListing.features)}
							</TableRow>

							{/* Buyer-specific details */}
							{(listingTypeInfo.isOriginalBuyer || listingTypeInfo.isMatchedBuyer) && (
								<>
									<TableRow className="border-b-2">
										<TableCell className="font-medium bg-gray-50">Buyer Details</TableCell>
										<TableCell className="text-center">
											{listingTypeInfo.isOriginalBuyer ? (
												<div className="space-y-1">
													<Badge variant="outline">
														{originalListing.buyerType}
													</Badge>
													{originalListing.searchRadius && (
														<div className="text-sm text-gray-600">
															{originalListing.searchRadius}km radius
														</div>
													)}
												</div>
											) : (
												<span className="text-gray-500">Seller listing</span>
											)}
										</TableCell>
										<TableCell className="text-center">
											{listingTypeInfo.isMatchedBuyer ? (
												<div className="space-y-1">
													<Badge variant="outline">
														{matchedListing.buyerType}
													</Badge>
													{matchedListing.searchRadius && (
														<div className="text-sm text-gray-600">
															{matchedListing.searchRadius}km radius
														</div>
													)}
												</div>
											) : (
												<span className="text-gray-500">Seller listing</span>
											)}
										</TableCell>
									</TableRow>
								</>
							)}

							{/* Listing Status */}
							<TableRow>
								<TableCell className="font-medium">Status</TableCell>
								<TableCell className="text-center">
									<Badge variant={originalListing.isActive ? "default" : "secondary"}>
										{originalListing.isActive ? "Active" : "Inactive"}
									</Badge>
									{originalListing.isPremium && (
										<Badge className="ml-2 bg-yellow-100 text-yellow-800">
											Premium
										</Badge>
									)}
								</TableCell>
								<TableCell className="text-center">
									<Badge variant={matchedListing.isActive ? "default" : "secondary"}>
										{matchedListing.isActive ? "Active" : "Inactive"}
									</Badge>
									{matchedListing.isPremium && (
										<Badge className="ml-2 bg-yellow-100 text-yellow-800">
											Premium
										</Badge>
									)}
								</TableCell>
							</TableRow>

							{/* Created Date */}
							<TableRow>
								<TableCell className="font-medium">Listed Date</TableCell>
								<TableCell className="text-center text-sm text-gray-600">
									{new Date(originalListing.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell className="text-center text-sm text-gray-600">
									{new Date(matchedListing.createdAt).toLocaleDateString()}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</div>

				{/* Common Features Section */}
				{originalListing.features && matchedListing.features && (
					<div className="mt-6 pt-4 border-t">
						<h4 className="font-medium mb-3">Common Features Analysis</h4>
						{(() => {
							const commonFeatures = originalListing.features.filter(feature => 
								matchedListing.features?.includes(feature)
							);
							const totalUniqueFeatures = new Set([
								...(originalListing.features || []),
								...(matchedListing.features || [])
							]).size;
							const matchPercentage = totalUniqueFeatures > 0 
								? Math.round((commonFeatures.length / totalUniqueFeatures) * 100)
								: 0;

							return (
								<div className="space-y-3">
									<div className="flex items-center gap-4">
										<div className="text-sm">
											<span className="font-medium">{commonFeatures.length}</span> common features
										</div>
										<div className="text-sm">
											<span className="font-medium">{matchPercentage}%</span> feature compatibility
										</div>
									</div>
									{commonFeatures.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{commonFeatures.map(feature => (
												<Badge key={feature} className="bg-green-100 text-green-800">
													{feature}
												</Badge>
											))}
										</div>
									) : (
										<p className="text-gray-500 text-sm">No common features found</p>
									)}
								</div>
							);
						})()}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default DetailedComparisonSection;