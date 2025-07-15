import React, { useState } from "react";
import { Button } from "../../../components/ui/button";
import { NearbyPlacesModal } from "./NearbyPlacesModal";
import { MapPin } from "lucide-react";

interface NearbyPlacesButtonProps {
	latitude: number;
	longitude: number;
	radius?: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export const NearbyPlacesButton: React.FC<NearbyPlacesButtonProps> = ({
	latitude,
	longitude,
	radius = 5000,
	variant = "default",
	size = "sm",
	className = "",
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setIsModalOpen(true)}
				className={className}
			>
				<MapPin className="w-4 h-4 mr-2" />
				View Nearby Places
			</Button>

			<NearbyPlacesModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				latitude={latitude}
				longitude={longitude}
				radius={radius}
			/>
		</>
	);
};