import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
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

export const NearbyAldiStores: React.FC<NearbyAldiStoresProps> = ({
	lat,
	lng,
}) => {
	const [stores, setStores] = useState<Place[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const getNearbyAldiStores = useAction(
		api.address.getNearbyAldiStores.getNearbyAldiStores,
	);

	useEffect(() => {
		if (lat == null || lng == null) return;

		// Debounce the API call to prevent multiple rapid calls
		const timeoutId = setTimeout(() => {
			let cancelled = false;
			const fetchStores = async () => {
				setLoading(true);
				setError(null);
				setStores([]);
				try {
					const result = await getNearbyAldiStores({ lat, lng });
					if (!cancelled) {
						if (result.success) {
							setStores(result.places);
						} else {
							setError(result.error);
						}
					}
				} catch (err: unknown) {
					if (!cancelled) {
						setError(
							err instanceof Error ? err.message : "Failed to fetch stores.",
						);
					}
				} finally {
					if (!cancelled) setLoading(false);
				}
			};
			fetchStores();
			return () => {
				cancelled = true;
			};
		}, 300); // 300ms debounce delay

		return () => {
			clearTimeout(timeoutId);
		};
	}, [lat, lng, getNearbyAldiStores]);

	return (
		<div className="mt-6">
			<h3 className="font-semibold text-purple-900 mb-2 text-base">
				Nearby Aldi Stores
			</h3>
			{loading && (
				<p className="text-sm text-gray-500">Loading nearby Aldi stores...</p>
			)}
			{error && <p className="text-sm text-red-600">{error}</p>}
			{!loading && !error && stores.length === 0 && (
				<p className="text-sm text-gray-500">
					No Aldi stores found within 5km.
				</p>
			)}
			<ul className="space-y-3">
				{stores.map((store, idx) => (
					<li
						key={store.placeId || idx}
						className="bg-white border border-purple-100 rounded p-3"
					>
						<div className="font-medium text-purple-800">
							{store.displayName?.text || "Aldi Store"}
						</div>
						<div className="text-xs text-purple-700">
							{store.formattedAddress}
						</div>
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
