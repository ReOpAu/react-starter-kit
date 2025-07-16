import React, { useState } from "react";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Button } from "../../../../../components/ui/button";
import { Badge } from "../../../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Plus, X } from "lucide-react";
import type { Feature } from "../../../types";

// Clean schema features - must match Convex schema exactly
const AVAILABLE_FEATURES: Feature[] = [
	"Pool", "Garden", "Garage", "AirConditioning", "SolarPanels", 
	"StudyRoom", "WalkInWardrobe", "Ensuite", "Balcony", "Fireplace",
	"SecuritySystem", "Gym", "Tennis", "Sauna"
];

interface FeaturesFieldsProps {
	features: Feature[];
	title?: string;
	description?: string;
	onChange: (features: Feature[]) => void;
}

export const FeaturesFields: React.FC<FeaturesFieldsProps> = ({
	features,
	title = "Features",
	description = "Select property features",
	onChange
}) => {
	const [newFeature, setNewFeature] = useState("");

	const addFeature = (feature: Feature) => {
		if (!features.includes(feature)) {
			onChange([...features, feature]);
		}
	};

	const removeFeature = (featureToRemove: Feature) => {
		onChange(features.filter(f => f !== featureToRemove));
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
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-4">
					<Label>{description}</Label>
					<div className="flex flex-wrap gap-2">
						{AVAILABLE_FEATURES.map(feature => (
							<Button
								key={feature}
								type="button"
								variant="outline"
								size="sm"
								onClick={() => addFeature(feature)}
								disabled={features.includes(feature)}
							>
								<Plus className="w-3 h-3 mr-1" />
								{feature}
							</Button>
						))}
					</div>
				</div>

				<div className="space-y-3">
					<Label>Add Feature</Label>
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
					
					{newFeature && !AVAILABLE_FEATURES.includes(newFeature.trim() as Feature) && (
						<p className="text-sm text-muted-foreground">
							Feature must be one of: {AVAILABLE_FEATURES.join(", ")}
						</p>
					)}
					
					<div className="flex flex-wrap gap-2">
						{features.map((feature, index) => (
							<Badge key={index} variant="default" className="px-3 py-1">
								{feature}
								<X 
									className="w-3 h-3 ml-2 cursor-pointer" 
									onClick={() => removeFeature(feature)}
								/>
							</Badge>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};