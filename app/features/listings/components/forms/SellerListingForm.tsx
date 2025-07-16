import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Home } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { PRICE_OPTIONS } from "../../../../../shared/constants/priceOptions";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Button } from "../../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../../components/ui/select";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Switch } from "../../../../components/ui/switch";
import { Textarea } from "../../../../components/ui/textarea";
import type { BuildingType, Feature, SellerType } from "../../../../../shared/constants/listingConstants";
import { FeaturesFields } from "./shared/FeaturesFields";
import { LocationFields } from "./shared/LocationFields";
import { PriceFields } from "./shared/PriceFields";
import { PropertyDetailsFields } from "./shared/PropertyDetailsFields";

interface SellerListingFormProps {
	listingId: Id<"listings">;
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

// Clean schema form data interface
interface SellerFormData {
	sellerType: SellerType;
	buildingType: BuildingType | undefined;
	headline: string;
	description: string;
	suburb: string;
	state: string;
	postcode: string;
	address: string;
	latitude: number;
	longitude: number;
	bedrooms: number;
	bathrooms: number;
	parking: number;
	priceMin: number;
	priceMax: number;
	features: Feature[];
	contactEmail?: string;
	contactPhone?: string;
	isPremium: boolean;
}

export const SellerListingForm: React.FC<SellerListingFormProps> = ({
	listingId,
	onSuccess,
	onCancel,
}) => {
	const { user } = useUser();
	const listing = useQuery(api.listings.getListing, { id: listingId });
	const updateListing = useMutation(api.listings.updateListing);

	const [formData, setFormData] = useState<SellerFormData>({
		sellerType: "sale",
		buildingType: undefined,
		headline: "",
		description: "",
		suburb: "",
		state: "",
		postcode: "",
		address: "",
		latitude: 0,
		longitude: 0,
		bedrooms: 0,
		bathrooms: 0,
		parking: 0,
		priceMin: 500000,
		priceMax: 1000000,
		features: [],
		contactEmail: "",
		contactPhone: "",
		isPremium: false,
	});

	const [isLoading, setIsLoading] = useState(false);
	const [isInitialized, setIsInitialized] = useState(false);
	const [priceError, setPriceError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Initialize form with listing data
	useEffect(() => {
		if (listing && !isInitialized && listing.listingType === "seller") {
			console.log("🔍 SellerListingForm: Initializing with listing data:", {
				buildingType: listing.buildingType,
				state: listing.state,
				priceMin: listing.priceMin,
				priceMax: listing.priceMax,
				sellerType: listing.sellerType,
			});

			// Helper function to find closest valid price option
			const findClosestPrice = (price: number): number => {
				const validPrices = PRICE_OPTIONS.map((opt) => opt.value);
				return validPrices.reduce((closest, current) =>
					Math.abs(current - price) < Math.abs(closest - price)
						? current
						: closest,
				);
			};

			const newFormData: SellerFormData = {
				sellerType: listing.sellerType || "sale",
				buildingType: listing.buildingType || undefined,
				headline: listing.headline,
				description: listing.description,
				suburb: listing.suburb,
				state: listing.state,
				postcode: listing.postcode,
				address: listing.address || "",
				latitude: listing.latitude,
				longitude: listing.longitude,
				bedrooms: listing.bedrooms,
				bathrooms: listing.bathrooms,
				parking: listing.parking,
				priceMin: findClosestPrice(listing.priceMin),
				priceMax: findClosestPrice(listing.priceMax),
				features: listing.features || [],
				contactEmail: listing.contactEmail || "",
				contactPhone: listing.contactPhone || "",
				isPremium: listing.isPremium || false,
			};

			console.log("🔍 SellerListingForm: Setting form data:", {
				buildingType: newFormData.buildingType,
				state: newFormData.state,
				priceMin: newFormData.priceMin,
				priceMax: newFormData.priceMax,
				sellerType: newFormData.sellerType,
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
		if (formData.priceMin >= formData.priceMax) {
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
				sellerType: formData.sellerType,
				...(formData.buildingType && { buildingType: formData.buildingType }),
				headline: formData.headline,
				description: formData.description,
				suburb: formData.suburb,
				state: formData.state,
				postcode: formData.postcode,
				address: formData.address,
				latitude: formData.latitude,
				longitude: formData.longitude,
				bedrooms: formData.bedrooms,
				bathrooms: formData.bathrooms,
				parking: formData.parking,
				priceMin: formData.priceMin,
				priceMax: formData.priceMax,
				features: formData.features,
				contactEmail: formData.contactEmail,
				contactPhone: formData.contactPhone,
				isPremium: formData.isPremium,
				updatedAt: Date.now(),
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

	// Field update handlers
	const handleFieldChange = (field: string, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handlePriceChange = (price: { priceMin?: number; priceMax?: number }) => {
		setFormData((prev) => ({ ...prev, ...price }));

		// Validate price range
		const newMin = price.priceMin ?? formData.priceMin;
		const newMax = price.priceMax ?? formData.priceMax;

		if (newMin >= newMax) {
			setPriceError("Maximum price must be greater than minimum price.");
		} else {
			setPriceError(null);
		}
	};

	const handleFeaturesChange = (features: Feature[]) => {
		setFormData((prev) => ({ ...prev, features }));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Basic Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Property Listing
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="sellerType">Listing Type</Label>
						<Select
							key={`sellerType-${formData.sellerType}`}
							value={formData.sellerType || ""}
							onValueChange={(value: SellerType) =>
								handleFieldChange("sellerType", value)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select listing type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="sale">For Sale</SelectItem>
								<SelectItem value="offmarket">Off Market</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="headline">Listing Headline</Label>
						<Input
							id="headline"
							value={formData.headline}
							onChange={(e) => handleFieldChange("headline", e.target.value)}
							placeholder="e.g., Beautiful family home in quiet street"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Property Description</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => handleFieldChange("description", e.target.value)}
							placeholder="Describe your property in detail..."
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
				address={formData.address}
				showStreetField={true}
				addressLabel="Property Address"
				addressPlaceholder="e.g., 123 Campbell Parade"
				onLocationChange={(location) => setFormData(prev => ({ ...prev, ...location }))}
			/>

			{/* Property Details - Shared Component */}
			<PropertyDetailsFields
				buildingType={formData.buildingType}
				bedrooms={formData.bedrooms}
				bathrooms={formData.bathrooms}
				parking={formData.parking}
				title="Property Specifications"
				onPropertyChange={(property) => setFormData(prev => ({ ...prev, ...property }))}
			/>

			{/* Asking Price - Shared Component */}
			<PriceFields
				priceMin={formData.priceMin}
				priceMax={formData.priceMax}
				title="Asking Price"
				minLabel="Minimum Price"
				maxLabel="Maximum Price"
				error={priceError}
				onPriceChange={handlePriceChange}
			/>

			{/* Features - Shared Component */}
			<FeaturesFields
				features={formData.features}
				title="Property Features"
				description="What features does your property have?"
				onFeaturesChange={handleFeaturesChange}
			/>

			{/* Contact Information */}
			<Card>
				<CardHeader>
					<CardTitle>Contact Information</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="space-y-2">
							<Label htmlFor="contactEmail">Contact Email</Label>
							<Input
								id="contactEmail"
								type="email"
								value={formData.contactEmail}
								onChange={(e) =>
									handleFieldChange("contactEmail", e.target.value)
								}
								placeholder="your@email.com"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="contactPhone">Contact Phone</Label>
							<Input
								id="contactPhone"
								type="tel"
								value={formData.contactPhone}
								onChange={(e) =>
									handleFieldChange("contactPhone", e.target.value)
								}
								placeholder="0412 345 678"
							/>
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
							onCheckedChange={(checked) =>
								setFormData((prev) => ({ ...prev, isPremium: checked }))
							}
						/>
						<Label htmlFor="isPremium">
							Premium Listing (Featured placement)
						</Label>
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
