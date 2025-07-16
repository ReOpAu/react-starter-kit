import { NearbyAldiStores } from "../components/address-finder/NearbyAldiStores";
import { PublicLayout } from "../components/layout/PublicLayout";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";

const CAMBERWELL = {
	suburb: "Camberwell",
	placeId: "ChIJT8ASrWM_1moRYNmMIXVWBAU",
	lat: -37.8326655,
	lng: 145.0681032,
	resultType: "suburb",
	types: ["political", "locality", "geocode"],
};

export default function TestAldi() {
	return (
		<PublicLayout>
			<div className="container mx-auto py-8 max-w-lg">
				<Card>
					<CardHeader>
						<CardTitle>Test: Nearby Aldi Stores (Camberwell VIC)</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="mb-4 text-sm text-gray-700">
							<div>
								<strong>Suburb:</strong> {CAMBERWELL.suburb}
							</div>
							<div>
								<strong>Place ID:</strong> {CAMBERWELL.placeId}
							</div>
							<div>
								<strong>Coordinates:</strong> {CAMBERWELL.lat}, {CAMBERWELL.lng}
							</div>
							<div>
								<strong>Result Type:</strong> {CAMBERWELL.resultType}
							</div>
							<div>
								<strong>Types:</strong> {CAMBERWELL.types.join(", ")}
							</div>
						</div>
						<NearbyAldiStores lat={CAMBERWELL.lat} lng={CAMBERWELL.lng} />
					</CardContent>
				</Card>
			</div>
		</PublicLayout>
	);
}
