import { useEffect, useState } from "react";

interface NearbyAldiStoresProps {
  lat: number;
  lng: number;
}

interface Place {
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  distanceMeters?: number;
  placeId?: string;
}

export const NearbyAldiStores: React.FC<NearbyAldiStoresProps> = ({ lat, lng }) => {
  const [stores, setStores] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) return;
    const controller = new AbortController();
    const fetchStores = async () => {
      setLoading(true);
      setError(null);
      setStores([]);
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setError("Google Maps API key not set.");
          setLoading(false);
          return;
        }
        const body = {
          includedTypes: ["supermarket"],
          keyword: "Aldi",
          maxResultCount: 5,
          locationRestriction: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: 5000, // 5km
            },
          },
        };
        const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.distanceMeters,places.placeId",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        setStores(data.places || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message || "Failed to fetch stores.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
    return () => controller.abort();
  }, [lat, lng]);

  return (
    <div className="mt-6">
      <h3 className="font-semibold text-purple-900 mb-2 text-base">Nearby Aldi Stores</h3>
      {loading && <p className="text-sm text-gray-500">Loading nearby Aldi stores...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && stores.length === 0 && (
        <p className="text-sm text-gray-500">No Aldi stores found within 5km.</p>
      )}
      <ul className="space-y-3">
        {stores.map((store, idx) => (
          <li key={store.placeId || idx} className="bg-white border border-purple-100 rounded p-3">
            <div className="font-medium text-purple-800">{store.displayName?.text || "Aldi Store"}</div>
            <div className="text-xs text-purple-700">{store.formattedAddress}</div>
            {typeof store.distanceMeters === "number" && (
              <div className="text-xs text-gray-500 mt-1">
                {Math.round(store.distanceMeters)} meters away
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}; 