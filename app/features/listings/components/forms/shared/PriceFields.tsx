import { AlertCircle } from "lucide-react";
import type React from "react";
import { PRICE_OPTIONS } from "../../../../../../shared/constants/priceOptions";
import { Alert, AlertDescription } from "../../../../../components/ui/alert";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../../components/ui/card";
import { Label } from "../../../../../components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../../../components/ui/select";

interface PriceFieldsProps {
	priceMin: number;
	priceMax: number;
	title: string;
	minLabel?: string;
	maxLabel?: string;
	error?: string | null;
	onPriceChange: (price: { priceMin?: number; priceMax?: number }) => void;
}

export const PriceFields: React.FC<PriceFieldsProps> = ({
	priceMin,
	priceMax,
	title,
	minLabel = "Minimum ($)",
	maxLabel = "Maximum ($)",
	error,
	onPriceChange,
}) => {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{error && (
					<Alert variant="destructive" className="mb-4">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<Label htmlFor="priceMin">{minLabel}</Label>
						<Select
							key={`priceMin-${priceMin}`}
							value={priceMin ? priceMin.toString() : ""}
							onValueChange={(value) =>
								onPriceChange({ priceMin: Number.parseInt(value, 10) })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select minimum price" />
							</SelectTrigger>
							<SelectContent>
								{PRICE_OPTIONS.map((option) => (
									<SelectItem
										key={`min-${option.value}`}
										value={option.value.toString()}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="priceMax">{maxLabel}</Label>
						<Select
							key={`priceMax-${priceMax}`}
							value={priceMax ? priceMax.toString() : ""}
							onValueChange={(value) =>
								onPriceChange({ priceMax: Number.parseInt(value, 10) })
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select maximum price" />
							</SelectTrigger>
							<SelectContent>
								{PRICE_OPTIONS.map((option) => (
									<SelectItem
										key={`max-${option.value}`}
										value={option.value.toString()}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
