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

// Discriminated union for type-safe listing handling
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

// Main Listing type as discriminated union
export type Listing = BuyerListing | SellerListing;

// Convex document types that include system fields
// More flexible type that doesn't rely on discriminated union constraints
export type ConvexListing = ListingBase & {
	_id?: string;
	_creationTime?: number;
	[key: string]: any; // Allow additional Convex fields
};

// Type guards for runtime type checking - handles both clean types and Convex data
export function isBuyerListing(listing: ConvexListing | any): listing is BuyerListing {
	return listing && listing.listingType === "buyer";
}

export function isSellerListing(listing: ConvexListing | any): listing is SellerListing {
	return listing && listing.listingType === "seller";
}
