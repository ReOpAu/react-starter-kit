// Canonical Listing Types for the Listings Feature

export type ListingType = "buyer" | "seller";
export type ListingSubtype = "street" | "suburb";

export interface PriceRange {
	min: number;
	max: number;
}

export interface PropertyDetails {
	bedrooms: number;
	bathrooms: number;
	parkingSpaces: number;
	landArea?: number;
	floorArea?: number;
}

export interface ListingBase {
	_id?: string; // Convex document id
	listingType: ListingType;
	subtype: ListingSubtype;
	userId: string;
	geohash: string;
	buildingType: string;
	price?: PriceRange;
	pricePreference?: PriceRange;
	propertyDetails: PropertyDetails;
	mustHaveFeatures?: string[];
	niceToHaveFeatures?: string[];
	features?: string[];
	headline: string;
	description: string;
	images?: string[];
	suburb: string;
	state: string;
	postcode: string;
	latitude: number;
	longitude: number;
	location?: {
		latitude: number;
		longitude: number;
	};
	street?: string;
	isPremium?: boolean;
	sample?: boolean;
	expiresAt?: number;
	createdAt: number;
	updatedAt: number;
}

export type Listing = ListingBase;

// Optionally, define BuyerListing and SellerListing for stricter typing
export interface BuyerListing extends ListingBase {
	listingType: "buyer";
	pricePreference: PriceRange;
	mustHaveFeatures?: string[];
	niceToHaveFeatures?: string[];
	radiusKm?: number; // Search radius for street buyers (1, 3, 5, 7 km)
}

export interface SellerListing extends ListingBase {
	listingType: "seller";
	price: PriceRange;
	features?: string[];
}
