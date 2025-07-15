import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Table, TableBody, TableCell, TableRow } from "../../../components/ui/table";
import { Separator } from "../../../components/ui/separator";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../../../components/ui/carousel";
import { PropertyFeatures } from "./PropertyFeatures";
import { Map } from "./Map";
import { StreetViewButton } from "./StreetViewButton";
import type { Listing } from "../types";

export interface ListingFullCardProps {
	listing: Listing;
}

export const ListingFullCard: React.FC<ListingFullCardProps> = ({ listing }) => {
	return (
		<div className="space-y-6">
			{/* Image Gallery */}
			{listing.images && listing.images.length > 0 && (
				<Card>
					<CardContent className="p-0">
						<Carousel className="w-full">
							<CarouselContent>
								{listing.images.map((image, index) => (
									<CarouselItem key={index}>
										<div className="aspect-video relative">
											<img
												src={image}
												alt={`${listing.headline} - Image ${index + 1}`}
												className="w-full h-full object-cover rounded-t-lg"
											/>
										</div>
									</CarouselItem>
								))}
							</CarouselContent>
							{listing.images.length > 1 && (
								<>
									<CarouselPrevious className="left-4" />
									<CarouselNext className="right-4" />
								</>
							)}
						</Carousel>
					</CardContent>
				</Card>
			)}

			{/* Location Map */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Location</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* Map */}
						<Map
							location={listing.location || { latitude: listing.latitude, longitude: listing.longitude }}
							zoom={15}
							interactive={true}
							geohash={listing.geohash}
							listings={[listing]}
							className="w-full h-[300px] rounded-lg"
						/>
						
						{/* Street View Button */}
						<div className="flex justify-center">
							<StreetViewButton
								lat={listing.location?.latitude || listing.latitude}
								lng={listing.location?.longitude || listing.longitude}
								variant="outline"
								size="sm"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Main Details */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="text-2xl mb-2">{listing.headline}</CardTitle>
							<div className="flex gap-2 mb-2">
								<Badge variant={listing.listingType === "buyer" ? "default" : "secondary"}>
									{listing.listingType}
								</Badge>
								<Badge variant="outline">{listing.subtype}</Badge>
								{listing.listingType === "buyer" && listing.subtype === "street" && (listing as any).radiusKm && (
									<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
										{(listing as any).radiusKm}km radius
									</Badge>
								)}
								{listing.isPremium && <Badge variant="destructive">Premium</Badge>}
							</div>
							<p className="text-gray-600">
								{listing.suburb}, {listing.state} {listing.postcode}
							</p>
						</div>
						<div className="text-right">
							{listing.price && (
								<div className="text-2xl font-bold text-primary">
									${listing.price.min.toLocaleString()} - ${listing.price.max.toLocaleString()}
								</div>
							)}
							{listing.pricePreference && (
								<div className="text-2xl font-bold text-primary">
									${listing.pricePreference.min.toLocaleString()} - ${listing.pricePreference.max.toLocaleString()}
								</div>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-gray-700 mb-4">{listing.description}</p>
					<Separator className="my-4" />
					
					{/* Property Details Table */}
					<div className="mb-6">
						<h3 className="text-lg font-semibold mb-3">Property Details</h3>
						<Table>
							<TableBody>
								<TableRow>
									<TableCell className="font-medium">Bedrooms</TableCell>
									<TableCell>{listing.propertyDetails.bedrooms}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Bathrooms</TableCell>
									<TableCell>{listing.propertyDetails.bathrooms}</TableCell>
								</TableRow>
								<TableRow>
									<TableCell className="font-medium">Parking Spaces</TableCell>
									<TableCell>{listing.propertyDetails.parkingSpaces}</TableCell>
								</TableRow>
								{listing.propertyDetails.landArea && (
									<TableRow>
										<TableCell className="font-medium">Land Area</TableCell>
										<TableCell>{listing.propertyDetails.landArea} sqm</TableCell>
									</TableRow>
								)}
								{listing.propertyDetails.floorArea && (
									<TableRow>
										<TableCell className="font-medium">Floor Area</TableCell>
										<TableCell>{listing.propertyDetails.floorArea} sqm</TableCell>
									</TableRow>
								)}
								<TableRow>
									<TableCell className="font-medium">Building Type</TableCell>
									<TableCell>{listing.buildingType}</TableCell>
								</TableRow>
								{listing.listingType === "buyer" && listing.subtype === "street" && (listing as any).radiusKm && (
									<TableRow>
										<TableCell className="font-medium">Search Radius</TableCell>
										<TableCell>{(listing as any).radiusKm}km</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					{/* Features */}
					{listing.features && listing.features.length > 0 && (
						<>
							<Separator className="my-4" />
							<PropertyFeatures features={listing.features} />
						</>
					)}

					{/* Buyer-specific features */}
					{listing.listingType === "buyer" && (
						<>
							{listing.mustHaveFeatures && listing.mustHaveFeatures.length > 0 && (
								<>
									<Separator className="my-4" />
									<div className="space-y-2">
										<h3 className="text-lg font-semibold">Must Have Features</h3>
										<PropertyFeatures features={listing.mustHaveFeatures} />
									</div>
								</>
							)}
							{listing.niceToHaveFeatures && listing.niceToHaveFeatures.length > 0 && (
								<>
									<Separator className="my-4" />
									<div className="space-y-2">
										<h3 className="text-lg font-semibold">Nice to Have Features</h3>
										<PropertyFeatures features={listing.niceToHaveFeatures} />
									</div>
								</>
							)}
						</>
					)}

					{/* Listing Metadata */}
					<Separator className="my-4" />
					<div className="text-sm text-gray-500">
						<p>Created: {new Date(listing.createdAt).toLocaleDateString()}</p>
						<p>Updated: {new Date(listing.updatedAt).toLocaleDateString()}</p>
						{listing.expiresAt && (
							<p>Expires: {new Date(listing.expiresAt).toLocaleDateString()}</p>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
