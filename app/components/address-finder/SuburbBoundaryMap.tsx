import React, { useEffect, useRef, useState } from 'react';

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

export const SuburbBoundaryMap: React.FC<SuburbBoundaryMapProps> = ({ suburbName, placeId, center, mapId }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const featureLayerRef = useRef<any>(null);

  // Helper to fit map to Place ID boundary
  const fitMapToPlaceId = (map: any, placeId: string) => {
    if (!(window as any).google || !map) return;
    const google = (window as any).google;
    const placesService = new google.maps.places.PlacesService(map);
    const request = {
      placeId,
      fields: ['geometry.viewport'],
    };
    placesService.getDetails(request, (place: any, status: any) => {
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
    });
  };

  useEffect(() => {
    let script: HTMLScriptElement | null = null;
    let scriptAddedByThisComponent = false;
    // Only add the script if it doesn't already exist in the DOM
    if (!document.querySelector('script[data-google-maps-api]')) {
      script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.setAttribute('data-google-maps-api', 'true');
      script.onload = () => {
        renderMap();
      };
      document.body.appendChild(script);
      scriptAddedByThisComponent = true;
    } else if ((window as any).google) {
      renderMap();
    }
    // eslint-disable-next-line
    return () => {
      // Cleanup: remove script if we added it
      if (script && scriptAddedByThisComponent) {
        script.remove();
      }
      // Cleanup: dispose of map instance
      if (mapInstance.current) {
        // Google Maps API does not provide a direct destroy method, but we can clear the reference
        mapInstance.current = null;
      }
      // Cleanup: clear featureLayerRef
      featureLayerRef.current = null;
      // If you add event listeners in the future, remove them here
    };
  }, [suburbName, placeId, mapId]);

  const renderMap = () => {
    if (!mapRef.current || !(window as any).google) return;
    const google = (window as any).google;
    if (!mapInstance.current) {
      mapInstance.current = new google.maps.Map(mapRef.current, {
        // Do not set center/zoom here; fitBounds will handle it
        mapId,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
      });
    }
    // Remove previous FeatureLayer if present
    if (featureLayerRef.current) {
      featureLayerRef.current.filter = null;
      featureLayerRef.current.style = null;
    }
    // Add FeatureLayer for LOCALITY boundaries
    if (google.maps && mapInstance.current.getFeatureLayer) {
      const featureLayer = mapInstance.current.getFeatureLayer('LOCALITY');
      featureLayer.style = (params: any) => {
        if (params.feature.placeId === placeId) {
          return {
            fillColor: '#1976d2',
            fillOpacity: 0.2,
            strokeColor: '#1976d2',
            strokeWeight: 2,
          };
        }
      };
      featureLayer.filter = { placeId };
      featureLayerRef.current = featureLayer;
      // Fit map to Place ID boundary
      fitMapToPlaceId(mapInstance.current, placeId);
    } else {
      // Fallback: show message if FeatureLayer is not available
      if (mapRef.current) {
        mapRef.current.innerHTML = '<div class="text-red-600 bg-red-50 p-4 rounded text-sm" role="alert">Google Maps FeatureLayer API is not available. Please check your API key, Map ID, and ensure DDS Boundaries are enabled.</div>';
      }
    }
  };

  return (
    <div>
      <div className="font-semibold mb-2">Boundary for: {suburbName}</div>
      <div ref={mapRef} style={{ width: '100%', height: 300, borderRadius: 8, border: '1px solid #e0e0e0' }} />
      <div className="text-xs text-gray-500 mt-1">
        (Australian suburb boundaries powered by Google Maps DDS FeatureLayer. <b>Requires:</b> API key, Map ID with Vector/Locality enabled.)
      </div>
    </div>
  );
};

export default SuburbBoundaryMap; 