import React from "react";
import { Button } from "../../../components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Listing } from "../types";

interface ViewOnDomainButtonProps {
	listing: Listing;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export const ViewOnDomainButton: React.FC<ViewOnDomainButtonProps> = ({
	listing,
	variant = "default",
	size = "sm",
	className = "",
}) => {
	const generateDomainUrl = (): string => {
		const suburb = listing.suburb.toLowerCase().replace(/\s+/g, "-");
		const state = listing.state.toLowerCase();
		const postcode = listing.postcode;

		const buildingTypeMap: Record<string, string> = {
			"Townhouse": "town-house",
			"House": "house",
			"Apartment": "apartment",
		};

		const buildingType = buildingTypeMap[listing.buildingType] ||
			listing.buildingType.toLowerCase().replace(/\s+/g, "-");

		// Calculate reasonable bedroom range based on property details
		const minBedrooms = Math.max(1, listing.propertyDetails.bedrooms - 1);
		const maxBedrooms = listing.propertyDetails.bedrooms + 1;

		// Use price or pricePreference for price range
		const priceRange = listing.price || listing.pricePreference;
		const minPrice = priceRange?.min || 0;
		const maxPrice = priceRange?.max || 1000000;

		const params = new URLSearchParams({
			"bedrooms": `${minBedrooms}-${maxBedrooms}`,
			"price": `${minPrice}-${maxPrice}`,
			"excludeunderoffer": "1",
		});

		return `https://www.domain.com.au/sale/${suburb}-${state}-${postcode}/${buildingType}/?${params.toString()}`;
	};

	const handleClick = () => {
		const url = generateDomainUrl();
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
			View on Domain.com.au
		</Button>
	);
};