import React from "react";
import { CreateListingFormComponent } from "../../features/listings/components/forms/CreateListingFormSimple";

export default function CreateListingPage() {
	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<CreateListingFormComponent />
			</div>
		</main>
	);
}