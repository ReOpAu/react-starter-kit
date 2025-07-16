import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Switch } from "../../../../components/ui/switch";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Plus, X, Home, Building2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PropertyDetails, PriceRange } from "../../types";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";

interface SellerListingFormProps {
	listingId: Id<"listings">;
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

const BUILDING_TYPES = [
	"House",
	"Apartment", 
	"Townhouse",
	"Villa",
	"Unit",
	"Duplex",
	"Studio",
	"Land",
	"Other"
];

const AUSTRALIAN_STATES = [
	{ value: "NSW", label: "New South Wales" },
	{ value: "VIC", label: "Victoria" },
	{ value: "QLD", label: "Queensland" },
	{ value: "WA", label: "Western Australia" },
	{ value: "SA", label: "South Australia" },
	{ value: "TAS", label: "Tasmania" },
	{ value: "ACT", label: "Australian Capital Territory" },
	{ value: "NT", label: "Northern Territory" }
];

const COMMON_FEATURES = [
	"Pool", "Garden", "Garage", "Carport", "Air Conditioning", 
	"Heating", "Fireplace", "Balcony", "Deck", "Shed",
	"Study", "Walk-in Wardrobe", "Ensuite", "Dishwasher",
	"Solar Panels", "Security System", "Intercom", "Gym"
];

export const SellerListingForm: React.FC<SellerListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel
}) => {
	const { user } = useUser();
	const listing = useQuery(api.listings.getListing, { id: listingId });
	const updateListing = useMutation(api.listings.updateListing);

	const [formData, setFormData] = useState({
		buildingType: "",
		headline: "",
		description: "",
		suburb: "",
		state: "",
		postcode: "",
		street: "",
		latitude: 0,
		longitude: 0,
		propertyDetails: {
			bedrooms: 0,
			bathrooms: 0,
			parkingSpaces: 0,
			landArea: undefined,
			floorArea: undefined
		} as PropertyDetails,
		askingPrice: { min: 500000, max: 1000000 } as PriceRange,
		features: [] as string[],
		isPremium: false
	});

	const [isLoading, setIsLoading] = useState(false);
	const [newFeature, setNewFeature] = useState("");
	const [isInitialized, setIsInitialized] = useState(false);
	const [priceError, setPriceError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Initialize form with listing data
	useEffect(() => {
		if (listing && !isInitialized && listing.listingType === "seller") {
			console.log("🔍 SellerListingForm: Initializing with database values");
			
			// Validate state value exists in AUSTRALIAN_STATES options
			const validState = AUSTRALIAN_STATES.find(s => s.value === listing.state)?.value || "";
			if (listing.state && !validState) {
				console.warn("⚠️ State value from database not found in options:", listing.state);
			}
			
			// Validate price values exist in PRICE_OPTIONS
			const validatePriceValue = (value: number) => {
				const isValid = PRICE_OPTIONS.some(option => option.value === value);
				if (isValid) {
					return value;
				}
				// Find the closest valid price option
				const closestOption = PRICE_OPTIONS.reduce((prev, curr) => 
					Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
				);
				console.warn("⚠️ Price value from database not in options, using closest:", value, "->", closestOption.value);
				return closestOption.value;
			};
			
			const validatedPrice = listing.price ? {
				min: validatePriceValue(listing.price.min),
				max: validatePriceValue(listing.price.max)
			} : { min: 500000, max: 1000000 };

			const newFormData = {
				buildingType: listing.buildingType,
				headline: listing.headline,
				description: listing.description,
				suburb: listing.suburb,
				state: validState,
				postcode: listing.postcode,
				street: listing.street || "",
				latitude: listing.latitude,
				longitude: listing.longitude,
				propertyDetails: listing.propertyDetails,
				askingPrice: validatedPrice,
				features: listing.features || [],
				isPremium: listing.isPremium || false
			};
			
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
	if (listing === null || listing.listingType !== "seller") {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Seller listing not found or you don't have permission to edit it.
				</AlertDescription>
			</Alert>
		);
	}

	const validatePrice = () => {
		if (formData.askingPrice.min >= formData.askingPrice.max) {
			setPriceError("Maximum price must be greater than minimum price.");
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
				listingType: "seller" as const,
				subtype: "street" as const, // Sellers are always street-specific
				buildingType: formData.buildingType,
				headline: formData.headline,
				description: formData.description,
				suburb: formData.suburb,
				state: formData.state,
				postcode: formData.postcode,
				street: formData.street,
				latitude: formData.latitude,
				longitude: formData.longitude,
				propertyDetails: formData.propertyDetails,
				features: formData.features,
				isPremium: formData.isPremium,
				price: formData.askingPrice,
				updatedAt: Date.now()
			};

			const result = await updateListing({ id: listingId, updates });
			console.log("Update result:", result);
			onSuccess?.(listingId);
		} catch (error) {
			console.error("Failed to update seller listing:", error);
			setError("Failed to update listing. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const addFeature = () => {
		if (!newFeature.trim()) return;
		
		setFormData(prev => ({
			...prev,
			features: [...prev.features, newFeature.trim()]
		}));
		setNewFeature("");
	};

	const removeFeature = (index: number) => {
		setFormData(prev => ({
			...prev,
			features: prev.features.filter((_, i) => i !== index)
		}));
	};

	const addCommonFeature = (feature: string) => {
		if (!formData.features.includes(feature)) {
			setFormData(prev => ({
				...prev,
				features: [...prev.features, feature]
			}));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Basic Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Property Details
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="headline">Listing Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
							placeholder="e.g., Beautiful family home in quiet street"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Property Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
							placeholder="Describe your property in detail..."
							rows={4}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Location */}
			<Card>
				<CardHeader>
					<CardTitle>Property Address</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="street">Street Address</Label>
						<Input
							id="street"
							value={formData.street}
							onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
							placeholder="e.g., 123 Campbell Parade"
							required
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<Label htmlFor="suburb">Suburb</Label>
							<Input
								id="suburb"
								value={formData.suburb}
								onChange={(e) => setFormData(prev => ({ ...prev, suburb: e.target.value }))}
								placeholder="e.g., Bondi"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="state">State</Label>
							<Select 
								key={`state-${formData.state}`}
								value={formData.state} 
								onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select state" />
								</SelectTrigger>
								<SelectContent>
									{AUSTRALIAN_STATES.map(state => (
										<SelectItem key={state.value} value={state.value}>
											{state.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="postcode">Postcode</Label>
							<Input
								id="postcode"
								value={formData.postcode}
								onChange={(e) => setFormData(prev => ({ ...prev, postcode: e.target.value }))}
								placeholder="e.g., 2026"
								required
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Property Specifications */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="w-5 h-5" />
						Property Specifications
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="buildingType">Property Type</Label>
						<Select 
							key={`building-type-${formData.buildingType}`}
							value={formData.buildingType} 
							onValueChange={(value) => setFormData(prev => ({ ...prev, buildingType: value }))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select property type" />
							</SelectTrigger>
							<SelectContent>
								{BUILDING_TYPES.map(type => (
									<SelectItem key={type} value={type}>
										{type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div className="space-y-2">
							<Label htmlFor="bedrooms">Bedrooms</Label>
							<Input
								id="bedrooms"
								type="number"
								min="0"
								value={formData.propertyDetails.bedrooms}
								onChange={(e) => setFormData(prev => ({
									...prev,
									propertyDetails: { ...prev.propertyDetails, bedrooms: parseInt(e.target.value) || 0 }
								}))}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="bathrooms">Bathrooms</Label>
							<Input
								id="bathrooms"
								type="number"
								min="0"
								value={formData.propertyDetails.bathrooms}
								onChange={(e) => setFormData(prev => ({
									...prev,
									propertyDetails: { ...prev.propertyDetails, bathrooms: parseInt(e.target.value) || 0 }
								}))}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="parkingSpaces">Parking Spaces</Label>
							<Input
								id="parkingSpaces"
								type="number"
								min="0"
								value={formData.propertyDetails.parkingSpaces}
								onChange={(e) => setFormData(prev => ({
									...prev,
									propertyDetails: { ...prev.propertyDetails, parkingSpaces: parseInt(e.target.value) || 0 }
								}))}
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="landArea">Land Area (sqm)</Label>
							<Input
								id="landArea"
								type="number"
								min="0"
								value={formData.propertyDetails.landArea || ""}
								onChange={(e) => setFormData(prev => ({
									...prev,
									propertyDetails: { 
										...prev.propertyDetails, 
										landArea: e.target.value ? parseInt(e.target.value) : undefined 
									}
								}))}
								placeholder="Optional"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="floorArea">Floor Area (sqm)</Label>
							<Input
								id="floorArea"
								type="number"
								min="0"
								value={formData.propertyDetails.floorArea || ""}
								onChange={(e) => setFormData(prev => ({
									...prev,
									propertyDetails: { 
										...prev.propertyDetails, 
										floorArea: e.target.value ? parseInt(e.target.value) : undefined 
									}
								}))}
								placeholder="Optional"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Asking Price */}
			<Card>
				<CardHeader>
					<CardTitle>Asking Price</CardTitle>
				</CardHeader>
				<CardContent>
					{priceError && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{priceError}</AlertDescription>
						</Alert>
					)}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="minPrice">Minimum Price</Label>
							<Select
								key={`min-price-${formData.askingPrice.min}`}
								value={formData.askingPrice.min.toString()}
								onValueChange={(value) => {
									const numValue = parseInt(value, 10);
									setFormData(prev => ({ ...prev, askingPrice: { ...prev.askingPrice, min: numValue } }));
									
									if (numValue >= formData.askingPrice.max) {
										setPriceError("Maximum price must be greater than minimum price.");
									} else {
										setPriceError(null);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select minimum price" />
								</SelectTrigger>
								<SelectContent>
									{PRICE_OPTIONS.map(option => (
										<SelectItem key={`min-${option.value}`} value={option.value.toString()}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="maxPrice">Maximum Price</Label>
							<Select
								key={`max-price-${formData.askingPrice.max}`}
								value={formData.askingPrice.max.toString()}
								onValueChange={(value) => {
									const numValue = parseInt(value, 10);
									setFormData(prev => ({ ...prev, askingPrice: { ...prev.askingPrice, max: numValue } }));

									if (numValue <= formData.askingPrice.min) {
										setPriceError("Maximum price must be greater than minimum price.");
									} else {
										setPriceError(null);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select maximum price" />
								</SelectTrigger>
								<SelectContent>
									{PRICE_OPTIONS.map(option => (
										<SelectItem key={`max-${option.value}`} value={option.value.toString()}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Features */}
			<Card>
				<CardHeader>
					<CardTitle>Property Features</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Common Features */}
					<div className="space-y-4">
						<Label>Quick Add Features</Label>
						<div className="flex flex-wrap gap-2">
							{COMMON_FEATURES.map(feature => (
								<Button
									key={feature}
									type="button"
									variant="outline"
									size="sm"
									onClick={() => addCommonFeature(feature)}
									disabled={formData.features.includes(feature)}
								>
									<Plus className="w-3 h-3 mr-1" />
									{feature}
								</Button>
							))}
						</div>
					</div>

					{/* Custom Features */}
					<div className="space-y-3">
						<Label>Custom Features</Label>
						<div className="flex gap-2">
							<Input
								value={newFeature}
								onChange={(e) => setNewFeature(e.target.value)}
								placeholder="Add custom feature"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addFeature();
									}
								}}
							/>
							<Button type="button" onClick={addFeature}>
								<Plus className="w-4 h-4" />
							</Button>
						</div>
						<div className="flex flex-wrap gap-2">
							{formData.features.map((feature, index) => (
								<Badge key={index} variant="default" className="px-3 py-1">
									{feature}
									<X 
										className="w-3 h-3 ml-2 cursor-pointer" 
										onClick={() => removeFeature(index)}
									/>
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Additional Options */}
			<Card>
				<CardHeader>
					<CardTitle>Listing Options</CardTitle>
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
					{isLoading ? "Updating..." : "Update Property Listing"}
				</Button>
			</div>
		</form>
	);
};