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
import { Plus, X, Search, Building2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ListingSubtype, PropertyDetails, PriceRange } from "../../types";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";

interface BuyerListingFormProps {
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

export const BuyerListingForm: React.FC<BuyerListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel
}) => {
	const { user } = useUser();
	const listing = useQuery(api.listings.getListing, { id: listingId });
	const updateListing = useMutation(api.listings.updateListing);

	const [formData, setFormData] = useState({
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
		budget: { min: 500000, max: 1000000 } as PriceRange,
		mustHaveFeatures: [] as string[],
		niceToHaveFeatures: [] as string[],
		radiusKm: 5,
		isPremium: false
	});

	const [isLoading, setIsLoading] = useState(false);
	const [newFeature, setNewFeature] = useState("");
	const [isInitialized, setIsInitialized] = useState(false);
	const [budgetError, setBudgetError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Initialize form with listing data
	useEffect(() => {
		if (listing && !isInitialized && listing.listingType === "buyer") {
			console.log("🔍 BuyerListingForm: Initializing with database values");
			
			// Validate state value exists in AUSTRALIAN_STATES options
			const validState = AUSTRALIAN_STATES.find(s => s.value === listing.state)?.value || "";
			if (listing.state && !validState) {
				console.warn("⚠️ State value from database not found in options:", listing.state);
			}
			
			// Validate budget values exist in PRICE_OPTIONS
			const validatePriceValue = (value: number) => {
				const isValid = PRICE_OPTIONS.some(option => option.value === value);
				if (isValid) {
					return value;
				}
				// Find the closest valid price option
				const closestOption = PRICE_OPTIONS.reduce((prev, curr) => 
					Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
				);
				console.warn("⚠️ Budget value from database not in options, using closest:", value, "->", closestOption.value);
				return closestOption.value;
			};
			
			const validatedBudget = listing.pricePreference ? {
				min: validatePriceValue(listing.pricePreference.min),
				max: validatePriceValue(listing.pricePreference.max)
			} : { min: 500000, max: 1000000 };

			const newFormData = {
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
				budget: validatedBudget,
				mustHaveFeatures: listing.mustHaveFeatures || [],
				niceToHaveFeatures: listing.niceToHaveFeatures || [],
				radiusKm: listing.radiusKm || 5,
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

	const validateBudget = () => {
		if (formData.budget.min >= formData.budget.max) {
			setBudgetError("Maximum budget must be greater than minimum budget.");
			return false;
		}
		setBudgetError(null);
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!validateBudget()) {
			return;
		}

		setIsLoading(true);
		setError(null);
		
		try {
			const updates = {
				listingType: "buyer" as const,
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
				radiusKm: formData.radiusKm,
				isPremium: formData.isPremium,
				pricePreference: formData.budget,
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

	const addFeature = (type: "mustHave" | "niceToHave") => {
		if (!newFeature.trim()) return;
		
		const key = type === "mustHave" ? "mustHaveFeatures" : "niceToHaveFeatures";
		
		setFormData(prev => ({
			...prev,
			[key]: [...prev[key], newFeature.trim()]
		}));
		setNewFeature("");
	};

	const removeFeature = (type: "mustHave" | "niceToHave", index: number) => {
		const key = type === "mustHave" ? "mustHaveFeatures" : "niceToHaveFeatures";
		
		setFormData(prev => ({
			...prev,
			[key]: prev[key].filter((_, i) => i !== index)
		}));
	};

	const addCommonFeature = (feature: string, type: "mustHave" | "niceToHave") => {
		const key = type === "mustHave" ? "mustHaveFeatures" : "niceToHaveFeatures";
		
		if (!formData[key].includes(feature)) {
			setFormData(prev => ({
				...prev,
				[key]: [...prev[key], feature]
			}));
		}
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
						<Label htmlFor="searchType">Search Type</Label>
						<Select 
							key={`subtype-${formData.subtype}`}
							value={formData.subtype} 
							onValueChange={(value: ListingSubtype) => setFormData(prev => ({ ...prev, subtype: value }))}
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

					<div className="space-y-2">
						<Label htmlFor="headline">Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
							placeholder="e.g., Looking for a family home in Bondi"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
							placeholder="Describe what you're looking for in detail..."
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
						<>
							<div className="space-y-2">
								<Label htmlFor="street">Street Name</Label>
								<Input
									id="street"
									value={formData.street}
									onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
									placeholder="e.g., Campbell Parade"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="radiusKm">Search Radius</Label>
								<Select 
									key={`radius-${formData.radiusKm}`}
									value={formData.radiusKm.toString()} 
									onValueChange={(value) => setFormData(prev => ({ ...prev, radiusKm: parseInt(value) }))}
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
						</>
					)}
				</CardContent>
			</Card>

			{/* Property Details */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Building2 className="w-5 h-5" />
						Property Requirements
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
							<Label htmlFor="bedrooms">Minimum Bedrooms</Label>
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
							<Label htmlFor="bathrooms">Minimum Bathrooms</Label>
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
							<Label htmlFor="parkingSpaces">Minimum Parking</Label>
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
				</CardContent>
			</Card>

			{/* Budget */}
			<Card>
				<CardHeader>
					<CardTitle>Budget</CardTitle>
				</CardHeader>
				<CardContent>
					{budgetError && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{budgetError}</AlertDescription>
						</Alert>
					)}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="minBudget">Minimum Budget</Label>
							<Select
								key={`min-budget-${formData.budget.min}`}
								value={formData.budget.min.toString()}
								onValueChange={(value) => {
									const numValue = parseInt(value, 10);
									setFormData(prev => ({ ...prev, budget: { ...prev.budget, min: numValue } }));
									
									if (numValue >= formData.budget.max) {
										setBudgetError("Maximum budget must be greater than minimum budget.");
									} else {
										setBudgetError(null);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select minimum budget" />
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
							<Label htmlFor="maxBudget">Maximum Budget</Label>
							<Select
								key={`max-budget-${formData.budget.max}`}
								value={formData.budget.max.toString()}
								onValueChange={(value) => {
									const numValue = parseInt(value, 10);
									setFormData(prev => ({ ...prev, budget: { ...prev.budget, max: numValue } }));

									if (numValue <= formData.budget.min) {
										setBudgetError("Maximum budget must be greater than minimum budget.");
									} else {
										setBudgetError(null);
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select maximum budget" />
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
									onClick={() => addCommonFeature(feature, "mustHave")}
									disabled={formData.mustHaveFeatures.includes(feature)}
								>
									<Plus className="w-3 h-3 mr-1" />
									{feature}
								</Button>
							))}
						</div>
					</div>

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
				</CardContent>
			</Card>

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