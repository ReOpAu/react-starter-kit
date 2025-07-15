import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import ngeohash from "ngeohash";
import type { Listing } from "../types";

// Add mapbox CSS
import "mapbox-gl/dist/mapbox-gl.css";

interface ListingDetail {
	id: string;
	geohash: string;
	address: string;
	buildingType: string;
	street: string;
	suburb: string;
}

interface GeohashGridMapProps {
	centerGeohash: string;
	activeGeohashes: string[];
	listings: Listing[];
	className?: string;
}

export const GeohashGridMap: React.FC<GeohashGridMapProps> = ({
	centerGeohash,
	activeGeohashes,
	listings,
	className = "w-full h-[440px] rounded-lg shadow-md",
}) => {
	const mapContainer = useRef<HTMLDivElement>(null);
	const map = useRef<mapboxgl.Map | null>(null);
	const [isVisible, setIsVisible] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);

	// Create a 5x5 grid of geohashes centered on the main geohash
	const getGeohashGrid = (centerGeohash: string) => {
		const grid: string[] = [centerGeohash];
		
		// Get the north and south neighbors of center
		const north = ngeohash.neighbor(centerGeohash, [1, 0]);
		const south = ngeohash.neighbor(centerGeohash, [-1, 0]);
		
		// Get east and west neighbors of center
		const east = ngeohash.neighbor(centerGeohash, [0, 1]);
		const west = ngeohash.neighbor(centerGeohash, [0, -1]);
		
		// Get diagonal neighbors
		const northeast = ngeohash.neighbor(north, [0, 1]);
		const northwest = ngeohash.neighbor(north, [0, -1]);
		const southeast = ngeohash.neighbor(south, [0, 1]);
		const southwest = ngeohash.neighbor(south, [0, -1]);
		
		// Add center row
		grid.push(west, east);
		
		// Add north row
		grid.push(northwest, north, northeast);
		
		// Add south row
		grid.push(southwest, south, southeast);
		
		// Get far east and west
		const farEast = ngeohash.neighbor(east, [0, 1]);
		const farWest = ngeohash.neighbor(west, [0, -1]);
		
		// Get their north and south neighbors
		grid.push(
			ngeohash.neighbor(farWest, [1, 0]),  // far northwest
			ngeohash.neighbor(farEast, [1, 0]),  // far northeast
			farWest,                             // far west
			farEast,                             // far east
			ngeohash.neighbor(farWest, [-1, 0]), // far southwest
			ngeohash.neighbor(farEast, [-1, 0])  // far southeast
		);
		
		// Get far north and south
		const farNorth = ngeohash.neighbor(north, [1, 0]);
		const farSouth = ngeohash.neighbor(south, [-1, 0]);
		
		// Add their east and west neighbors
		grid.push(
			ngeohash.neighbor(farNorth, [0, -1]), // far north west
			farNorth,                             // far north
			ngeohash.neighbor(farNorth, [0, 1]),  // far north east
			ngeohash.neighbor(farSouth, [0, -1]), // far south west
			farSouth,                             // far south
			ngeohash.neighbor(farSouth, [0, 1])   // far south east
		);

		// Remove any duplicates and ensure we have exactly 25 unique geohashes
		return [...new Set(grid)].slice(0, 25);
	};

	// Create GeoJSON for all geohash cells
	const createGeohashGridGeoJSON = (geohashes: string[]) => {
		return {
			type: "FeatureCollection" as const,
			features: geohashes.map(hash => {
				const bounds = ngeohash.decode_bbox(hash);
				const isActive = activeGeohashes.includes(hash);
				const matchCount = isActive ? listings.filter(l => l.geohash === hash).length : 0;
				return {
					type: "Feature" as const,
					properties: {
						geohash: hash,
						isCenter: hash === centerGeohash,
						hasListings: isActive,
						matchCount: matchCount,
						label: `${hash}${isActive && matchCount > 0 ? '\n' + matchCount + ' matches' : ''}`
					},
					geometry: {
						type: "Polygon" as const,
						coordinates: [[
							[bounds[1], bounds[0]], // sw
							[bounds[3], bounds[0]], // se
							[bounds[3], bounds[2]], // ne
							[bounds[1], bounds[2]], // nw
							[bounds[1], bounds[0]], // back to sw
						]]
					}
				};
			})
		};
	};

	// Setup intersection observer
	useEffect(() => {
		if (!mapContainer.current) return;

		observerRef.current = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					setIsVisible(entry.isIntersecting);
				});
			},
			{ rootMargin: "50px" }
		);

		observerRef.current.observe(mapContainer.current);

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, []);

	// Initialize map when visible
	useEffect(() => {
		if (!isVisible || !mapContainer.current || map.current) return;

		const center = ngeohash.decode(centerGeohash);
		mapboxgl.accessToken = "pk.eyJ1IjoibWV0YWJ1cmVhdSIsImEiOiJjbTM2ZXdwNzQwNGVlMnNzZm9zcGN5b2kyIn0.Wdu9YTjWYHNqZ5h5oY-Ubg";

		map.current = new mapboxgl.Map({
			container: mapContainer.current,
			style: "mapbox://styles/mapbox/streets-v12",
			center: [center.longitude, center.latitude],
			zoom: 13,
			interactive: false,
			attributionControl: false,
		});

		map.current.on("load", () => {
			if (!map.current) return;

			const gridGeohashes = getGeohashGrid(centerGeohash);
			const geojson = createGeohashGridGeoJSON(gridGeohashes);

			// Add source for geohash grid
			map.current.addSource("geohash-grid", {
				type: "geojson",
				data: geojson
			});

			// Add fill layer for geohash cells
			map.current.addLayer({
				id: "geohash-grid-fill",
				type: "fill",
				source: "geohash-grid",
				paint: {
					"fill-color": [
						"case",
						["get", "isCenter"], "#3b82f6", // Primary color for center
						["get", "hasListings"], "#22c55e", // Success color for cells with listings
						"#e5e7eb" // Gray for empty cells
					],
					"fill-opacity": [
						"case",
						["get", "isCenter"], 0.3,
						["get", "hasListings"], 0.2,
						0.1
					]
				}
			});

			// Add border layer for geohash cells
			map.current.addLayer({
				id: "geohash-grid-border",
				type: "line",
				source: "geohash-grid",
				paint: {
					"line-color": [
						"case",
						["get", "isCenter"], "#3b82f6",
						["get", "hasListings"], "#22c55e",
						"#9ca3af"
					],
					"line-width": [
						"case",
						["get", "isCenter"], 2,
						1
					],
					"line-opacity": 0.8
				}
			});

			// Add labels for geohashes
			map.current.addLayer({
				id: "geohash-grid-labels",
				type: "symbol",
				source: "geohash-grid",
				layout: {
					"text-field": ["get", "label"],
					"text-size": 10,
					"text-allow-overlap": true,
					"text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
					"text-anchor": "center",
					"text-line-height": 1.2
				},
				paint: {
					"text-color": "#1f2937",
					"text-halo-color": "#ffffff",
					"text-halo-width": 2
				}
			});

			// Fit bounds to show all cells
			const bounds = new mapboxgl.LngLatBounds();
			geojson.features.forEach(feature => {
				const coords = feature.geometry.coordinates[0];
				coords.forEach(coord => bounds.extend(coord as [number, number]));
			});
			map.current.fitBounds(bounds, { padding: 50 });
		});

		return () => {
			if (map.current) {
				map.current.remove();
				map.current = null;
			}
		};
	}, [isVisible, centerGeohash, activeGeohashes, listings]);

	return (
		<div 
			ref={mapContainer} 
			className={className}
			style={{ background: !isVisible ? "#f0f0f0" : undefined }}
		/>
	);
};