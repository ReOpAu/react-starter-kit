import React from "react";
import { useNavigate } from "react-router";
import { CreateListingForm } from "../../features/listings/components/forms/CreateListingForm";

export default function CreateListingPage() {
	const navigate = useNavigate();

	const handleSuccess = (listingId: string) => {
		navigate("/listings/my-listings");
	};

	const handleCancel = () => {
		navigate(-1);
	};

	return (
		<main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
				<CreateListingForm onSuccess={handleSuccess} onCancel={handleCancel} />
			</div>
		</main>
	);
}
