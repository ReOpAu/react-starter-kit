import type React from "react";
import type { Listing } from "../types";
import { ListingCard } from "./ListingCard";
import { Button } from "../../../components/ui/button";

export interface ListingsGridProps {
	listings: Listing[];
	pagination: {
		currentPage: number;
		totalPages: number;
		onPageChange: (page: number) => void;
	};
}

export const ListingsGrid: React.FC<ListingsGridProps> = ({
	listings,
	pagination,
}) => {
	return (
		<div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
				{listings.map((listing) => (
					<ListingCard key={listing._id} listing={listing} />
				))}
			</div>
			
			{/* Pagination controls using simple buttons */}
			{pagination.totalPages > 1 && (
				<div className="flex justify-center items-center gap-2 mt-6">
					<Button
						variant="outline"
						onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
						disabled={pagination.currentPage === 1}
					>
						Previous
					</Button>
					
					{/* Page numbers */}
					{Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
						<Button
							key={page}
							variant={page === pagination.currentPage ? "default" : "outline"}
							size="sm"
							onClick={() => pagination.onPageChange(page)}
						>
							{page}
						</Button>
					))}
					
					<Button
						variant="outline"
						onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
						disabled={pagination.currentPage === pagination.totalPages}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
};
