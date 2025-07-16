import React, { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { Switch } from "../../../../components/ui/switch";
import { Plus, X, Home, Building2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { api } from "@/convex/_generated/api";
import type { ListingType, ListingSubtype, PropertyDetails, PriceRange } from "../../types";
import { DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE } from "../../../../../shared/constants/listingPrices";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";

interface CreateListingFormProps {
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

export const CreateListingForm: React.FC<CreateListingFormProps> = ({
	onSuccess,
	onCancel
}) => {
	const { user } = useUser();
	const createListing = useMutation(api.listings.createListing);

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
		price: { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE } as PriceRange,
		pricePreference: { min: DEFAULT_MIN_PRICE, max: DEFAULT_MAX_PRICE } as PriceRange,
		mustHaveFeatures: [] as string[],
		niceToHaveFeatures: [] as string[],
		features: [] as string[],
		radiusKm: 5,
		isPremium: false
	});

	const [isLoading, setIsLoading] = useState(false);
	const [newFeature, setNewFeature] = useState("");
	const [priceError, setPriceError] = useState<string | null>(null);

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
		if (!user) return;

		const priceRange = validateAndGetPrice();
		if (!priceRange) {
			setIsLoading(false);
			return;
		}

		setIsLoading(true);
		try {
			const now = Date.now();
			const listingData = {
				...formData,
				userId: user.id as any, // Convex will validate this as Id<"users">
				geohash: "temp", // Would calculate based on lat/lng
				createdAt: now,
				updatedAt: now,
				// Only include price or pricePreference based on listing type
				...(formData.listingType === "seller" 
					? { price: formData.price, pricePreference: undefined }
					: { pricePreference: formData.pricePreference, price: undefined }
				)
			};

			const listingId = await createListing({ listing: listingData });
			onSuccess?.(listingId);
		} catch (error) {
			console.error("Failed to create listing:", error);
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
			<div className="flex gap-4 justify-end">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading}>
					{isLoading ? "Creating..." : "Create Listing"}
				</Button>
			</div>
		</form>
	);
};