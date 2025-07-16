import type React from "react";
import { ListingsDisplay } from "../components/ListingsDisplay";

const ListingsOverviewPage: React.FC = () => {
	return (
		<div className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<div className="mx-auto max-w-2xl lg:text-center mb-16">
					<h1 className="text-base font-semibold leading-7 text-buyerOrange-600">
						Browse Listings
					</h1>
					<p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Property Listings
					</p>
					<p className="mt-6 text-lg leading-8 text-gray-600">
						Browse and search property listings from buyers and sellers. Find
						your perfect property match or list your requirements.
					</p>
				</div>
				<ListingsDisplay />
			</div>
		</div>
	);
};

export default ListingsOverviewPage;
