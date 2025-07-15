import type React from "react";
import { useParams } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useListingById, useMatchesForListing } from "../data/listingsService";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
// import { Progress } from "../../../components/ui/progress";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Link } from "react-router";
import { ArrowLeft, Eye } from "lucide-react";
import { MatchScore } from "../components/MatchScore";
import type { Id } from "../../../../convex/_generated/dataModel";
import { generateListingUrl, generateMatchDetailUrl, parseListingParams } from "../utils/urlHelpers";
import { calculateDistance, formatDistance, isBuyerListing } from "../utils";

const MatchesPage: React.FC = () => {
	const params = useParams();
	const { id: listingId } = parseListingParams(params);

	const listing = useListingById(listingId!);
	const matches = useMatchesForListing(listingId!, {
		minScore: 0,
		limit: 50,
		includeScoreBreakdown: true
	});


	if (!listing) {
		return (
			<div className="container mx-auto py-8">
				<Alert>
					<AlertDescription>Listing not found</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-8">
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Button variant="ghost" asChild>
					<Link to={generateListingUrl(listing)}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Listing
					</Link>
				</Button>
				<div>
					<h1 className="text-3xl font-bold">Matches for {listing.headline}</h1>
					<p className="text-gray-600">
						{listing.suburb}, {listing.state} {listing.postcode}
					</p>
				</div>
			</div>

			{/* Original Listing Summary */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						Original Listing
						<Badge variant={listing.listingType === "buyer" ? "default" : "secondary"}>
							{listing.listingType}
						</Badge>
						<Badge variant="outline">{listing.subtype}</Badge>
						{isBuyerListing(listing) && listing.subtype === "street" && listing.radiusKm && (
							<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
								{listing.radiusKm}km radius
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<p className="font-medium">{listing.headline}</p>
							<p className="text-sm text-gray-600">{listing.description}</p>
						</div>
						<div className="text-sm">
							<p><strong>Bedrooms:</strong> {listing.propertyDetails.bedrooms}</p>
							<p><strong>Bathrooms:</strong> {listing.propertyDetails.bathrooms}</p>
							<p><strong>Parking:</strong> {listing.propertyDetails.parkingSpaces}</p>
							{listing.price && (
								<p><strong>Price:</strong> ${listing.price.min.toLocaleString()} - ${listing.price.max.toLocaleString()}</p>
							)}
							{listing.pricePreference && (
								<p><strong>Price Preference:</strong> ${listing.pricePreference.min.toLocaleString()} - ${listing.pricePreference.max.toLocaleString()}</p>
							)}
							{isBuyerListing(listing) && listing.subtype === "street" && listing.radiusKm && (
								<p><strong>Search Radius:</strong> {listing.radiusKm}km</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Matches Table */}
			<Card>
				<CardHeader>
					<CardTitle>Matching Properties</CardTitle>
					{isBuyerListing(listing) && listing.subtype === "street" && listing.radiusKm && (
						<p className="text-sm text-gray-600 mt-1">
							Showing matches within {listing.radiusKm}km radius
						</p>
					)}
					{listing.listingType === "seller" && (
						<p className="text-sm text-gray-600 mt-1">
							Street buyer matches are filtered by their search radius
						</p>
					)}
				</CardHeader>
				<CardContent>
					{!matches || matches.length === 0 ? (
						<Alert>
							<AlertDescription>No matches found for this listing.</AlertDescription>
						</Alert>
					) : (
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
								{matches.map((match) => (
									<TableRow key={match.listing._id}>
										<TableCell>
											<div>
												<p className="font-medium">{match.listing.headline}</p>
												<div className="flex gap-1 mt-1">
													<Badge variant={match.listing.listingType === "buyer" ? "default" : "secondary"}>
														{match.listing.listingType}
													</Badge>
													<Badge variant="outline" className="text-xs">{match.listing.subtype}</Badge>
													{isBuyerListing(match.listing) && match.listing.subtype === "street" && match.listing.radiusKm && (
														<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
															{match.listing.radiusKm}km
														</Badge>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<MatchScore score={match.score} size="sm" />
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<p>{match.listing.suburb}</p>
												<p className="text-gray-500">{match.listing.state}</p>
											</div>
										</TableCell>
										<TableCell>
											{listing.latitude && listing.longitude && match.listing.latitude && match.listing.longitude ? (
												<div className="text-sm">
													{(() => {
														const distance = calculateDistance(
															listing.latitude, listing.longitude,
															match.listing.latitude, match.listing.longitude
														);
														const isWithinRadius = 
															(isBuyerListing(listing) && listing.subtype === "street" && listing.radiusKm && distance <= listing.radiusKm) ||
															(isBuyerListing(match.listing) && match.listing.subtype === "street" && match.listing.radiusKm && distance <= match.listing.radiusKm);
														
														return (
															<div>
																<p>{formatDistance(distance)}</p>
																{isWithinRadius && (
																	<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
																		Within radius
																	</Badge>
																)}
															</div>
														);
													})()}
												</div>
											) : (
												<span className="text-gray-400 text-sm">N/A</span>
											)}
										</TableCell>
										<TableCell>
											<div className="text-sm">
												{match.listing.price && (
													<p>${match.listing.price.min.toLocaleString()} - ${match.listing.price.max.toLocaleString()}</p>
												)}
												{match.listing.pricePreference && (
													<p>${match.listing.pricePreference.min.toLocaleString()} - ${match.listing.pricePreference.max.toLocaleString()}</p>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm">
												<p>{match.listing.propertyDetails.bedrooms}bed, {match.listing.propertyDetails.bathrooms}bath</p>
												<p>{match.listing.propertyDetails.parkingSpaces} parking</p>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button size="sm" variant="outline" asChild>
													<Link to={generateListingUrl(match.listing)}>
														<Eye className="w-3 h-3 mr-1" />
														View
													</Link>
												</Button>
												<Button size="sm" variant="default" asChild>
													<Link to={generateMatchDetailUrl(listing, match.listing)}>
														Compare
													</Link>
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default MatchesPage;