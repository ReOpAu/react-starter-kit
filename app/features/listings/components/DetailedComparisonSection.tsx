import { Check, X } from "lucide-react";
import type React from "react";
import { Badge } from "../../../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../../components/ui/table";
import type { ConvexListing } from "../types";
import type {
	ColorClasses,
	ListingTypeInfo,
	LocationInfo,
	PriceComparison,
} from "../utils/matchUtils";
import { getListingTypeLabel } from "../utils/matchUtils";
import { PropertyFeatures } from "./PropertyFeatures";

const ComparisonIcon: React.FC<{ val1: any; val2: any }> = ({ val1, val2 }) => {
	if (val1 === val2) {
		return <Check className="w-4 h-4 text-green-500" />;
	}
	return <X className="w-4 h-4 text-red-500" />;
};

const ComparisonCell: React.FC<{
	value: any;
	otherValue: any;
	label?: string;
}> = ({ value, otherValue, label }) => {
	const isMatch = value === otherValue;
	return (
		<TableCell className="text-center">
			<div className="flex items-center justify-center gap-2">
				<ComparisonIcon val1={value} val2={otherValue} />
				<span
					className={isMatch ? "font-medium text-green-700" : "text-gray-700"}
				>
					{label || value || "N/A"}
				</span>
			</div>
		</TableCell>
	);
};

const PriceCell: React.FC<{
	listing: ConvexListing;
	hasOverlap: boolean;
}> = ({ listing, hasOverlap }) => {
	return (
		<TableCell className="text-center">
			<div className="flex items-center justify-center gap-2">
				{hasOverlap ? (
					<Check className="w-4 h-4 text-green-500" />
				) : (
					<X className="w-4 h-4 text-red-500" />
				)}
				<div className="text-sm">
					<div
						className={
							hasOverlap ? "font-medium text-green-700" : "text-gray-700"
						}
					>
						${listing.priceMin.toLocaleString()} - $
						{listing.priceMax.toLocaleString()}
					</div>
				</div>
			</div>
		</TableCell>
	);
};

const FeaturesCell: React.FC<{
	features?: string[];
	originalFeatures?: string[];
	matchedFeatures?: string[];
}> = ({ features, originalFeatures, matchedFeatures }) => {
	if (!features || features.length === 0) {
		return (
			<TableCell className="text-center">
				<span className="text-gray-500">None listed</span>
			</TableCell>
		);
	}

	const commonFeatures =
		originalFeatures && matchedFeatures
			? features.filter(
					(feature: string) =>
						originalFeatures.includes(feature) &&
						matchedFeatures.includes(feature),
				)
			: [];

	return (
		<TableCell className="text-center">
			<div className="space-y-2">
				<div className="text-sm font-medium">{features.length} features</div>
				{commonFeatures.length > 0 && (
					<div className="flex flex-wrap gap-1 justify-center">
						{commonFeatures.slice(0, 3).map((feature: string) => (
							<Badge
								key={feature}
								className="bg-green-100 text-green-800 text-xs"
							>
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

const CommonFeaturesAnalysis: React.FC<{
	originalFeatures: string[];
	matchedFeatures: string[];
}> = ({ originalFeatures, matchedFeatures }) => {
	const commonFeatures = originalFeatures.filter((feature) =>
		matchedFeatures.includes(feature),
	);
	const totalUniqueFeatures = new Set([...originalFeatures, ...matchedFeatures])
		.size;
	const matchPercentage =
		totalUniqueFeatures > 0
			? Math.round((commonFeatures.length / totalUniqueFeatures) * 100)
			: 0;

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-4">
				<div className="text-sm">
					<span className="font-medium">{commonFeatures.length}</span> common
					features
				</div>
				<div className="text-sm">
					<span className="font-medium">{matchPercentage}%</span> feature
					compatibility
				</div>
			</div>
			{commonFeatures.length > 0 ? (
				<div className="flex flex-wrap gap-2">
					{commonFeatures.map((feature: string) => (
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
};

const BuyerDetailsRow: React.FC<{
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	listingTypeInfo: ListingTypeInfo;
}> = ({ originalListing, matchedListing, listingTypeInfo }) => {
	if (!listingTypeInfo.isOriginalBuyer && !listingTypeInfo.isMatchedBuyer) {
		return null;
	}
	return (
		<TableRow className="border-b-2">
			<TableCell className="font-medium bg-gray-50">Buyer Details</TableCell>
			<TableCell className="text-center">
				{listingTypeInfo.isOriginalBuyer ? (
					<div className="space-y-1">
						<Badge variant="outline">{originalListing.buyerType}</Badge>
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
						<Badge variant="outline">{matchedListing.buyerType}</Badge>
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
	);
};

const ListingStatusRows: React.FC<{
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
}> = ({ originalListing, matchedListing }) => (
	<>
		<TableRow>
			<TableCell className="font-medium">Status</TableCell>
			<TableCell className="text-center">
				<Badge variant={originalListing.isActive ? "default" : "secondary"}>
					{originalListing.isActive ? "Active" : "Inactive"}
				</Badge>
				{originalListing.isPremium && (
					<Badge className="ml-2 bg-yellow-100 text-yellow-800">Premium</Badge>
				)}
			</TableCell>
			<TableCell className="text-center">
				<Badge variant={matchedListing.isActive ? "default" : "secondary"}>
					{matchedListing.isActive ? "Active" : "Inactive"}
				</Badge>
				{matchedListing.isPremium && (
					<Badge className="ml-2 bg-yellow-100 text-yellow-800">Premium</Badge>
				)}
			</TableCell>
		</TableRow>
		<TableRow>
			<TableCell className="font-medium">Listed Date</TableCell>
			<TableCell className="text-center text-sm text-gray-600">
				{new Date(originalListing.createdAt).toLocaleDateString()}
			</TableCell>
			<TableCell className="text-center text-sm text-gray-600">
				{new Date(matchedListing.createdAt).toLocaleDateString()}
			</TableCell>
		</TableRow>
	</>
);

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

export const DetailedComparisonSection: React.FC<
	DetailedComparisonSectionProps
> = ({
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
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					<span>Detailed Property Comparison</span>
					{locationInfo.sameSuburb && (
						<Badge className="bg-green-100 text-green-800">Same Suburb</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="font-semibold">
									Property Details
								</TableHead>
								<TableHead
									className={`text-center font-semibold ${listingTypeInfo.isOriginalBuyer ? "text-orange-700" : "text-purple-700"}`}
								>
									{getListingTypeLabel(originalListing)} Listing
								</TableHead>
								<TableHead
									className={`text-center font-semibold ${listingTypeInfo.isMatchedBuyer ? "text-orange-700" : "text-purple-700"}`}
								>
									{getListingTypeLabel(matchedListing)} Listing
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{/* Basic Information */}
							<TableRow className="border-b-2">
								<TableCell className="font-medium bg-gray-50">
									Listing Type
								</TableCell>
								<TableCell className="text-center">
									<Badge
										variant={
											listingTypeInfo.isOriginalBuyer ? "default" : "secondary"
										}
									>
										{originalListing.listingType}
									</Badge>
								</TableCell>
								<TableCell className="text-center">
									<Badge
										variant={
											listingTypeInfo.isMatchedBuyer ? "default" : "secondary"
										}
									>
										{matchedListing.listingType}
									</Badge>
								</TableCell>
							</TableRow>

							{/* Location Details */}
							<TableRow>
								<TableCell className="font-medium">Suburb</TableCell>
								<ComparisonCell
									value={originalListing.suburb}
									otherValue={matchedListing.suburb}
								/>
								<ComparisonCell
									value={matchedListing.suburb}
									otherValue={originalListing.suburb}
								/>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">State</TableCell>
								<ComparisonCell
									value={originalListing.state}
									otherValue={matchedListing.state}
								/>
								<ComparisonCell
									value={matchedListing.state}
									otherValue={originalListing.state}
								/>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Postcode</TableCell>
								<ComparisonCell
									value={originalListing.postcode}
									otherValue={matchedListing.postcode}
								/>
								<ComparisonCell
									value={matchedListing.postcode}
									otherValue={originalListing.postcode}
								/>
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
								<TableCell className="font-medium bg-gray-50">
									Building Type
								</TableCell>
								<ComparisonCell
									value={originalListing.buildingType}
									otherValue={matchedListing.buildingType}
								/>
								<ComparisonCell
									value={matchedListing.buildingType}
									otherValue={originalListing.buildingType}
								/>
							</TableRow>

							{/* Property Specifications */}
							<TableRow>
								<TableCell className="font-medium">Bedrooms</TableCell>
								<ComparisonCell
									value={originalListing.bedrooms}
									otherValue={matchedListing.bedrooms}
								/>
								<ComparisonCell
									value={matchedListing.bedrooms}
									otherValue={originalListing.bedrooms}
								/>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Bathrooms</TableCell>
								<ComparisonCell
									value={originalListing.bathrooms}
									otherValue={matchedListing.bathrooms}
								/>
								<ComparisonCell
									value={matchedListing.bathrooms}
									otherValue={originalListing.bathrooms}
								/>
							</TableRow>
							<TableRow>
								<TableCell className="font-medium">Parking Spaces</TableCell>
								<ComparisonCell
									value={originalListing.parking}
									otherValue={matchedListing.parking}
								/>
								<ComparisonCell
									value={matchedListing.parking}
									otherValue={originalListing.parking}
								/>
							</TableRow>

							{/* Price Comparison */}
							<TableRow className="border-b-2">
								<TableCell className="font-medium bg-gray-50">
									Price Range
								</TableCell>
								<PriceCell
									listing={originalListing}
									hasOverlap={priceComparison.hasOverlap}
								/>
								<PriceCell
									listing={matchedListing}
									hasOverlap={priceComparison.hasOverlap}
								/>
							</TableRow>

							{/* Price Analysis */}
							<TableRow>
								<TableCell className="font-medium">
									Price Compatibility
								</TableCell>
								<TableCell className="text-center" colSpan={2}>
									<div className="space-y-2">
										<div className="flex items-center justify-center gap-2">
											<ComparisonIcon
												val1={priceComparison.hasOverlap}
												val2={true}
											/>
											<span
												className={
													priceComparison.hasOverlap
														? "text-green-700 font-medium"
														: "text-red-700"
												}
											>
												{priceComparison.comparisonText}
											</span>
										</div>
										{priceComparison.hasOverlap && (
											<Badge className="bg-green-100 text-green-800">
												{priceComparison.overlapPercentage.toFixed(0)}% price
												overlap
											</Badge>
										)}
									</div>
								</TableCell>
							</TableRow>

							{/* Property Features */}
							<TableRow>
								<TableCell className="font-medium">Features</TableCell>
								<FeaturesCell
									features={originalListing.features}
									originalFeatures={originalListing.features}
									matchedFeatures={matchedListing.features}
								/>
								<FeaturesCell
									features={matchedListing.features}
									originalFeatures={originalListing.features}
									matchedFeatures={matchedListing.features}
								/>
							</TableRow>

							{/* Buyer-specific details */}
							<BuyerDetailsRow
								originalListing={originalListing}
								matchedListing={matchedListing}
								listingTypeInfo={listingTypeInfo}
							/>

							{/* Listing Status & Created Date */}
							<ListingStatusRows
								originalListing={originalListing}
								matchedListing={matchedListing}
							/>
						</TableBody>
					</Table>
				</div>

				{/* Common Features Section */}
				{originalListing.features && matchedListing.features && (
					<div className="mt-6 pt-4 border-t">
						<h4 className="font-medium mb-3">Common Features Analysis</h4>
						<CommonFeaturesAnalysis
							originalFeatures={originalListing.features}
							matchedFeatures={matchedListing.features}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default DetailedComparisonSection;
