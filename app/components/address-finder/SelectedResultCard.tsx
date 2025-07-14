import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Suggestion } from "~/stores/types";
import { NearbyAldiStores } from "./NearbyAldiStores";
import { Home, MapPin, CheckCircle } from "lucide-react";

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
	if (!result) return null;

	const address = result.displayText || result.description;
	const mainAddress = result.structuredFormatting?.mainText || address;
	const secondaryAddress = result.structuredFormatting?.secondaryText;

	return (
		<Card className="bg-green-50 border-green-200 shadow-lg rounded-lg overflow-hidden">
			<CardHeader className="flex flex-row items-center justify-between bg-green-100 border-b border-green-200 px-6 py-4">
				<CardTitle className="flex items-center gap-3 text-lg font-semibold text-green-800">
					<CheckCircle className="w-6 h-6 text-green-600" />
					<span>Address Confirmed</span>
				</CardTitle>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onClear()}
					className="text-green-700 hover:bg-green-200 hover:text-green-800"
				>
					Search Again
				</Button>
			</CardHeader>
			<CardContent className="p-6 space-y-6">
				<div className="space-y-4">
					<div className="flex items-start gap-4">
						<div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
							<Home className="w-5 h-5 text-green-600" />
						</div>
						<div>
							<p className="text-lg font-semibold text-gray-800">{mainAddress}</p>
							{secondaryAddress && (
								<p className="text-md text-gray-600">{secondaryAddress}</p>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-green-100">
						{result.suburb && (
							<div className="flex items-center gap-2">
								<MapPin className="w-4 h-4 text-gray-500" />
								<span className="text-sm text-gray-700">
									<span className="font-semibold">Suburb:</span> {result.suburb}
								</span>
							</div>
						)}
						{result.postcode && (
							<div className="flex items-center gap-2">
								<MapPin className="w-4 h-4 text-gray-500" />
								<span className="text-sm text-gray-700">
									<span className="font-semibold">Postcode:</span>{" "}
									{result.postcode}
								</span>
							</div>
						)}
					</div>
				</div>

				{lat !== undefined && lng !== undefined && (
					<div className="mt-4 space-y-4">
						<div>
							<h3 className="font-semibold text-gray-800 mb-2">Location Map</h3>
							<div className="aspect-video rounded-lg overflow-hidden border border-gray-200">
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
						</div>
						<NearbyAldiStores lat={lat} lng={lng} />
					</div>
				)}
			</CardContent>
		</Card>
	);
};