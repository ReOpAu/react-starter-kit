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
import type { ListingType, ListingSubtype, PropertyDetails, PriceRange } from "../../types";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";

interface EditListingFormProps {
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

export const EditListingForm: React.FC<EditListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel
}) => {
	const { user } = useUser();
	const listing = useQuery(api.listings.getListing, { id: listingId });
	const updateListing = useMutation(api.listings.updateListing);

	const [formData, setFormData] = useState({
		listingType: "buyer" as ListingType,
		subtype: "suburb" as ListingSubtype,
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
		price: { min: 500000, max: 1000000 } as PriceRange,
		pricePreference: { min: 500000, max: 1000000 } as PriceRange,
		mustHaveFeatures: [] as string[],
		niceToHaveFeatures: [] as string[],
		features: [] as string[],
		radiusKm: 5,
		isPremium: false
	});

	const [isLoading, setIsLoading] = useState(false);
	const [newFeature, setNewFeature] = useState("");
	const [isInitialized, setIsInitialized] = useState(false);
	const [priceError, setPriceError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Initialize form with listing data
	useEffect(() => {
		if (listing && !isInitialized) {
			console.log("🔍 EditListingForm: Initializing with database values");
			console.log("- State from DB:", listing.state);
			console.log("- Price from DB:", listing.price);
			console.log("- PricePreference from DB:", listing.pricePreference);
			
			// Validate state value exists in AUSTRALIAN_STATES options
			const validState = AUSTRALIAN_STATES.find(s => s.value === listing.state)?.value || "";
			if (listing.state && !validState) {
				console.warn("⚠️ State value from database not found in options:", listing.state);
				console.warn("Available state options:", AUSTRALIAN_STATES.map(s => s.value));
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
			
			const validatedPricePreference = listing.pricePreference ? {
				min: validatePriceValue(listing.pricePreference.min),
				max: validatePriceValue(listing.pricePreference.max)
			} : { min: 500000, max: 1000000 };

			const newFormData = {
				listingType: listing.listingType,
				subtype: listing.subtype,
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
				price: validatedPrice,
				pricePreference: validatedPricePreference,
				mustHaveFeatures: listing.mustHaveFeatures || [],
				niceToHaveFeatures: listing.niceToHaveFeatures || [],
				features: listing.features || [],
				radiusKm: listing.radiusKm || 5,
				isPremium: listing.isPremium || false
			};
			
			setFormData(newFormData);
			setIsInitialized(true);
			
			console.log("✅ EditListingForm: Form initialized with validated values");
			console.log("- Final state:", newFormData.state);
			console.log("- Final price:", newFormData.price);
			console.log("- Final pricePreference:", newFormData.pricePreference);
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

	// Error state - listing not found
	if (listing === null) {
		return (
			<Alert variant="destructive">
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>
					Listing not found or you don't have permission to edit it.
				</AlertDescription>
			</Alert>
		);
	}

	const validateAndGetPrice = () => {
		const priceRange = formData.listingType === "seller" ? formData.price : formData.pricePreference;
		if (priceRange.min >= priceRange.max) {
			setPriceError("Maximum price must be greater than minimum price.");
			return null;
		}
		setPriceError(null);
		return priceRange;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		console.log("Edit form submitted");
		console.log("User object:", user);
		console.log("User ID:", user?.id);
		console.log("User signed in:", !!user);
		
		// Note: Auth check is disabled for mutations in development
		// if (!user) {
		// 	console.error("No user found - user is not authenticated");
		// 	setError("Please sign in to update listings");
		// 	return;
		// }

		setIsLoading(true);
		
		const priceRange = validateAndGetPrice();
		if (!priceRange) {
			console.error("Price validation failed");
			setIsLoading(false);
			return;
		}
		
		setError(null); // Clear previous errors
		console.log("Submitting updates for listing:", listingId);
		try {
			const updates = {
				listingType: formData.listingType,
				subtype: formData.subtype,
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
				mustHaveFeatures: formData.mustHaveFeatures,
				niceToHaveFeatures: formData.niceToHaveFeatures,
				features: formData.features,
				radiusKm: formData.radiusKm,
				isPremium: formData.isPremium,
				updatedAt: Date.now(),
				// Only include price or pricePreference based on listing type
				...(formData.listingType === "seller" 
					? { price: formData.price }
					: { pricePreference: formData.pricePreference }
				)
			};

			console.log("Form data before submission:", formData);
			console.log("State value:", formData.state);
			console.log("Price values:", formData.price, formData.pricePreference);
			console.log("Updates to send:", updates);
			const result = await updateListing({ id: listingId, updates });
			console.log("Update result:", result);
			onSuccess?.(listingId);
		} catch (error) {
			console.error("Failed to update listing:", error);
			setError("Failed to update listing. Please check the console for details.");
		} finally {
			setIsLoading(false);
		}
	};

	const addFeature = (type: "mustHave" | "niceToHave" | "features") => {
		if (!newFeature.trim()) return;
		
		const key = type === "mustHave" ? "mustHaveFeatures" 
			: type === "niceToHave" ? "niceToHaveFeatures" 
			: "features";
		
		setFormData(prev => ({
			...prev,
			[key]: [...prev[key], newFeature.trim()]
		}));
		setNewFeature("");
	};

	const removeFeature = (type: "mustHave" | "niceToHave" | "features", index: number) => {
		const key = type === "mustHave" ? "mustHaveFeatures" 
			: type === "niceToHave" ? "niceToHaveFeatures" 
			: "features";
		
		setFormData(prev => ({
			...prev,
			[key]: prev[key].filter((_, i) => i !== index)
		}));
	};

	const addCommonFeature = (feature: string, type: "mustHave" | "niceToHave" | "features") => {
		const key = type === "mustHave" ? "mustHaveFeatures" 
			: type === "niceToHave" ? "niceToHaveFeatures" 
			: "features";
		
		if (!formData[key].includes(feature)) {
			setFormData(prev => ({
				...prev,
				[key]: [...prev[key], feature]
			}));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Listing Type and Basic Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Listing Details
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="listingType">I am a</Label>
							<Select 
								value={formData.listingType} 
								onValueChange={(value: ListingType) => setFormData(prev => ({ ...prev, listingType: value }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="buyer">Buyer</SelectItem>
									<SelectItem value="seller">Seller</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="subtype">Looking for</Label>
							<Select 
								value={formData.subtype} 
								onValueChange={(value: ListingSubtype) => setFormData(prev => ({ ...prev, subtype: value }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="street">Specific Street</SelectItem>
									<SelectItem value="suburb">Anywhere in Suburb</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="headline">Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
							placeholder="e.g., Family home in quiet street"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
							placeholder="Describe what you're looking for or selling..."
							rows={4}
							required
						/>
					</div>
				</CardContent>
			</Card>

			{/* Location */}
			<Card>
				<CardHeader>
					<CardTitle>Location</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
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

					{formData.subtype === "street" && (
						<div className="space-y-2">
							<Label htmlFor="street">Street (Optional)</Label>
							<Input
								id="street"
								value={formData.street}
								onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
								placeholder="e.g., Campbell Parade"
							/>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Property Details */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="w-5 h-5" />
						Property Details
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="buildingType">Building Type</Label>
						<Select 
							key={`building-type-${formData.buildingType}`}
							value={formData.buildingType} 
							onValueChange={(value) => setFormData(prev => ({ ...prev, buildingType: value }))}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select building type" />
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

			{/* Price */}
			<Card>
				<CardHeader>
					<CardTitle>
						{formData.listingType === "seller" ? "Asking Price" : "Budget"}
					</CardTitle>
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
							<Label htmlFor="minPrice">Minimum ($)</Label>
							<Select
								key={`min-price-${formData.listingType === "seller" ? formData.price.min : formData.pricePreference.min}`}
								value={(formData.listingType === "seller" ? formData.price.min : formData.pricePreference.min).toString()}
								onValueChange={(value) => {
									const numValue = parseInt(value, 10);
									const priceKey = formData.listingType === "seller" ? "price" : "pricePreference";
									const currentPrice = formData[priceKey];
									
									setFormData(prev => ({ ...prev, [priceKey]: { ...currentPrice, min: numValue } }));

									if (numValue >= currentPrice.max) {
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
							<Label htmlFor="maxPrice">Maximum ($)</Label>
							<Select
								key={`max-price-${formData.listingType === "seller" ? formData.price.max : formData.pricePreference.max}`}
								value={(formData.listingType === "seller" ? formData.price.max : formData.pricePreference.max).toString()}
								onValueChange={(value) => {
									const numValue = parseInt(value, 10);
									const priceKey = formData.listingType === "seller" ? "price" : "pricePreference";
									const currentPrice = formData[priceKey];

									setFormData(prev => ({ ...prev, [priceKey]: { ...currentPrice, max: numValue } }));

									if (numValue <= currentPrice.min) {
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
					<CardTitle>Features</CardTitle>
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
									onClick={() => addCommonFeature(
										feature, 
										formData.listingType === "seller" ? "features" : "mustHave"
									)}
									disabled={
										formData.listingType === "seller" 
											? formData.features.includes(feature)
											: formData.mustHaveFeatures.includes(feature)
									}
								>
									<Plus className="w-3 h-3 mr-1" />
									{feature}
								</Button>
							))}
						</div>
					</div>

					{/* Custom Features */}
					{formData.listingType === "buyer" && (
						<>
							{/* Must Have Features */}
							<div className="space-y-3">
								<Label>Must Have Features</Label>
								<div className="flex gap-2">
									<Input
										value={newFeature}
										onChange={(e) => setNewFeature(e.target.value)}
										placeholder="Add must-have feature"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												addFeature("mustHave");
											}
										}}
									/>
									<Button type="button" onClick={() => addFeature("mustHave")}>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
								<div className="flex flex-wrap gap-2">
									{formData.mustHaveFeatures.map((feature, index) => (
										<Badge key={index} variant="default" className="px-3 py-1">
											{feature}
											<X 
												className="w-3 h-3 ml-2 cursor-pointer" 
												onClick={() => removeFeature("mustHave", index)}
											/>
										</Badge>
									))}
								</div>
							</div>

							{/* Nice to Have Features */}
							<div className="space-y-3">
								<Label>Nice to Have Features</Label>
								<div className="flex gap-2">
									<Input
										value={newFeature}
										onChange={(e) => setNewFeature(e.target.value)}
										placeholder="Add nice-to-have feature"
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												addFeature("niceToHave");
											}
										}}
									/>
									<Button type="button" onClick={() => addFeature("niceToHave")}>
										<Plus className="w-4 h-4" />
									</Button>
								</div>
								<div className="flex flex-wrap gap-2">
									{formData.niceToHaveFeatures.map((feature, index) => (
										<Badge key={index} variant="secondary" className="px-3 py-1">
											{feature}
											<X 
												className="w-3 h-3 ml-2 cursor-pointer" 
												onClick={() => removeFeature("niceToHave", index)}
											/>
										</Badge>
									))}
								</div>
							</div>
						</>
					)}

					{formData.listingType === "seller" && (
						<div className="space-y-3">
							<Label>Property Features</Label>
							<div className="flex gap-2">
								<Input
									value={newFeature}
									onChange={(e) => setNewFeature(e.target.value)}
									placeholder="Add property feature"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											addFeature("features");
										}
									}}
								/>
								<Button type="button" onClick={() => addFeature("features")}>
									<Plus className="w-4 h-4" />
								</Button>
							</div>
							<div className="flex flex-wrap gap-2">
								{formData.features.map((feature, index) => (
									<Badge key={index} variant="default" className="px-3 py-1">
										{feature}
										<X 
											className="w-3 h-3 ml-2 cursor-pointer" 
											onClick={() => removeFeature("features", index)}
										/>
									</Badge>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Additional Options */}
			<Card>
				<CardHeader>
					<CardTitle>Additional Options</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{formData.listingType === "buyer" && formData.subtype === "street" && (
						<div className="space-y-2">
							<Label htmlFor="radiusKm">Search Radius (km)</Label>
							<Select 
								value={formData.radiusKm.toString()} 
								onValueChange={(value) => setFormData(prev => ({ ...prev, radiusKm: parseInt(value) }))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="1">1 km</SelectItem>
									<SelectItem value="3">3 km</SelectItem>
									<SelectItem value="5">5 km</SelectItem>
									<SelectItem value="7">7 km</SelectItem>
									<SelectItem value="10">10 km</SelectItem>
								</SelectContent>
							</Select>
						</div>
					)}

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
					{isLoading ? "Updating..." : "Update Listing"}
				</Button>
			</div>
		</form>
	);
};