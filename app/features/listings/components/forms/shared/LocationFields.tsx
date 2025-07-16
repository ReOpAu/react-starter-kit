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

const AUSTRALIAN_STATES = [
	{ value: "NSW", label: "New South Wales" },
	{ value: "VIC", label: "Victoria" },
	{ value: "QLD", label: "Queensland" },
	{ value: "WA", label: "Western Australia" },
	{ value: "SA", label: "South Australia" },
	{ value: "TAS", label: "Tasmania" },
	{ value: "ACT", label: "Australian Capital Territory" },
	{ value: "NT", label: "Northern Territory" },
];

interface LocationFieldsProps {
	suburb: string;
	state: string;
	postcode: string;
	address?: string;
	showAddress?: boolean;
	addressLabel?: string;
	addressPlaceholder?: string;
	onChange: (field: string, value: string) => void;
}

export const LocationFields: React.FC<LocationFieldsProps> = ({
	suburb,
	state,
	postcode,
	address = "",
	showAddress = false,
	addressLabel = "Address",
	addressPlaceholder = "Enter address",
	onChange,
}) => {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Location</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{showAddress && (
					<div className="space-y-2">
						<Label htmlFor="address">{addressLabel}</Label>
						<Input
							id="address"
							value={address}
							onChange={(e) => onChange("address", e.target.value)}
							placeholder={addressPlaceholder}
							required={showAddress}
						/>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="space-y-2">
						<Label htmlFor="suburb">Suburb</Label>
						<Input
							id="suburb"
							value={suburb}
							onChange={(e) => onChange("suburb", e.target.value)}
							placeholder="e.g., Bondi"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="state">State</Label>
						<Select
							key={`state-${state}`}
							value={state || ""}
							onValueChange={(value) => onChange("state", value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select state" />
							</SelectTrigger>
							<SelectContent>
								{AUSTRALIAN_STATES.map((stateOption) => (
									<SelectItem key={stateOption.value} value={stateOption.value}>
										{stateOption.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="postcode">Postcode</Label>
						<Input
							id="postcode"
							value={postcode}
							onChange={(e) => onChange("postcode", e.target.value)}
							placeholder="e.g., 2026"
							required
						/>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
