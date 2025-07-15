import type React from "react";
import { 
	Car, 
	Home, 
	Trees, 
	Waves, 
	Zap, 
	Shield, 
	Thermometer, 
	Wifi,
	CheckCircle
} from "lucide-react";

export interface PropertyFeaturesProps {
	features: string[];
}

// Map feature strings to icons
const getFeatureIcon = (feature: string) => {
	const lowerFeature = feature.toLowerCase();
	
	if (lowerFeature.includes("garage") || lowerFeature.includes("parking")) {
		return <Car className="w-4 h-4" />;
	}
	if (lowerFeature.includes("pool")) {
		return <Waves className="w-4 h-4" />;
	}
	if (lowerFeature.includes("garden") || lowerFeature.includes("yard")) {
		return <Trees className="w-4 h-4" />;
	}
	if (lowerFeature.includes("alarm") || lowerFeature.includes("security")) {
		return <Shield className="w-4 h-4" />;
	}
	if (lowerFeature.includes("heating") || lowerFeature.includes("cooling")) {
		return <Thermometer className="w-4 h-4" />;
	}
	if (lowerFeature.includes("internet") || lowerFeature.includes("wifi")) {
		return <Wifi className="w-4 h-4" />;
	}
	if (lowerFeature.includes("solar")) {
		return <Zap className="w-4 h-4" />;
	}
	
	// Default icon for unrecognized features
	return <CheckCircle className="w-4 h-4" />;
};

export const PropertyFeatures: React.FC<PropertyFeaturesProps> = ({ features }) => {
	if (!features || features.length === 0) {
		return null;
	}
	
	return (
		<div className="space-y-2">
			<h3 className="text-lg font-semibold">Features</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				{features.map((feature, index) => (
					<div key={index} className="flex items-center gap-2">
						{getFeatureIcon(feature)}
						<span className="text-sm">{feature}</span>
					</div>
				))}
			</div>
		</div>
	);
};
