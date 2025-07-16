import React, { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { X } from "lucide-react";

declare global {
	interface Window {
		google: any;
		initStreetView: () => void;
	}
}

interface StreetViewProps {
	lat: number;
	lng: number;
	isOpen: boolean;
	onClose: () => void;
}

export const StreetView: React.FC<StreetViewProps> = ({ lat, lng, isOpen, onClose }) => {
	const streetViewRef = useRef<HTMLDivElement>(null);
	const streetViewInstance = useRef<any>(null);

	useEffect(() => {
		if (!isOpen) return;

		// Load Google Maps JavaScript API
		if (!window.google) {
			const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
			if (!googleApiKey) {
				console.error('VITE_GOOGLE_MAPS_API_KEY is not set in environment variables');
				return;
			}
			const script = document.createElement("script");
			script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&callback=initStreetView`;
			script.async = true;
			script.defer = true;
			document.head.appendChild(script);

			// Initialize Street View when API loads
			window.initStreetView = () => {
				if (streetViewRef.current && !streetViewInstance.current) {
					const panorama = new window.google.maps.StreetViewPanorama(
						streetViewRef.current,
						{
							position: { lat, lng },
							addressControl: false,
							linksControl: false,
							panControl: false,
							enableCloseButton: false,
							motionTracking: false,
							motionTrackingControl: false,
							showRoadLabels: false,
						}
					);
					streetViewInstance.current = panorama;
				}
			};
		} else {
			// If API is already loaded, initialize Street View directly
			if (streetViewRef.current && !streetViewInstance.current) {
				const panorama = new window.google.maps.StreetViewPanorama(
					streetViewRef.current,
					{
						position: { lat, lng },
						addressControl: false,
						linksControl: false,
						panControl: false,
						enableCloseButton: false,
						motionTracking: false,
						motionTrackingControl: false,
						showRoadLabels: false,
					}
				);
				streetViewInstance.current = panorama;
			}
		}

		return () => {
			if (streetViewInstance.current) {
				streetViewInstance.current = null;
			}
		};
	}, [isOpen, lat, lng]);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent showCloseButton={false} className="w-[95vw] max-w-[95vw] h-[80vh] sm:max-w-[95vw] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center justify-between">
						Street View
						<Button
							variant="ghost"
							size="sm"
							onClick={onClose}
							className="h-6 w-6 p-0"
						>
							<X className="h-4 w-4" />
						</Button>
					</DialogTitle>
				</DialogHeader>
				<div ref={streetViewRef} className="w-full flex-grow rounded-lg overflow-hidden"></div>
			</DialogContent>
		</Dialog>
	);
};