import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Suggestion } from "~/stores/addressFinderStore";
import { NearbyAldiStores } from "./NearbyAldiStores";

interface SelectedResultCardProps {
	result: Suggestion;
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
	return (
		<Card className="bg-purple-50 border-purple-200">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-base">
					<span>🎯</span>
					<span>Confirmed Selection</span>
				</CardTitle>
				<Button variant="ghost" size="sm" onClick={() => onClear()}>
					Clear
				</Button>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<div>
						<p className="font-semibold text-purple-800">Address:</p>
						<p className="text-purple-700 font-medium">{result.description}</p>
					</div>
					<div className="bg-white p-3 rounded border">
						<p className="font-medium text-purple-800">Place ID:</p>
						<p className="text-purple-600 font-mono text-xs break-all">
							{result.placeId}
						</p>
					</div>
					{/* Additional API Data */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-purple-100/40 rounded p-3">
						{result.resultType && (
							<div>
								<span className="font-semibold text-purple-800">
									Result Type:{" "}
								</span>
								<span className="text-purple-700">{result.resultType}</span>
							</div>
						)}
						{result.suburb && (
							<div>
								<span className="font-semibold text-purple-800">Suburb: </span>
								<span className="text-purple-700">{result.suburb}</span>
							</div>
						)}
						{result.types && result.types.length > 0 && (
							<div className="md:col-span-2">
								<span className="font-semibold text-purple-800">Types: </span>
								<span className="text-purple-700">
									{result.types.join(", ")}
								</span>
							</div>
						)}
						{lat !== undefined && lng !== undefined && (
							<div className="md:col-span-2">
								<span className="font-semibold text-purple-800">
									Coordinates:{" "}
								</span>
								<span className="text-purple-700">
									{lat}, {lng}
								</span>
							</div>
						)}
					</div>
					{lat !== undefined && lng !== undefined && (
						<div className="mt-4">
							<p className="font-semibold text-purple-800 mb-2">
								Location Map:
							</p>
							<iframe
								title="Google Map"
								width="100%"
								height="250"
								style={{ border: 0, borderRadius: "8px" }}
								loading="lazy"
								allowFullScreen
								referrerPolicy="no-referrer-when-downgrade"
								src={`https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`}
							/>
							<NearbyAldiStores lat={lat} lng={lng} />
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
};
