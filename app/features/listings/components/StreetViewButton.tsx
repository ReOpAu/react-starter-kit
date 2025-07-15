import React, { useState } from "react";
import { Button } from "../../../components/ui/button";
import { StreetView } from "./StreetView";
import { MapPin } from "lucide-react";

interface StreetViewButtonProps {
	lat: number;
	lng: number;
	variant?: "default" | "outline" | "ghost";
	size?: "default" | "sm" | "lg";
	className?: string;
}

export const StreetViewButton: React.FC<StreetViewButtonProps> = ({
	lat,
	lng,
	variant = "outline",
	size = "sm",
	className = "",
}) => {
	const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setIsStreetViewOpen(true)}
				className={className}
			>
				<MapPin className="w-4 h-4 mr-2" />
				Street View
			</Button>
			<StreetView
				lat={lat}
				lng={lng}
				isOpen={isStreetViewOpen}
				onClose={() => setIsStreetViewOpen(false)}
			/>
		</>
	);
};