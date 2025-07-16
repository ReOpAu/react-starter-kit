import { Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../../components/ui/card";
import type { ListingType } from "../../../../../shared/constants/listingConstants";
import { CreateBuyerListingForm } from "./CreateBuyerListingForm";
import { CreateSellerListingForm } from "./CreateSellerListingForm";
import { ListingTypeSelector } from "./shared/ListingTypeSelector";

interface CreateListingFormProps {
	onSuccess?: (listingId: string) => void;
	onCancel?: () => void;
}

export const CreateListingForm: React.FC<CreateListingFormProps> = ({
	onSuccess,
	onCancel,
}) => {
	const [listingType, setListingType] = useState<ListingType | null>(null);

	const handleBack = () => {
		setListingType(null);
	};

	// Step 1: Type selection
	if (!listingType) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Plus className="w-5 h-5" />
						Create New Listing
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<p className="text-muted-foreground">
						Choose the type of listing you want to create:
					</p>
					
					<ListingTypeSelector
						value={listingType || "buyer"}
						onChange={setListingType}
					/>

					<div className="flex gap-4 justify-end">
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel}>
								Cancel
							</Button>
						)}
						<Button 
							onClick={() => listingType && setListingType(listingType)}
							disabled={!listingType}
						>
							Continue
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Step 2: Route to appropriate form
	if (listingType === "buyer") {
		return (
			<CreateBuyerListingForm
				onSuccess={onSuccess}
				onCancel={onCancel || handleBack}
			/>
		);
	}

	if (listingType === "seller") {
		return (
			<CreateSellerListingForm
				onSuccess={onSuccess}
				onCancel={onCancel || handleBack}
			/>
		);
	}

	// Fallback (should never reach here)
	return (
		<Card>
			<CardContent className="text-center p-8">
				<p className="text-muted-foreground">
					Unknown listing type. Please start over.
				</p>
				<Button onClick={handleBack} className="mt-4">
					Back to Type Selection
				</Button>
			</CardContent>
		</Card>
	);
};
