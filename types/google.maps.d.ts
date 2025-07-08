// src/google.maps.d.ts
/// <reference types="@types/google.maps" />

// This empty export turns the file into a module
export {};

declare global {
	namespace google.maps {
		// Add the missing getFeatureLayer method to the Map class
		interface Map {
			getFeatureLayer(layer: "LOCALITY"): FeatureLayer;
		}

		// Add missing properties to the FeatureLayer
		interface FeatureLayer {
			style: (
				options: google.maps.FeatureStyleFunctionOptions,
			) => google.maps.FeatureStyle | null;
			filter: { placeId: string } | { placeIds: string[] } | null;
		}

		interface Feature {
			placeId?: string;
		}
	}

	namespace google.maps.places {
		class Place {
			constructor(options: { id: string });
			fetchFields(options: { fields: string[] }): Promise<void>;
			geometry?: {
				viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
			};
		}
		interface PlaceResult {
			geometry?: {
				viewport?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
			};
		}
		interface PlacesService {
			getDetails(
				request: { placeId: string; fields: string[] },
				callback: (
					result: PlaceResult | null,
					status: google.maps.places.PlacesServiceStatus,
				) => void,
			): void;
		}
	}
}
