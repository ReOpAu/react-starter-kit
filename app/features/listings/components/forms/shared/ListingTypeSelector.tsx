import { Building2, Search } from "lucide-react";
import type React from "react";
import { Label } from "../../../../../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../../../components/ui/select";
import type { ListingType } from "../../../../../../shared/constants/listingConstants";

interface ListingTypeSelectorProps {
	value: ListingType;
	onChange: (value: ListingType) => void;
	disabled?: boolean;
}

export const ListingTypeSelector: React.FC<ListingTypeSelectorProps> = ({
	value,
	onChange,
	disabled = false,
}) => {
	return (
		<div className="space-y-2">
			<Label htmlFor="listingType">I am a</Label>
			<Select
				value={value}
				onValueChange={onChange}
				disabled={disabled}
			>
				<SelectTrigger>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="buyer">
						<div className="flex items-center gap-2">
							<Search className="w-4 h-4" />
							<span>Buyer</span>
						</div>
					</SelectItem>
					<SelectItem value="seller">
						<div className="flex items-center gap-2">
							<Building2 className="w-4 h-4" />
							<span>Seller</span>
						</div>
					</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
};