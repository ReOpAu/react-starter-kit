import { CheckCircle, Home, MapPin, Store } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import type { Suggestion } from "~/stores/types";
import { NearbyAldiStores } from "./NearbyAldiStores";

interface SelectedResultCardProps {
	result: Suggestion | null;
	onClear: () => void;
	lat?: number;
	lng?: number;
}

export const SelectedResultCard: React.FC<SelectedResultCardProps> = ({
	result,
	onClear,
	lat,
	lng,
}) => {
	const [showAldiStores, setShowAldiStores] = useState(false);

	if (!result) return null;

	const address = result.displayText || result.description;
	const mainAddress = result.structuredFormatting?.mainText || address;
	const secondaryAddress = result.structuredFormatting?.secondaryText;

	return (
		<Card className="bg-white border-l-4 border-l-green-500 border-gray-200 shadow-sm rounded-lg overflow-hidden">
			<CardContent className="p-6 space-y-5">
				<div className="flex items-start justify-between">
					<div className="flex items-start gap-3">
						<CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-base font-medium text-gray-900">
								{mainAddress}
							</p>
							{secondaryAddress && (
								<p className="text-sm text-muted-foreground mt-0.5">
									{secondaryAddress}
								</p>
							)}
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onClear()}
						className="text-muted-foreground hover:text-foreground"
					>
						Search Again
					</Button>
				</div>

				{(result.suburb || result.postcode) && (
					<div className="flex items-center gap-6 pt-3 border-t border-gray-100">
						{result.suburb && (
							<div className="flex items-center gap-1.5">
								<MapPin className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									{result.suburb}
								</span>
							</div>
						)}
						{result.postcode && (
							<div className="flex items-center gap-1.5">
								<Home className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="text-sm text-muted-foreground">
									{result.postcode}
								</span>
							</div>
						)}
					</div>
				)}

				{lat !== undefined && lng !== undefined && (
					<div className="space-y-4 pt-2">
						<div className="aspect-video rounded-lg overflow-hidden border border-gray-100">
							<iframe
								title="Google Map"
								width="100%"
								height="100%"
								className="border-0"
								loading="lazy"
								allowFullScreen
								referrerPolicy="no-referrer-when-downgrade"
								src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed&iwloc=A`}
							/>
						</div>
						<div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowAldiStores(!showAldiStores)}
								className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
							>
								<Store className="w-4 h-4" />
								{showAldiStores ? "Hide" : "Show"} nearby Aldi stores
							</Button>
							{showAldiStores && <NearbyAldiStores lat={lat} lng={lng} />}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
};
