import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

interface PlacePhoto {
	url: string;
	width: number;
	height: number;
	attribution?: string;
	placeName?: string;
}

interface PlacePhotosProps {
	placeId: string;
	lat?: number;
	lng?: number;
}

export const PlacePhotos: React.FC<PlacePhotosProps> = ({
	placeId,
	lat,
	lng,
}) => {
	const [photos, setPhotos] = useState<PlacePhoto[]>([]);
	const [source, setSource] = useState<"place" | "nearby">("place");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

	const getPlacePhotos = useAction(api.address.getPlacePhotos.getPlacePhotos);

	useEffect(() => {
		if (!placeId) return;

		let cancelled = false;
		const fetchPhotos = async () => {
			setLoading(true);
			setError(null);
			setPhotos([]);
			try {
				const result = await getPlacePhotos({
					placeId,
					maxPhotos: 6,
					lat,
					lng,
				});
				if (!cancelled) {
					if (result.success) {
						setPhotos(result.photos);
						setSource(result.source);
					} else {
						setError(result.error);
					}
				}
			} catch (err: unknown) {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : "Failed to fetch photos.",
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		fetchPhotos();
		return () => {
			cancelled = true;
		};
	}, [placeId, lat, lng, getPlacePhotos]);

	if (loading) {
		return (
			<div className="mt-4">
				<div className="grid grid-cols-3 gap-2">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={`skeleton-${i}`}
							className="aspect-square rounded-lg bg-gray-100 animate-pulse"
						/>
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return <p className="mt-4 text-sm text-red-600">{error}</p>;
	}

	if (photos.length === 0) {
		return (
			<p className="mt-4 text-sm text-muted-foreground">
				No photos available for this place.
			</p>
		);
	}

	return (
		<div className="mt-4 space-y-2">
			{/* Nearby neighbourhood label */}
			{source === "nearby" && (
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<MapPin className="w-3 h-3" />
					<span>Neighbourhood photos nearby</span>
				</div>
			)}

			{/* Lightbox */}
			{selectedIndex !== null && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
					onClick={() => setSelectedIndex(null)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setSelectedIndex(null);
						if (e.key === "ArrowRight" && selectedIndex < photos.length - 1)
							setSelectedIndex(selectedIndex + 1);
						if (e.key === "ArrowLeft" && selectedIndex > 0)
							setSelectedIndex(selectedIndex - 1);
					}}
					role="button"
					tabIndex={0}
				>
					<div
						className="relative max-w-3xl max-h-[80vh] mx-4"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={() => {}}
						role="presentation"
					>
						<img
							src={photos[selectedIndex].url}
							alt={photos[selectedIndex].attribution || "Place photo"}
							className="rounded-lg max-h-[80vh] object-contain"
						/>
						<div className="absolute bottom-2 left-2 flex flex-col gap-1">
							{photos[selectedIndex].placeName && (
								<p className="text-xs text-white/90 bg-black/40 px-2 py-1 rounded">
									{photos[selectedIndex].placeName}
								</p>
							)}
							{photos[selectedIndex].attribution && (
								<p className="text-xs text-white/80 bg-black/40 px-2 py-1 rounded">
									{photos[selectedIndex].attribution}
								</p>
							)}
						</div>
						{/* Navigation arrows */}
						{selectedIndex > 0 && (
							<button
								type="button"
								className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
								onClick={(e) => {
									e.stopPropagation();
									setSelectedIndex(selectedIndex - 1);
								}}
							>
								&#8249;
							</button>
						)}
						{selectedIndex < photos.length - 1 && (
							<button
								type="button"
								className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
								onClick={(e) => {
									e.stopPropagation();
									setSelectedIndex(selectedIndex + 1);
								}}
							>
								&#8250;
							</button>
						)}
					</div>
				</div>
			)}

			{/* Photo grid */}
			<div className="grid grid-cols-3 gap-2">
				{photos.map((photo, idx) => (
					<button
						key={photo.url}
						type="button"
						className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
						onClick={() => setSelectedIndex(idx)}
					>
						<img
							src={photo.url}
							alt={photo.attribution || `Photo ${idx + 1}`}
							className="w-full h-full object-cover"
							loading="lazy"
						/>
						{source === "nearby" && photo.placeName && (
							<span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
								{photo.placeName}
							</span>
						)}
					</button>
				))}
			</div>

			{/* Attributions */}
			{photos.some((p) => p.attribution) && (
				<p className="text-xs text-muted-foreground">
					Photos by{" "}
					{[
						...new Set(
							photos.filter((p) => p.attribution).map((p) => p.attribution),
						),
					].join(", ")}
				</p>
			)}
		</div>
	);
};
