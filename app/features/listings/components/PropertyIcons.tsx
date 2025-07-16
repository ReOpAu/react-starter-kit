import { Bed, Car, Home } from "lucide-react";
import type React from "react";

interface PropertyIconsProps {
	buildingType: string;
	bedrooms: number;
	bathrooms: number;
	parkingSpaces: number;
}

/**
 * PropertyIcons component displays property details with icons
 * Based on the legacy PropertyIcons component design
 */
export const PropertyIcons: React.FC<PropertyIconsProps> = ({
	buildingType,
	bedrooms,
	bathrooms,
	parkingSpaces,
}) => {
	const getParkingText = () => {
		if (parkingSpaces === 0) return "No parking";
		return `${parkingSpaces} space${parkingSpaces > 1 ? "s" : ""}`;
	};

	return (
		<div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
			<div className="flex items-center gap-1">
				<Home className="h-4 w-4 text-gray-500" />
				<span>{buildingType || "N/A"}</span>
			</div>

			<div className="flex items-center gap-1">
				<Bed className="h-4 w-4 text-gray-500" />
				<span>
					{bedrooms || 0} bed{bedrooms !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="flex items-center gap-1">
				<svg
					className="h-4 w-4 text-gray-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 21l4-4 4 4M3 20h18M3 20a2 2 0 01-2-2V6a2 2 0 012-2h18a2 2 0 012 2v12a2 2 0 01-2 2"
					/>
				</svg>
				<span>
					{bathrooms || 0} bath{bathrooms !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="flex items-center gap-1">
				<Car className="h-4 w-4 text-gray-500" />
				<span>{getParkingText()}</span>
			</div>
		</div>
	);
};
