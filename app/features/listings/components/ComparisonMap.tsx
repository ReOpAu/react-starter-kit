import React from "react";
import { Map } from "./Map";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Separator } from "../../../components/ui/separator";
import { MapPin, Home, Bed, Bath, Car } from "lucide-react";
import type { Listing } from "../types";

interface ComparisonMapProps {
	originalListing: Listing;
	matchedListing: Listing;
	distance?: number;
}

export const ComparisonMap: React.FC<ComparisonMapProps> = ({
	originalListing,
	matchedListing,
	distance,
}) => {
	// Helper function to format price
	const formatPrice = (listing: Listing): string => {
		const price = listing.price || listing.pricePreference;
		if (!price) return "Price not specified";
		
		return `$${price.min.toLocaleString()} - $${price.max.toLocaleString()}`;
	};

	// Determine if suburbs match
	const suburbsMatch = originalListing.suburb.toLowerCase() === matchedListing.suburb.toLowerCase();

	// Calculate distance if not provided (simplified geohash-based estimate)
	const calculateDistance = (): number => {
		if (distance !== undefined) return distance;
		
		// Simplified distance calculation based on geohash similarity
		const originalGeo = originalListing.geohash;
		const matchGeo = matchedListing.geohash;
		
		if (originalGeo === matchGeo) return 0;
		
		// Count matching characters from the start
		let matchingChars = 0;
		for (let i = 0; i < Math.min(originalGeo.length, matchGeo.length); i++) {
			if (originalGeo[i] === matchGeo[i]) {
				matchingChars++;
			} else {
				break;
			}
		}
		
		// Rough approximation: each geohash character represents ~5km
		return Math.max(0.1, (7 - matchingChars) * 5);
	};

	const estimatedDistance = calculateDistance();

	return (
		<div className="space-y-6">
			{/* Side-by-side maps */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Original Listing Map */}
				<Card>
					<CardHeader className={`${originalListing.listingType === "buyer" ? "bg-blue-50" : "bg-purple-50"}`}>
						<div className="flex justify-between items-start">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Home className="w-5 h-5" />
									Original Listing
									<Badge variant={originalListing.listingType === "buyer" ? "default" : "secondary"}>
										{originalListing.listingType}
									</Badge>
								</CardTitle>
								<div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
									<MapPin className="w-4 h-4" />
									{originalListing.street && `${originalListing.street}, `}
									{originalListing.suburb}, {originalListing.state}
								</div>
							</div>
							<div className="text-right">
								<div className="font-bold text-lg">{formatPrice(originalListing)}</div>
								<div className="text-xs text-gray-600">
									{originalListing.buildingType}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{/* Map */}
						<div className="h-48 relative">
							<Map
								location={originalListing.location || { latitude: originalListing.latitude, longitude: originalListing.longitude }}
								zoom={15}
								interactive={false}
								listings={[originalListing]}
								className="w-full h-full rounded-none"
							/>
						</div>
						
						{/* Property details */}
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Bed className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bedrooms:</span>
									<span className="font-medium">{originalListing.propertyDetails.bedrooms}</span>
								</div>
								<div className="flex items-center gap-2">
									<Bath className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bathrooms:</span>
									<span className="font-medium">{originalListing.propertyDetails.bathrooms}</span>
								</div>
								<div className="flex items-center gap-2">
									<Car className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Parking:</span>
									<span className="font-medium">{originalListing.propertyDetails.parkingSpaces}</span>
								</div>
								<div className="flex items-center gap-2">
									<Home className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Type:</span>
									<span className="font-medium">{originalListing.buildingType}</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Matched Listing Map */}
				<Card>
					<CardHeader className={`${matchedListing.listingType === "buyer" ? "bg-blue-50" : "bg-purple-50"}`}>
						<div className="flex justify-between items-start">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Home className="w-5 h-5" />
									Matched Listing
									<Badge variant={matchedListing.listingType === "buyer" ? "default" : "secondary"}>
										{matchedListing.listingType}
									</Badge>
								</CardTitle>
								<div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
									<MapPin className="w-4 h-4" />
									{matchedListing.street && `${matchedListing.street}, `}
									{matchedListing.suburb}, {matchedListing.state}
								</div>
							</div>
							<div className="text-right">
								<div className="font-bold text-lg">{formatPrice(matchedListing)}</div>
								<div className="text-xs text-gray-600">
									{matchedListing.buildingType}
								</div>
							</div>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						{/* Map */}
						<div className="h-48 relative">
							<Map
								location={matchedListing.location || { latitude: matchedListing.latitude, longitude: matchedListing.longitude }}
								zoom={15}
								interactive={false}
								listings={[matchedListing]}
								className="w-full h-full rounded-none"
							/>
						</div>
						
						{/* Property details */}
						<div className="p-4 space-y-3">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="flex items-center gap-2">
									<Bed className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bedrooms:</span>
									<span className="font-medium">{matchedListing.propertyDetails.bedrooms}</span>
								</div>
								<div className="flex items-center gap-2">
									<Bath className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Bathrooms:</span>
									<span className="font-medium">{matchedListing.propertyDetails.bathrooms}</span>
								</div>
								<div className="flex items-center gap-2">
									<Car className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Parking:</span>
									<span className="font-medium">{matchedListing.propertyDetails.parkingSpaces}</span>
								</div>
								<div className="flex items-center gap-2">
									<Home className="w-4 h-4 text-gray-500" />
									<span className="text-gray-600">Type:</span>
									<span className="font-medium">{matchedListing.buildingType}</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Distance Information */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex items-center justify-center gap-4 text-center">
						<div className="flex items-center gap-2">
							<MapPin className="w-5 h-5 text-blue-600" />
							<span className="font-semibold text-lg">
								Distance: {estimatedDistance.toFixed(1)}km
							</span>
						</div>
						{suburbsMatch && (
							<Badge variant="outline" className="text-green-600 border-green-600">
								Same Suburb
							</Badge>
						)}
					</div>
					<Separator className="my-4" />
					<div className="grid grid-cols-2 gap-4 text-sm text-center">
						<div>
							<div className="font-medium text-gray-700">Original Location</div>
							<div className="text-gray-600">{originalListing.suburb}, {originalListing.state}</div>
						</div>
						<div>
							<div className="font-medium text-gray-700">Match Location</div>
							<div className="text-gray-600">{matchedListing.suburb}, {matchedListing.state}</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};