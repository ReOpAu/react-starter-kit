import { DollarSign, Eye, Home, MapPin, Star, Users, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "../../../components/ui/dialog";
import { Progress } from "../../../components/ui/progress";
import { Separator } from "../../../components/ui/separator";
import { useMatchComparison } from "../hooks/useMatchComparison";
import type { ConvexListing } from "../types";
import {
	generateListingUrl,
	generateMatchDetailUrl,
} from "../utils/urlHelpers";

interface MatchPreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	matchScore?: number;
}

export const MatchPreviewModal: React.FC<MatchPreviewModalProps> = ({
	isOpen,
	onClose,
	originalListing,
	matchedListing,
	matchScore = 0,
}) => {
	const [loading, setLoading] = useState(false);

	// Use custom hook for match comparison calculations
	const {
		priceComparison,
		propertyComparison,
		featureComparison,
		distance,
		distanceDisplay,
	} = useMatchComparison(originalListing, matchedListing);

	const getScoreColor = (score: number) => {
		if (score >= 80) return "text-green-600";
		if (score >= 60) return "text-yellow-600";
		return "text-red-600";
	};

	const getScoreBgColor = (score: number) => {
		if (score >= 80) return "bg-green-100";
		if (score >= 60) return "bg-yellow-100";
		return "bg-red-100";
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl w-[90vw] h-[85vh] max-h-[85vh] overflow-hidden">
				<DialogHeader>
					<DialogTitle className="flex items-center justify-between">
						Property Match Preview
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="h-6 w-6 p-0"
						>
							<X className="h-4 w-4" />
						</Button>
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-auto space-y-6">
					{/* Match Score Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center justify-between">
								<span className="flex items-center gap-2">
									<Star className="w-5 h-5" />
									Match Score
								</span>
								<div
									className={`px-3 py-1 rounded-full ${getScoreBgColor(matchScore)}`}
								>
									<span className={`font-bold ${getScoreColor(matchScore)}`}>
										{Math.round(matchScore)}%
									</span>
								</div>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Progress value={matchScore} className="mb-4" />
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="font-medium">Distance:</span>{" "}
									{distanceDisplay}
								</div>
								<div>
									<span className="font-medium">Same Suburb:</span>{" "}
									{originalListing.suburb === matchedListing.suburb
										? "Yes"
										: "No"}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Listing Comparison */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Original Listing */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Home className="w-4 h-4" />
									Original Listing
									<Badge
										variant={
											originalListing.listingType === "buyer"
												? "default"
												: "secondary"
										}
									>
										{originalListing.listingType}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<h4 className="font-semibold">{originalListing.headline}</h4>
								<div className="flex items-center gap-1 text-sm text-gray-600">
									<MapPin className="w-4 h-4" />
									{originalListing.suburb}, {originalListing.state}
								</div>
								<div className="text-sm">
									{originalListing.propertyDetails.bedrooms} bed •{" "}
									{originalListing.propertyDetails.bathrooms} bath •{" "}
									{originalListing.propertyDetails.parkingSpaces} car
								</div>
								{(originalListing.price || originalListing.pricePreference) && (
									<div className="flex items-center gap-1 text-sm">
										<DollarSign className="w-4 h-4" />$
										{(originalListing.price ||
											originalListing.pricePreference)!.min.toLocaleString()}{" "}
										- $
										{(originalListing.price ||
											originalListing.pricePreference)!.max.toLocaleString()}
									</div>
								)}
							</CardContent>
						</Card>

						{/* Matched Listing */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Home className="w-4 h-4" />
									Matched Listing
									<Badge
										variant={
											matchedListing.listingType === "buyer"
												? "default"
												: "secondary"
										}
									>
										{matchedListing.listingType}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<h4 className="font-semibold">{matchedListing.headline}</h4>
								<div className="flex items-center gap-1 text-sm text-gray-600">
									<MapPin className="w-4 h-4" />
									{matchedListing.suburb}, {matchedListing.state}
								</div>
								<div className="text-sm">
									{matchedListing.propertyDetails.bedrooms} bed •{" "}
									{matchedListing.propertyDetails.bathrooms} bath •{" "}
									{matchedListing.propertyDetails.parkingSpaces} car
								</div>
								{(matchedListing.price || matchedListing.pricePreference) && (
									<div className="flex items-center gap-1 text-sm">
										<DollarSign className="w-4 h-4" />$
										{(matchedListing.price ||
											matchedListing.pricePreference)!.min.toLocaleString()}{" "}
										- $
										{(matchedListing.price ||
											matchedListing.pricePreference)!.max.toLocaleString()}
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Price Comparison */}
					{priceComparison && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<DollarSign className="w-5 h-5" />
									Price Comparison
									<Badge
										variant={
											priceComparison.overlap ? "default" : "destructive"
										}
									>
										{priceComparison.overlap ? "Overlap" : "No Overlap"}
									</Badge>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm">
									<div>
										<span className="font-medium">Average Difference:</span> $
										{priceComparison.difference.toLocaleString()}
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<span className="font-medium">Original Range:</span>
											<br />${priceComparison.original.min.toLocaleString()} - $
											{priceComparison.original.max.toLocaleString()}
										</div>
										<div>
											<span className="font-medium">Match Range:</span>
											<br />${priceComparison.match.min.toLocaleString()} - $
											{priceComparison.match.max.toLocaleString()}
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Property Details Comparison */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Home className="w-5 h-5" />
								Property Details
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-3 gap-4 text-sm">
								<div className="text-center">
									<div className="font-medium">Bedrooms</div>
									<div className="text-lg font-bold">
										{propertyComparison.bedrooms.original} |{" "}
										{propertyComparison.bedrooms.match}
									</div>
									<Badge
										variant={
											propertyComparison.bedrooms.matches
												? "default"
												: "destructive"
										}
										className="text-xs"
									>
										{propertyComparison.bedrooms.matches
											? "Match"
											: "Different"}
									</Badge>
								</div>
								<div className="text-center">
									<div className="font-medium">Bathrooms</div>
									<div className="text-lg font-bold">
										{propertyComparison.bathrooms.original} |{" "}
										{propertyComparison.bathrooms.match}
									</div>
									<Badge
										variant={
											propertyComparison.bathrooms.matches
												? "default"
												: "destructive"
										}
										className="text-xs"
									>
										{propertyComparison.bathrooms.matches
											? "Match"
											: "Different"}
									</Badge>
								</div>
								<div className="text-center">
									<div className="font-medium">Parking</div>
									<div className="text-lg font-bold">
										{propertyComparison.parkingSpaces.original} |{" "}
										{propertyComparison.parkingSpaces.match}
									</div>
									<Badge
										variant={
											propertyComparison.parkingSpaces.matches
												? "default"
												: "destructive"
										}
										className="text-xs"
									>
										{propertyComparison.parkingSpaces.matches
											? "Match"
											: "Different"}
									</Badge>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Feature Comparison */}
					{(originalListing.features?.length ||
						matchedListing.features?.length) && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Star className="w-5 h-5" />
									Features Comparison
									<div className="ml-auto">
										<span className="text-sm font-normal">Match: </span>
										<span className="font-bold">
											{Math.round(featureComparison.matchScore * 100)}%
										</span>
									</div>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{featureComparison.common.length > 0 && (
									<div>
										<h5 className="font-medium text-green-600 mb-2">
											Common Features ({featureComparison.common.length})
										</h5>
										<div className="flex flex-wrap gap-1">
											{featureComparison.common.map((feature, index) => (
												<Badge
													key={index}
													variant="default"
													className="text-xs"
												>
													{feature}
												</Badge>
											))}
										</div>
									</div>
								)}

								{featureComparison.onlyInOriginal.length > 0 && (
									<div>
										<h5 className="font-medium text-orange-600 mb-2">
											Only in Original (
											{featureComparison.onlyInOriginal.length})
										</h5>
										<div className="flex flex-wrap gap-1">
											{featureComparison.onlyInOriginal.map(
												(feature, index) => (
													<Badge
														key={index}
														variant="outline"
														className="text-xs"
													>
														{feature}
													</Badge>
												),
											)}
										</div>
									</div>
								)}

								{featureComparison.onlyInMatch.length > 0 && (
									<div>
										<h5 className="font-medium text-blue-600 mb-2">
											Only in Match ({featureComparison.onlyInMatch.length})
										</h5>
										<div className="flex flex-wrap gap-1">
											{featureComparison.onlyInMatch.map((feature, index) => (
												<Badge
													key={index}
													variant="secondary"
													className="text-xs"
												>
													{feature}
												</Badge>
											))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{/* Action Buttons */}
					<div className="flex gap-4">
						<Button variant="outline" asChild className="flex-1">
							<Link to={generateListingUrl(matchedListing)}>
								<Eye className="w-4 h-4 mr-2" />
								View Listing
							</Link>
						</Button>
						<Button asChild className="flex-1">
							<Link
								to={generateMatchDetailUrl(originalListing, matchedListing)}
							>
								<Users className="w-4 h-4 mr-2" />
								Full Comparison
							</Link>
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};
