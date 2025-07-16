import {
	Bath,
	Camera,
	Car,
	CheckCircle,
	Droplets,
	Eye,
	Flame,
	Heart,
	Home,
	Mountain,
	Shield,
	Thermometer,
	Trees,
	Users,
	Waves,
	Wifi,
	Wine,
	Wrench,
	Zap,
} from "lucide-react";
import type React from "react";

export interface PropertyFeaturesProps {
	features: string[];
}

// Comprehensive feature icon mapping for new features
const getFeatureIcon = (feature: string) => {
	// Exact feature matching first
	switch (feature) {
		case "Pool":
			return <Waves className="w-4 h-4" />;
		case "MatureGarden":
			return <Trees className="w-4 h-4" />;
		case "LockUpGarage":
			return <Car className="w-4 h-4" />;
		case "AirConditioning":
			return <Thermometer className="w-4 h-4" />;
		case "SolarPanels":
			return <Zap className="w-4 h-4" />;
		case "SecuritySystem":
			return <Shield className="w-4 h-4" />;
		case "EnsuiteBathroom":
			return <Bath className="w-4 h-4" />;
		case "Fireplace":
			return <Flame className="w-4 h-4" />;
		case "WaterViews":
			return <Eye className="w-4 h-4" />;
		case "SmartHome":
			return <Wifi className="w-4 h-4" />;
		case "PetFriendly":
			return <Heart className="w-4 h-4" />;
		case "WheelchairAccessible":
			return <Users className="w-4 h-4" />;
		case "StudyRoom":
			return <Home className="w-4 h-4" />;
		case "WalkInWardrobe":
			return <Home className="w-4 h-4" />;
		case "OpenPlanLiving":
			return <Home className="w-4 h-4" />;
		case "RenovatedKitchen":
			return <Home className="w-4 h-4" />;
		case "HighCeilings":
			return <Mountain className="w-4 h-4" />;
		case "HomeTheatre":
			return <Camera className="w-4 h-4" />;
		case "WineCellar":
			return <Wine className="w-4 h-4" />;
		case "OutdoorKitchen":
			return <Home className="w-4 h-4" />;
		case "RainwaterTank":
			return <Droplets className="w-4 h-4" />;
		case "DoubleGlazedWindows":
			return <Home className="w-4 h-4" />;
		case "EnergyEfficient":
			return <Zap className="w-4 h-4" />;
		case "NorthFacing":
			return <Eye className="w-4 h-4" />;
		case "CornerBlock":
			return <Home className="w-4 h-4" />;
		case "LanewayAccess":
			return <Car className="w-4 h-4" />;
		case "Bungalow":
			return <Home className="w-4 h-4" />;
		case "DualLiving":
			return <Users className="w-4 h-4" />;
		case "GrannyFlat":
			return <Home className="w-4 h-4" />;
		case "HeritageListed":
			return <Mountain className="w-4 h-4" />;
		default:
			return <CheckCircle className="w-4 h-4" />;
	}
};

export const PropertyFeatures: React.FC<PropertyFeaturesProps> = ({
	features,
}) => {
	if (!features || features.length === 0) {
		return null;
	}

	return (
		<div className="space-y-2">
			<h3 className="text-lg font-semibold">Features</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{features.map((feature) => (
					<div key={feature} className="flex items-center gap-2">
						{getFeatureIcon(feature)}
						<span className="text-sm">
							{feature.replace(/([A-Z])/g, " $1").trim()}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};
