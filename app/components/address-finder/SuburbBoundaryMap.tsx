/// <reference types="@types/google.maps" />
import type React from "react";
import { useEffect, useRef, useState } from "react";

/**
 * SuburbBoundaryMap widget
 * Props:
 *   - suburbName: string (display name for the suburb)
 *   - placeId: string (Google Place ID for the suburb/locality)
 *   - center: { lat: number, lng: number } (center of the map)
 *   - mapId: string (Google Maps Vector Map ID with Locality layer enabled)
 *
 * Usage:
 *   <SuburbBoundaryMap
 *     suburbName="Prahran VIC, Australia"
 *     placeId="ChIJtXAyhyNo1moR40iMIXVWBAU"
 *     center={{ lat: -37.8497, lng: 144.9934 }}
 *     mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID}
 *   />
 */
interface SuburbBoundaryMapProps {
	suburbName: string;
	placeId: string;
	center?: { lat: number; lng: number };
	mapId: string;
}

// --- Google Maps Script Loader Singleton ---
let googleMapsScriptLoadingPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
	if (typeof window === "undefined") return Promise.reject("No window");
	// Exception: Google Maps API attaches itself to window as an untyped property.
	// biome-ignore lint/suspicious/noExplicitAny
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if ((window as any)?.google?.maps) {
		return Promise.resolve();
	}
	if (googleMapsScriptLoadingPromise) return googleMapsScriptLoadingPromise;
	googleMapsScriptLoadingPromise = new Promise((resolve, reject) => {
		if (document.querySelector("script[data-google-maps-api]")) {
			// Script already present, wait for it to load
			// Exception: Google Maps API attaches itself to window as an untyped property.
			// biome-ignore lint/suspicious/noExplicitAny
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if ((window as any)?.google?.maps) {
				resolve();
			} else {
				// Wait for script to load
				(document.querySelector("script[data-google-maps-api]") as HTMLScriptElement).addEventListener("load", () => resolve());
			}
			return;
		}
		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
		script.async = true;
		script.setAttribute("data-google-maps-api", "true");
		script.onload = () => resolve();
		script.onerror = (e) => reject(e);
		document.body.appendChild(script);
	});
	return googleMapsScriptLoadingPromise;
}
// --- End Google Maps Script Loader ---

export const SuburbBoundaryMap: React.FC<SuburbBoundaryMapProps> = ({
	suburbName,
	placeId,
	center,
	mapId,
}) => {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstance = useRef<google.maps.Map | null>(null);
	const featureLayerRef = useRef<google.maps.FeatureLayer | null>(null);

	// Helper to fit map to Place ID boundary
	const fitMapToPlaceId = (map: google.maps.Map, placeId: string) => {
		// Exception: Google Maps API attaches itself to window as an untyped property.
		// biome-ignore lint/suspicious/noExplicitAny
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const google = (window as any).google;
		if (!google || !map) return;
		const placesService = new google.maps.places.PlacesService(map);
		const request: google.maps.places.PlaceDetailsRequest = {
			placeId,
			fields: ["geometry.viewport"],
		};
		placesService.getDetails(
			request,
			(
				place: google.maps.places.PlaceResult | null,
				status: google.maps.places.PlacesServiceStatus
			) => {
				if (
					status === google.maps.places.PlacesServiceStatus.OK &&
					place &&
					place.geometry &&
					place.geometry.viewport
				) {
					map.fitBounds(place.geometry.viewport);
				} else {
					// Fallback: Sydney
					map.setCenter({ lat: -33.8688, lng: 151.2093 });
					map.setZoom(14);
				}
			}
		);
	};

	useEffect(() => {
		let cancelled = false;
		loadGoogleMapsScript()
			.then(() => {
				if (!cancelled) renderMap();
			})
			.catch((e) => {
				if (!cancelled && mapRef.current) {
					mapRef.current.innerHTML = `<div class="text-red-600 bg-red-50 p-4 rounded text-sm" role="alert">Failed to load Google Maps: ${e}</div>`;
				}
			});
		return () => {
			cancelled = true;
			// Do NOT remove the Google Maps script on unmount!
			// Only clean up map instances and listeners.
			if (mapInstance.current) {
				mapInstance.current = null;
			}
			featureLayerRef.current = null;
			// Remove event listeners if any were added
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [placeId, mapId]);

	// Type guard to check if feature has placeId
	function hasPlaceIdFeature(
		params: google.maps.FeatureStyleFunctionOptions
	): params is google.maps.FeatureStyleFunctionOptions & { feature: { placeId: string } } {
		return (
			params?.feature &&
			"placeId" in params.feature &&
			typeof (params.feature as { placeId?: unknown }).placeId === "string"
		);
	}

	const renderMap = () => {
		if (!mapRef.current) return;
		// Exception: Google Maps API attaches itself to window as an untyped property.
		// biome-ignore lint/suspicious/noExplicitAny
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const google = (window as any).google;
		if (!google) return;
		if (!mapInstance.current) {
			mapInstance.current = new google.maps.Map(mapRef.current, {
				// Do not set center/zoom here; fitBounds will handle it
				mapId,
				mapTypeId: "roadmap",
				disableDefaultUI: true,
			});
		}
		// Remove previous FeatureLayer if present
		if (featureLayerRef.current) {
			// @ts-expect-error: Google Maps types do not expose 'filter' yet
			featureLayerRef.current.filter = null;
			featureLayerRef.current.style = null;
		}
		// Add FeatureLayer for LOCALITY boundaries
		if (
			google.maps &&
			mapInstance.current &&
			typeof mapInstance.current.getFeatureLayer === "function"
		) {
			// @ts-expect-error: getFeatureLayer and filter are not in types
			const featureLayer = mapInstance.current.getFeatureLayer("LOCALITY");
			featureLayer.style = (params: google.maps.FeatureStyleFunctionOptions) => {
				if (hasPlaceIdFeature(params) && params.feature.placeId === placeId) {
					return {
						fillColor: "#1976d2",
						fillOpacity: 0.2,
						strokeColor: "#1976d2",
						strokeWeight: 2,
					};
				}
				return null;
			};
			// @ts-expect-error: Google Maps types do not expose 'filter' yet
			featureLayer.filter = { placeId };
			featureLayerRef.current = featureLayer;
			// Fit map to Place ID boundary
			if (mapInstance.current) {
				fitMapToPlaceId(mapInstance.current, placeId);
			}
		} else {
			// Fallback: show message if FeatureLayer is not available
			if (mapRef.current) {
				mapRef.current.innerHTML =
					'<div class="text-red-600 bg-red-50 p-4 rounded text-sm" role="alert">Google Maps FeatureLayer API is not available. Please check your API key, Map ID, and ensure DDS Boundaries are enabled.</div>';
			}
		}
	};

	return (
		<div>
			<div className="font-semibold mb-2">Boundary for: {suburbName}</div>
			<div
				ref={mapRef}
				style={{
					width: "100%",
					height: 300,
					borderRadius: 8,
					border: "1px solid #e0e0e0",
				}}
			/>
			<div className="text-xs text-gray-500 mt-1">
				(Australian suburb boundaries powered by Google Maps DDS FeatureLayer.{" "}
				<b>Requires:</b> API key, Map ID with Vector/Locality enabled.)
			</div>
		</div>
	);
};

export default SuburbBoundaryMap;
