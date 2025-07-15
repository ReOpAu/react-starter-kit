import type React from "react";
import { useParams } from "react-router";
import { useListingById } from "../data/listingsService";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "../../../components/ui/table";
import { Separator } from "../../../components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../components/ui/accordion";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Link } from "react-router";
import { ArrowLeft, Check, X, MapPin } from "lucide-react";
import { PropertyFeatures } from "../components/PropertyFeatures";
import { MatchScore } from "../components/MatchScore";
import { ScoreBreakdown } from "../components/ScoreBreakdown";
import type { Listing } from "../types";
import type { Id } from "../../../../convex/_generated/dataModel";
import { parseListingParams, generateMatchesUrl } from "../utils/urlHelpers";

const MatchDetailPage: React.FC = () => {
	const params = useParams();
	const { id: originalListingId } = parseListingParams(params);
	const matchedListingId = params.matchId;

	const originalListing = useListingById(originalListingId!);
	const matchedListing = useListingById(matchedListingId!);
	
	// Get detailed match data with score breakdown
	const matchData = useQuery(api.matches.findMatches, {
		listingId: originalListingId as Id<"listings">,
		options: { includeScoreBreakdown: true, limit: 100 }
	});
	
	// Find the specific match for this comparison
	const currentMatch = matchData?.find(match => match.listing._id === matchedListingId);
	const score = currentMatch?.score || 0;
	const breakdown = currentMatch?.breakdown;

	if (!originalListing || !matchedListing) {
		return (
			<div className="container mx-auto py-8">
				<Alert>
					<AlertDescription>
						{!originalListing ? "Original listing not found" : "Matched listing not found"}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const renderComparisonIcon = (val1: any, val2: any) => {
		if (val1 === val2) {
			return <Check className="w-4 h-4 text-green-500" />;
		}
		return <X className="w-4 h-4 text-red-500" />;
	};

	const renderPriceComparison = (listing1: Listing, listing2: Listing) => {
		const price1 = listing1.price || listing1.pricePreference;
		const price2 = listing2.price || listing2.pricePreference;
		
		if (!price1 || !price2) return null;
		
		// Check for price overlap
		const hasOverlap = price1.max >= price2.min && price2.max >= price1.min;
		
		return (
			<div className="flex items-center gap-2">
				{hasOverlap ? (
					<Check className="w-4 h-4 text-green-500" />
				) : (
					<X className="w-4 h-4 text-red-500" />
				)}
				<span className={hasOverlap ? "text-green-700" : "text-red-700"}>
					{hasOverlap ? "Price ranges overlap" : "No price overlap"}
				</span>
			</div>
		);
	};

	const calculateDistance = (listing1: Listing, listing2: Listing) => {
		if (!listing1.latitude || !listing1.longitude || !listing2.latitude || !listing2.longitude) {
			return "Distance unknown";
		}
		
		const R = 6371; // Earth's radius in km
		const dLat = (listing2.latitude - listing1.latitude) * Math.PI / 180;
		const dLon = (listing2.longitude - listing1.longitude) * Math.PI / 180;
		const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
			Math.cos(listing1.latitude * Math.PI / 180) * Math.cos(listing2.latitude * Math.PI / 180) *
			Math.sin(dLon/2) * Math.sin(dLon/2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		const distance = R * c;
		
		return distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
	};

	return (
		<div className="container mx-auto py-8">
			{/* Header */}
			<div className="flex items-center gap-4 mb-6">
				<Button variant="ghost" asChild>
					<Link to={originalListing ? generateMatchesUrl(originalListing) : '/listings'}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Matches
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-bold">Property Comparison</h1>
					<p className="text-gray-600">Detailed side-by-side comparison</p>
				</div>
				{score > 0 && (
					<div className="text-right">
						<p className="text-sm text-gray-500 mb-1">Overall Match Score</p>
						<MatchScore score={score} size="lg" showProgress={false} />
					</div>
				)}
			</div>

			{/* Two-column comparison layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Original Listing */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Original Listing
							<Badge variant={originalListing.listingType === "buyer" ? "default" : "secondary"}>
								{originalListing.listingType}
							</Badge>
							{originalListing.listingType === "buyer" && originalListing.subtype === "street" && (originalListing as any).radiusKm && (
								<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
									{(originalListing as any).radiusKm}km radius
								</Badge>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<h3 className="font-semibold text-lg">{originalListing.headline}</h3>
								<p className="text-gray-600">{originalListing.suburb}, {originalListing.state}</p>
								<p className="text-sm mt-2">{originalListing.description}</p>
							</div>
							
							{originalListing.images && originalListing.images.length > 0 && (
								<img 
									src={originalListing.images[0]} 
									alt={originalListing.headline}
									className="w-full aspect-video object-cover rounded"
								/>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Matched Listing */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							Matched Listing
							<Badge variant={matchedListing.listingType === "buyer" ? "default" : "secondary"}>
								{matchedListing.listingType}
							</Badge>
							{matchedListing.listingType === "buyer" && matchedListing.subtype === "street" && (matchedListing as any).radiusKm && (
								<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
									{(matchedListing as any).radiusKm}km radius
								</Badge>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div>
								<h3 className="font-semibold text-lg">{matchedListing.headline}</h3>
								<p className="text-gray-600">{matchedListing.suburb}, {matchedListing.state}</p>
								<p className="text-sm mt-2">{matchedListing.description}</p>
							</div>
							
							{matchedListing.images && matchedListing.images.length > 0 && (
								<img 
									src={matchedListing.images[0]} 
									alt={matchedListing.headline}
									className="w-full aspect-video object-cover rounded"
								/>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Score Breakdown Section */}
			{breakdown && (
				<div className="mt-6">
					<ScoreBreakdown breakdown={breakdown} totalScore={score} />
				</div>
			)}
			
			{/* Distance Information */}
			{originalListing && matchedListing && (
				<Card className="mt-6">
					<CardContent className="pt-6">
						<div className="flex items-center gap-2 text-sm">
							<MapPin className="w-4 h-4 text-gray-500" />
							<span className="font-medium">Distance between properties:</span>
							<Badge variant="outline">
								{calculateDistance(originalListing, matchedListing)}
							</Badge>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Detailed Comparison Sections */}
			<Card className="mt-6">
				<CardHeader>
					<CardTitle>Detailed Comparison</CardTitle>
				</CardHeader>
				<CardContent>
					<Accordion type="single" collapsible className="w-full">
						{/* Location Comparison */}
						<AccordionItem value="location">
							<AccordionTrigger>Location</AccordionTrigger>
							<AccordionContent>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="font-medium">Suburb</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(originalListing.suburb, matchedListing.suburb)}
												{originalListing.suburb}
											</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(matchedListing.suburb, originalListing.suburb)}
												{matchedListing.suburb}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">State</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(originalListing.state, matchedListing.state)}
												{originalListing.state}
											</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(matchedListing.state, originalListing.state)}
												{matchedListing.state}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">Building Type</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(originalListing.buildingType, matchedListing.buildingType)}
												{originalListing.buildingType}
											</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(matchedListing.buildingType, originalListing.buildingType)}
												{matchedListing.buildingType}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</AccordionContent>
						</AccordionItem>

						{/* Price Comparison */}
						<AccordionItem value="price">
							<AccordionTrigger>Price</AccordionTrigger>
							<AccordionContent>
								<div className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<h4 className="font-medium mb-2">Original Listing</h4>
											{originalListing.price && (
												<p>Price: ${originalListing.price.min.toLocaleString()} - ${originalListing.price.max.toLocaleString()}</p>
											)}
											{originalListing.pricePreference && (
												<p>Price Preference: ${originalListing.pricePreference.min.toLocaleString()} - ${originalListing.pricePreference.max.toLocaleString()}</p>
											)}
										</div>
										<div>
											<h4 className="font-medium mb-2">Matched Listing</h4>
											{matchedListing.price && (
												<p>Price: ${matchedListing.price.min.toLocaleString()} - ${matchedListing.price.max.toLocaleString()}</p>
											)}
											{matchedListing.pricePreference && (
												<p>Price Preference: ${matchedListing.pricePreference.min.toLocaleString()} - ${matchedListing.pricePreference.max.toLocaleString()}</p>
											)}
										</div>
									</div>
									<Separator />
									{renderPriceComparison(originalListing, matchedListing)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Property Details Comparison */}
						<AccordionItem value="property-details">
							<AccordionTrigger>Property Details</AccordionTrigger>
							<AccordionContent>
								<Table>
									<TableBody>
										<TableRow>
											<TableCell className="font-medium">Bedrooms</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(originalListing.propertyDetails.bedrooms, matchedListing.propertyDetails.bedrooms)}
												{originalListing.propertyDetails.bedrooms}
											</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(matchedListing.propertyDetails.bedrooms, originalListing.propertyDetails.bedrooms)}
												{matchedListing.propertyDetails.bedrooms}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">Bathrooms</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(originalListing.propertyDetails.bathrooms, matchedListing.propertyDetails.bathrooms)}
												{originalListing.propertyDetails.bathrooms}
											</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(matchedListing.propertyDetails.bathrooms, originalListing.propertyDetails.bathrooms)}
												{matchedListing.propertyDetails.bathrooms}
											</TableCell>
										</TableRow>
										<TableRow>
											<TableCell className="font-medium">Parking Spaces</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(originalListing.propertyDetails.parkingSpaces, matchedListing.propertyDetails.parkingSpaces)}
												{originalListing.propertyDetails.parkingSpaces}
											</TableCell>
											<TableCell className="flex items-center gap-2">
												{renderComparisonIcon(matchedListing.propertyDetails.parkingSpaces, originalListing.propertyDetails.parkingSpaces)}
												{matchedListing.propertyDetails.parkingSpaces}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							</AccordionContent>
						</AccordionItem>

						{/* Features Comparison */}
						<AccordionItem value="features">
							<AccordionTrigger>Features</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<h4 className="font-medium mb-2">Original Listing Features</h4>
										{originalListing.features && originalListing.features.length > 0 ? (
											<PropertyFeatures features={originalListing.features} />
										) : (
											<p className="text-gray-500">No features listed</p>
										)}
									</div>
									<div>
										<h4 className="font-medium mb-2">Matched Listing Features</h4>
										{matchedListing.features && matchedListing.features.length > 0 ? (
											<PropertyFeatures features={matchedListing.features} />
										) : (
											<p className="text-gray-500">No features listed</p>
										)}
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</CardContent>
			</Card>
		</div>
	);
};

export default MatchDetailPage;