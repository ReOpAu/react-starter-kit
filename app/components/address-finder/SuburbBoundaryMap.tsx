import {
	APIProvider,
	Map as GoogleMapComponent,
	useMap,
	useMapsLibrary,
} from "@vis.gl/react-google-maps";
/// <reference types="@types/google.maps" />
import type React from "react";
import { useEffect } from "react";

// --- PROPS INTERFACE ---
interface SuburbBoundaryMapProps {
	suburbName: string;
	placeId: string;
	mapId: string;
}

// --- CHILD COMPONENTS ---

const FeatureLayer: React.FC<{ placeId: string }> = ({ placeId }) => {
	const map = useMap();

	useEffect(() => {
		if (!map) return;

		const featureLayer = map.getFeatureLayer("LOCALITY");

		featureLayer.style = (options) => {
			if (options.feature?.placeId === placeId) {
				return {
					fillColor: "#1976d2",
					fillOpacity: 0.2,
					strokeColor: "#1976d2",
					strokeWeight: 2,
				};
			}
			return null;
		};

		featureLayer.filter = { placeId };

		return () => {
			featureLayer.style = null;
			featureLayer.filter = null;
		};
	}, [map, placeId]);

	return null;
};

const FitBoundsToPlace: React.FC<{ placeId: string }> = ({ placeId }) => {
	const map = useMap();
	const places = useMapsLibrary("places");

	useEffect(() => {
		if (!map || !places || !placeId) return;

		let cancelled = false;

		const fit = async () => {
			// 1. Try new Places API
			try {
				const place = new places.Place({ id: placeId });
				await place.fetchFields({ fields: ["geometry"] });
				if ((place as any).geometry?.viewport) {
					map.fitBounds((place as any).geometry.viewport);
					return;
				}
			} catch (e) {
				// Ignore and fallback
			}

			// 2. Fallback: Old PlacesService
			try {
				// @ts-ignore: types may not include this yet
				const service = new window.google.maps.places.PlacesService(map);
				service.getDetails(
					{ placeId, fields: ["geometry"] },
					(result: any, status: any) => {
						if (
							!cancelled &&
							status === window.google.maps.places.PlacesServiceStatus.OK &&
							result?.geometry?.viewport
						) {
							map.fitBounds(result.geometry.viewport);
						}
					},
				);
			} catch (e) {
				// fallback to default
				if (!cancelled) {
					map.setCenter({ lat: -25.2744, lng: 133.7751 });
					map.setZoom(5);
				}
			}
		};

		fit();

		return () => {
			cancelled = true;
		};
	}, [map, places, placeId]);

	return null;
};

// --- MAIN COMPONENT ---

export const SuburbBoundaryMap: React.FC<SuburbBoundaryMapProps> = ({
	suburbName,
	placeId,
	mapId,
}) => {
	const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
	if (!apiKey) {
		return <div>Error: Google Maps API Key is missing.</div>;
	}

	return (
		<div>
			<div className="mb-2 font-semibold">
				{suburbName ? `Boundary for: ${suburbName}` : "No location selected"}
			</div>

			<APIProvider apiKey={apiKey}>
				<div className="h-[300px] w-full overflow-hidden rounded-lg border border-gray-200">
					<GoogleMapComponent
						mapId={mapId}
						defaultCenter={{ lat: -25.2744, lng: 133.7751 }}
						defaultZoom={5}
						disableDefaultUI
						mapTypeId="roadmap"
					>
						{placeId && (
							<>
								<FeatureLayer placeId={placeId} />
								<FitBoundsToPlace placeId={placeId} />
							</>
						)}
					</GoogleMapComponent>
				</div>
			</APIProvider>

			<div className="mt-1 text-xs text-gray-500">
				(Australian suburb boundaries powered by Google Maps DDS FeatureLayer.)
			</div>
		</div>
	);
};

export default SuburbBoundaryMap;
