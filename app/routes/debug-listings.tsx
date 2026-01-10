import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function DebugListings() {
	const allListingsData = useQuery(api.listings.getAllListingsDebug, {});
	const filteredListingsData = useQuery(api.listings.listListings, {
		listingType: "seller",
		state: "vic",
		suburb: "Toorak",
	});

	if (allListingsData === undefined || filteredListingsData === undefined) {
		return <div className="p-8">Loading...</div>;
	}

	const allListings = allListingsData.listings;
	const filteredListings = filteredListingsData.listings;

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold mb-4">Debug Listings</h1>

			<div className="mb-8">
				<h2 className="text-xl font-semibold">
					Total Listings: {allListings.length}
				</h2>
			</div>

			<div className="mb-8">
				<h2 className="text-xl font-semibold mb-2">All Listings:</h2>
				<div className="grid gap-2 max-h-96 overflow-y-auto">
					{allListings.map((listing) => (
						<div key={listing.id} className="p-2 border rounded text-sm">
							{listing.listingType} in {listing.suburb}, {listing.state}
						</div>
					))}
				</div>
			</div>

			<div className="mb-8">
				<h2 className="text-xl font-semibold mb-2">
					Filtered Listings (seller, vic, Toorak): {filteredListings.length}
				</h2>
				<div className="grid gap-2">
					{filteredListings.map((listing) => (
						<div key={listing._id} className="p-2 border rounded">
							{listing.listingType} in {listing.suburb}, {listing.state}
						</div>
					))}
				</div>
			</div>

			{allListings.length === 0 && (
				<div className="mt-8 p-4 bg-yellow-100 rounded">
					<p>No listings found. You may need to seed the database first.</p>
					<p>
						Check the console or run the seed function to create test listings.
					</p>
				</div>
			)}
		</div>
	);
}
