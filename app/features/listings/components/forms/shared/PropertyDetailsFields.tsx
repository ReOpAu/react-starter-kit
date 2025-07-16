import { Building2 } from "lucide-react";
import type React from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../../../components/ui/select";
import { BUILDING_TYPES, type BuildingType } from "../../../../../../shared/constants/listingConstants";

interface PropertyDetailsFieldsProps {
	buildingType: BuildingType | "";
	bedrooms: number;
	bathrooms: number;
	parking: number;
	title?: string;
	bedroomsLabel?: string;
	bathroomsLabel?: string;
	parkingLabel?: string;
	onPropertyChange: (property: {
		buildingType?: BuildingType | "";
		bedrooms?: number;
		bathrooms?: number;
		parking?: number;
	}) => void;
}

export const PropertyDetailsFields: React.FC<PropertyDetailsFieldsProps> = ({
	buildingType,
	bedrooms,
	bathrooms,
	parking,
	title = "Property Details",
	bedroomsLabel = "Bedrooms",
	bathroomsLabel = "Bathrooms",
	parkingLabel = "Parking Spaces",
	onPropertyChange,
}) => {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Building2 className="w-5 h-5" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="space-y-2">
					<Label htmlFor="buildingType">Property Type</Label>
					<Select
						key={`buildingType-${buildingType}`}
						value={buildingType || ""}
						onValueChange={(value) => onPropertyChange({ buildingType: value as BuildingType })}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select property type" />
						</SelectTrigger>
						<SelectContent>
							{BUILDING_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="space-y-2">
						<Label htmlFor="bedrooms">{bedroomsLabel}</Label>
						<Input
							id="bedrooms"
							type="number"
							min="0"
							value={bedrooms}
							onChange={(e) =>
								onPropertyChange({ bedrooms: Number.parseInt(e.target.value) || 0 })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="bathrooms">{bathroomsLabel}</Label>
						<Input
							id="bathrooms"
							type="number"
							min="0"
							value={bathrooms}
							onChange={(e) =>
								onPropertyChange({ bathrooms: Number.parseInt(e.target.value) || 0 })
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="parking">{parkingLabel}</Label>
						<Input
							id="parking"
							type="number"
							min="0"
							value={parking}
							onChange={(e) =>
								onPropertyChange({ parking: Number.parseInt(e.target.value) || 0 })
							}
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
