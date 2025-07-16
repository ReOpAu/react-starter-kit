import { ExternalLink } from "lucide-react";
import type React from "react";
import { Button } from "../../../components/ui/button";
import type { Listing } from "../types";

interface ViewOnRealEstateButtonProps {
	listing: Listing;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export const ViewOnRealEstateButton: React.FC<ViewOnRealEstateButtonProps> = ({
	listing,
	variant = "outline",
	size = "sm",
	className = "",
}) => {
	const generateRealEstateUrl = (): string => {
		const suburb = listing.suburb.toLowerCase().replace(/\s+/g, "+");
		const state = listing.state.toLowerCase();
		const postcode = listing.postcode;

		const buildingTypeMap: Record<string, string> = {
			Townhouse: "townhouse",
			House: "house",
			Apartment: "apartment",
		};

		const buildingType =
			buildingTypeMap[listing.buildingType] ||
			listing.buildingType.toLowerCase().replace(/\s+/g, "-");

		// Function to round price to RealEstate.com.au increments
		const roundToIncrement = (price: number): number => {
			if (price <= 1000000) {
				// Round to nearest 50k up to 1M
				return Math.round(price / 50000) * 50000;
			} else if (price <= 2000000) {
				// Round to nearest 100k up to 2M
				return Math.round(price / 100000) * 100000;
			} else if (price <= 3000000) {
				// Round to nearest 250k up to 3M
				return Math.round(price / 250000) * 250000;
			} else if (price <= 5000000) {
				// Round to nearest 500k up to 5M
				return Math.round(price / 500000) * 500000;
			} else if (price <= 10000000) {
				// Round to nearest 1M up to 10M
				return Math.round(price / 1000000) * 1000000;
			} else if (price <= 12000000) {
				return 12000000;
			} else if (price <= 15000000) {
				return 15000000;
			} else {
				return 15000000; // Cap at 15M
			}
		};

		// Get price range from price or pricePreference with reasonable defaults
		const priceRange = listing.price || listing.pricePreference;
		const rawMinPrice = priceRange?.min || 0;
		const rawMaxPrice = priceRange?.max || 2000000;

		// Round prices to RealEstate.com.au increments
		const formattedMinPrice = roundToIncrement(rawMinPrice).toString();
		const formattedMaxPrice = roundToIncrement(rawMaxPrice).toString();

		// Format the location with plus signs
		const location = `${suburb},+${state}+${postcode}`;

		return `https://www.realestate.com.au/buy/property-${buildingType}-with-${listing.propertyDetails.bedrooms}-bedrooms-between-${formattedMinPrice}-${formattedMaxPrice}-in-${location}/list-1?source=refinement`;
	};

	const handleClick = () => {
		const url = generateRealEstateUrl();
		window.open(url, "_blank", "noopener,noreferrer");
	};

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleClick}
			className={`gap-2 ${className}`}
		>
			<ExternalLink className="w-4 h-4" />
			View on RealEstate.com.au
		</Button>
	);
};
