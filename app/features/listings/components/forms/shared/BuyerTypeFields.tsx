import { MapPin, Navigation } from "lucide-react";
import type React from "react";
import {
	type BuyerType,
	SEARCH_RADIUS_OPTIONS,
} from "../../../../../../shared/constants/listingConstants";
import { Label } from "../../../../../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../../../components/ui/select";

interface BuyerTypeFieldsProps {
	buyerType: BuyerType;
	onBuyerTypeChange: (value: BuyerType) => void;
	searchRadius: number;
	onSearchRadiusChange: (value: number) => void;
	disabled?: boolean;
}

export const BuyerTypeFields: React.FC<BuyerTypeFieldsProps> = ({
	buyerType,
	onBuyerTypeChange,
	searchRadius,
	onSearchRadiusChange,
	disabled = false,
}) => {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="buyerType">Looking for</Label>
				<Select
					value={buyerType}
					onValueChange={onBuyerTypeChange}
					disabled={disabled}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="street">
							<div className="flex items-center gap-2">
								<Navigation className="w-4 h-4" />
								<span>Specific Street</span>
							</div>
						</SelectItem>
						<SelectItem value="suburb">
							<div className="flex items-center gap-2">
								<MapPin className="w-4 h-4" />
								<span>Anywhere in Suburb</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{buyerType === "street" && (
				<div className="space-y-2">
					<Label htmlFor="searchRadius">Search Radius</Label>
					<Select
						value={searchRadius.toString()}
						onValueChange={(value) =>
							onSearchRadiusChange(Number.parseInt(value))
						}
						disabled={disabled}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SEARCH_RADIUS_OPTIONS.map((radius) => (
								<SelectItem key={radius} value={radius.toString()}>
									{radius} km
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
		</div>
	);
};
