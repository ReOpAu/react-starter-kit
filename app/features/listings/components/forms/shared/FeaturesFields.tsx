import { Plus, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import type { Feature } from "../../../../../../shared/constants/listingConstants";

// Feature categories for better UX - based on saaskit categorization
const FEATURE_CATEGORIES = {
	"Essential Features": [
		"OpenPlanLiving",
		"AirConditioning",
		"EnsuiteBathroom",
		"LockUpGarage",
		"RenovatedKitchen",
		"StudyRoom",
		"WalkInWardrobe",
	],
	"Outdoor & Location": [
		"Pool",
		"MatureGarden",
		"CornerBlock",
		"NorthFacing",
		"WaterViews",
		"LanewayAccess",
		"RainwaterTank",
		"OutdoorKitchen",
	],
	"Comfort & Style": [
		"HighCeilings",
		"Fireplace",
		"DoubleGlazedWindows",
		"HomeTheatre",
		"WineCellar",
		"HeritageListed",
	],
	"Technology & Security": [
		"SmartHome",
		"SecuritySystem",
		"EnergyEfficient",
		"SolarPanels",
	],
	"Specialty Features": [
		"PetFriendly",
		"WheelchairAccessible",
		"DualLiving",
		"GrannyFlat",
		"Bungalow",
	],
} as const;

// Flatten all features for validation
const AVAILABLE_FEATURES: readonly Feature[] = Object.values(
	FEATURE_CATEGORIES,
).flat() as Feature[];

interface FeaturesFieldsProps {
	features: Feature[];
	title?: string;
	description?: string;
	listingType?: "buyer" | "seller";
	onFeaturesChange: (features: Feature[]) => void;
}

export const FeaturesFields: React.FC<FeaturesFieldsProps> = ({
	features,
	title = "Features",
	description = "Select property features",
	listingType = "buyer",
	onFeaturesChange,
}) => {
	const [newFeature, setNewFeature] = useState("");

	const addFeature = (feature: Feature) => {
		if (!features.includes(feature)) {
			onFeaturesChange([...features, feature]);
		}
	};

	const removeFeature = (featureToRemove: Feature) => {
		onFeaturesChange(features.filter((f) => f !== featureToRemove));
	};

	const addCustomFeature = () => {
		const trimmed = newFeature.trim();
		if (trimmed && AVAILABLE_FEATURES.includes(trimmed as Feature)) {
			addFeature(trimmed as Feature);
			setNewFeature("");
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<p className="text-sm text-muted-foreground">{description}</p>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Categorized Features */}
				{Object.entries(FEATURE_CATEGORIES).map(
					([categoryName, categoryFeatures]) => (
						<div key={categoryName} className="space-y-3">
							<Label className="text-sm font-medium text-muted-foreground">
								{categoryName}
							</Label>
							<div className="flex flex-wrap gap-2">
								{categoryFeatures.map((feature) => (
									<Button
										key={feature}
										type="button"
										variant="outline"
										size="sm"
										onClick={() => addFeature(feature)}
										disabled={features.includes(feature)}
										className="text-xs"
									>
										<Plus className="w-3 h-3 mr-1" />
										{feature.replace(/([A-Z])/g, " $1").trim()}
									</Button>
								))}
							</div>
						</div>
					),
				)}

				{/* Custom Feature Input */}
				<div className="space-y-3 pt-4 border-t">
					<Label>Add Custom Feature</Label>
					<div className="flex gap-2">
						<Input
							value={newFeature}
							onChange={(e) => setNewFeature(e.target.value)}
							placeholder="Type feature name"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addCustomFeature();
								}
							}}
						/>
						<Button type="button" onClick={addCustomFeature}>
							<Plus className="w-4 h-4" />
						</Button>
					</div>

					{newFeature &&
						!AVAILABLE_FEATURES.includes(newFeature.trim() as Feature) && (
							<p className="text-sm text-muted-foreground">
								Feature must match one of the predefined options above
							</p>
						)}
				</div>

				{/* Selected Features */}
				{features.length > 0 && (
					<div className="space-y-3 pt-4 border-t">
						<Label>Selected Features</Label>
						<div className="flex flex-wrap gap-2">
							{features.map((feature) => (
								<Badge
									key={feature}
									variant="default"
									className="px-3 py-1 flex items-center gap-2"
								>
									<span>{feature.replace(/([A-Z])/g, " $1").trim()}</span>
									<button
										type="button"
										className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
										onClick={() => removeFeature(feature)}
										aria-label={`Remove ${feature}`}
									>
										<X className="w-3 h-3" />
									</button>
								</Badge>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
