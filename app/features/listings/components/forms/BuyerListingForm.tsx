import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Switch } from "../../../../components/ui/switch";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Search, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { BuyerType, BuildingType, Feature } from "../../types";
import { LocationFields } from "./shared/LocationFields";
import { PropertyDetailsFields } from "./shared/PropertyDetailsFields";
import { PriceFields } from "./shared/PriceFields";
import { FeaturesFields } from "./shared/FeaturesFields";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";

interface BuyerListingFormProps {
	listingId: Id<"listings">;
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

// Clean schema form data interface
interface BuyerFormData {
	buyerType: BuyerType;
	buildingType: BuildingType | undefined;
	headline: string;
	description: string;
	suburb: string;
	state: string;
	postcode: string;
	latitude: number;
	longitude: number;
	bedrooms: number;
	bathrooms: number;
	parking: number;
	priceMin: number;
	priceMax: number;
	features: Feature[];
	searchRadius?: number;
	isPremium: boolean;
}

export const BuyerListingForm: React.FC<BuyerListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel
}) => {
	const { user } = useUser();
	const listing = useQuery(api.listings.getListing, { id: listingId });
	const updateListing = useMutation(api.listings.updateListing);

	const [formData, setFormData] = useState<BuyerFormData>({
		buyerType: "suburb",
		buildingType: undefined,
		headline: "",
		description: "",
		suburb: "",
		state: "",
		postcode: "",
		latitude: 0,
		longitude: 0,
		bedrooms: 0,
		bathrooms: 0,
		parking: 0,
		priceMin: 500000,
		priceMax: 1000000,
		features: [],
		searchRadius: 5,
		isPremium: false
	});

	const [isLoading, setIsLoading] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [priceError, setPriceError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Initialize form with listing data
	useEffect(() => {
		if (listing && !isInitialized && listing.listingType === "buyer") {
			console.log("🔍 BuyerListingForm: Initializing with listing data:", {
				buildingType: listing.buildingType,
				state: listing.state,
				priceMin: listing.priceMin,
				priceMax: listing.priceMax,
				buyerType: listing.buyerType
			});
			
			// Helper function to find closest valid price option
			const findClosestPrice = (price: number): number => {
				const validPrices = PRICE_OPTIONS.map(opt => opt.value);
				return validPrices.reduce((closest, current) => 
					Math.abs(current - price) < Math.abs(closest - price) ? current : closest
				);
			};

			const newFormData: BuyerFormData = {
				buyerType: listing.buyerType || "suburb",
				buildingType: listing.buildingType || undefined,
				headline: listing.headline,
				description: listing.description,
				suburb: listing.suburb,
				state: listing.state,
				postcode: listing.postcode,
				latitude: listing.latitude,
				longitude: listing.longitude,
				bedrooms: listing.bedrooms,
				bathrooms: listing.bathrooms,
				parking: listing.parking,
				priceMin: findClosestPrice(listing.priceMin),
				priceMax: findClosestPrice(listing.priceMax),
				features: listing.features || [],
				searchRadius: listing.searchRadius || 5,
				isPremium: listing.isPremium || false
			};
			
			console.log("🔍 BuyerListingForm: Setting form data:", {
				buildingType: newFormData.buildingType,
				state: newFormData.state,
				priceMin: newFormData.priceMin,
				priceMax: newFormData.priceMax,
				buyerType: newFormData.buyerType
			});
			
			setFormData(newFormData);
			setIsInitialized(true);
		}
	}, [listing, isInitialized]);

	// Loading state
	if (listing === undefined) {
		return (
			<div className="space-y-8">
				{Array.from({ length: 5 }).map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-6 w-48" />
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-10 w-full" />
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	// Error state - listing not found or wrong type
	if (listing === null || listing.listingType !== "buyer") {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Buyer listing not found or you don't have permission to edit it.
				</AlertDescription>
			</Alert>
		);
	}

	const validatePrice = () => {
		if (formData.priceMin >= formData.priceMax) {
			setPriceError("Maximum budget must be greater than minimum budget.");
			return false;
		}
		setPriceError(null);
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!validatePrice()) {
			return;
		}

		setIsLoading(true);
		setError(null);
		
		try {
			const updates = {
				buyerType: formData.buyerType,
				...(formData.buildingType && { buildingType: formData.buildingType }),
				headline: formData.headline,
				description: formData.description,
				suburb: formData.suburb,
				state: formData.state,
				postcode: formData.postcode,
				latitude: formData.latitude,
				longitude: formData.longitude,
				bedrooms: formData.bedrooms,
				bathrooms: formData.bathrooms,
				parking: formData.parking,
				priceMin: formData.priceMin,
				priceMax: formData.priceMax,
				features: formData.features,
				searchRadius: formData.searchRadius,
				isPremium: formData.isPremium,
				updatedAt: Date.now()
			};

			const result = await updateListing({ id: listingId, updates });
			console.log("Update result:", result);
			onSuccess?.(listingId);
		} catch (error) {
			console.error("Failed to update buyer listing:", error);
			setError("Failed to update listing. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	// Field update handlers
	const handleFieldChange = (field: string, value: string | number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handlePriceChange = (field: "priceMin" | "priceMax", value: number) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		
		// Validate price range
		const newMin = field === "priceMin" ? value : formData.priceMin;
		const newMax = field === "priceMax" ? value : formData.priceMax;
		
		if (newMin >= newMax) {
			setPriceError("Maximum budget must be greater than minimum budget.");
		} else {
			setPriceError(null);
		}
	};

	const handleFeaturesChange = (features: Feature[]) => {
		setFormData(prev => ({ ...prev, features }));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Basic Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Search className="w-5 h-5" />
						What I'm Looking For
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="buyerType">Search Type</Label>
						<Select 
							key={`buyerType-${formData.buyerType}`}
							value={formData.buyerType || ""} 
							onValueChange={(value: BuyerType) => handleFieldChange("buyerType", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select search type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="suburb">Anywhere in a suburb</SelectItem>
								<SelectItem value="street">On a specific street</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{formData.buyerType === "street" && (
						<div className="space-y-2">
							<Label htmlFor="searchRadius">Search Radius</Label>
							<Select 
								value={formData.searchRadius?.toString() || "5"} 
								onValueChange={(value) => handleFieldChange("searchRadius", parseInt(value))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select search radius" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1 km radius</SelectItem>
									<SelectItem value="3">3 km radius</SelectItem>
									<SelectItem value="5">5 km radius</SelectItem>
									<SelectItem value="7">7 km radius</SelectItem>
									<SelectItem value="10">10 km radius</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="headline">Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => handleFieldChange("headline", e.target.value)}
							placeholder="e.g., Looking for a family home in Bondi"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => handleFieldChange("description", e.target.value)}
							placeholder="Describe what you're looking for in detail..."
							rows={4}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Location - Shared Component */}
			<LocationFields
				suburb={formData.suburb}
				state={formData.state}
				postcode={formData.postcode}
				onChange={handleFieldChange}
			/>

			{/* Property Details - Shared Component */}
			<PropertyDetailsFields
				buildingType={formData.buildingType}
				bedrooms={formData.bedrooms}
				bathrooms={formData.bathrooms}
				parking={formData.parking}
				title="Property Requirements"
				bedroomsLabel="Minimum Bedrooms"
				bathroomsLabel="Minimum Bathrooms"
				parkingLabel="Minimum Parking"
				onChange={handleFieldChange}
			/>

			{/* Budget - Shared Component */}
			<PriceFields
				priceMin={formData.priceMin}
				priceMax={formData.priceMax}
				title="Budget"
				minLabel="Minimum Budget"
				maxLabel="Maximum Budget"
				error={priceError}
				onChange={handlePriceChange}
			/>

			{/* Features - Shared Component */}
			<FeaturesFields
				features={formData.features}
				title="Desired Features"
				description="What features would you like the property to have?"
				onChange={handleFeaturesChange}
			/>

			{/* Additional Options */}
			<Card>
				<CardHeader>
					<CardTitle>Additional Options</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center space-x-2">
						<Switch
							id="isPremium"
							checked={formData.isPremium}
							onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPremium: checked }))}
						/>
						<Label htmlFor="isPremium">Premium Listing (Featured placement)</Label>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			{error && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			<div className="flex gap-4 justify-end">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "Updating..." : "Update Buyer Listing"}
				</Button>
			</div>
		</form>
	);
};