/**
 * Single source of truth for all listing-related constants
 * Used across schema, mutations, forms, and seed scripts
 */

// Core listing types
export const LISTING_TYPES = ["buyer", "seller"] as const;
export const BUYER_TYPES = ["street", "suburb"] as const;
export const SELLER_TYPES = ["sale", "offmarket"] as const;

// Building types
export const BUILDING_TYPES = [
	"House",
	"Apartment",
	"Townhouse",
	"Villa",
	"Unit",
	"Duplex",
	"Studio",
	"Land",
	"Other",
] as const;

// Australian states
export const AUSTRALIAN_STATES = [
	{ value: "NSW", label: "New South Wales" },
	{ value: "VIC", label: "Victoria" },
	{ value: "QLD", label: "Queensland" },
	{ value: "WA", label: "Western Australia" },
	{ value: "SA", label: "South Australia" },
	{ value: "TAS", label: "Tasmania" },
	{ value: "ACT", label: "Australian Capital Territory" },
	{ value: "NT", label: "Northern Territory" },
] as const;

// Property features (comprehensive list)
export const FEATURES = [
	"CornerBlock",
	"EnsuiteBathroom",
	"MatureGarden",
	"LockUpGarage",
	"Pool",
	"SolarPanels",
	"RenovatedKitchen",
	"AirConditioning",
	"HighCeilings",
	"WaterViews",
	"StudyRoom",
	"OpenPlanLiving",
	"SecuritySystem",
	"EnergyEfficient",
	"NorthFacing",
	"PetFriendly",
	"WheelchairAccessible",
	"SmartHome",
	"Fireplace",
	"WalkInWardrobe",
	"LanewayAccess",
	"Bungalow",
	"DualLiving",
	"GrannyFlat",
	"HeritageListed",
	"RainwaterTank",
	"DoubleGlazedWindows",
	"HomeTheatre",
	"WineCellar",
	"OutdoorKitchen",
] as const;

// Common features for quick add in forms
export const COMMON_FEATURES = [
	"Pool",
	"Garden",
	"Garage",
	"Carport",
	"AirConditioning",
	"Heating",
	"Fireplace",
	"Balcony",
	"Deck",
	"Shed",
	"StudyRoom",
	"WalkInWardrobe",
	"EnsuiteBathroom",
	"Dishwasher",
	"SolarPanels",
	"SecuritySystem",
	"Intercom",
	"Gym",
] as const;

// Search radius options (in km)
export const SEARCH_RADIUS_OPTIONS = [1, 3, 5, 7, 10] as const;

// Default values
export const DEFAULT_SEARCH_RADIUS = 5;
export const DEFAULT_BEDROOMS = 3;
export const DEFAULT_BATHROOMS = 2;
export const DEFAULT_PARKING = 2;

// Type derivations
export type ListingType = (typeof LISTING_TYPES)[number];
export type BuyerType = (typeof BUYER_TYPES)[number];
export type SellerType = (typeof SELLER_TYPES)[number];
export type BuildingType = (typeof BUILDING_TYPES)[number];
export type Feature = (typeof FEATURES)[number];
export type AustralianState = (typeof AUSTRALIAN_STATES)[number]["value"];
export type SearchRadius = (typeof SEARCH_RADIUS_OPTIONS)[number];

// Helper type guards
export const isBuyerListing = (type: ListingType): type is "buyer" => type === "buyer";
export const isSellerListing = (type: ListingType): type is "seller" => type === "seller";

// Feature helpers
export const isCommonFeature = (feature: Feature): boolean => {
	return COMMON_FEATURES.includes(feature as any);
};

// State helpers
export const getStateLabel = (stateValue: AustralianState): string => {
	const state = AUSTRALIAN_STATES.find(s => s.value === stateValue);
	return state?.label || stateValue;
};