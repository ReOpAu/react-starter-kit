import type React from "react";
import type { Listing } from "../types";
import { ListingCard } from "./ListingCard";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "../../../components/ui/pagination";

// Helper function to generate smart pagination items with ellipsis
function generatePaginationItems(currentPage: number, totalPages: number) {
	const items: Array<{ type: 'page' | 'ellipsis'; page?: number }> = [];
	
	// Always show first page
	if (totalPages > 0) {
		items.push({ type: 'page', page: 1 });
	}
	
	// Calculate range around current page
	const startPage = Math.max(2, currentPage - 1);
	const endPage = Math.min(totalPages - 1, currentPage + 1);
	
	// Add ellipsis after first page if needed
	if (startPage > 2) {
		items.push({ type: 'ellipsis' });
	}
	
	// Add pages around current page
	for (let page = startPage; page <= endPage; page++) {
		if (page !== 1 && page !== totalPages) {
			items.push({ type: 'page', page });
		}
	}
	
	// Add ellipsis before last page if needed
	if (endPage < totalPages - 1) {
		items.push({ type: 'ellipsis' });
	}
	
	// Always show last page (if different from first)
	if (totalPages > 1) {
		items.push({ type: 'page', page: totalPages });
	}
	
	return items;
}

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
			
			{/* Pagination controls using shadcn/ui components */}
			{pagination.totalPages > 1 && (
				<Pagination className="mt-6">
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious 
								href="#"
								onClick={(e) => {
									e.preventDefault();
									if (pagination.currentPage > 1) {
										pagination.onPageChange(pagination.currentPage - 1);
									}
								}}
								className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
						
						{/* Smart pagination with ellipsis */}
						{generatePaginationItems(pagination.currentPage, pagination.totalPages).map((item, index) => (
							<PaginationItem key={item.type === 'page' ? `page-${item.page}` : `ellipsis-${index}`}>
								{item.type === 'page' ? (
									<PaginationLink
										href="#"
										onClick={(e) => {
											e.preventDefault();
											if (item.page) {
												pagination.onPageChange(item.page);
											}
										}}
										isActive={item.page === pagination.currentPage}
										className={item.page === pagination.currentPage ? 
											"bg-primary text-primary-foreground hover:bg-primary/90 font-bold ring-2 ring-primary/20 shadow-md" : 
											""
										}
									>
										{item.page}
									</PaginationLink>
								) : (
									<PaginationEllipsis />
								)}
							</PaginationItem>
						))}
						
						<PaginationItem>
							<PaginationNext 
								href="#"
								onClick={(e) => {
									e.preventDefault();
									if (pagination.currentPage < pagination.totalPages) {
										pagination.onPageChange(pagination.currentPage + 1);
									}
								}}
								className={pagination.currentPage === pagination.totalPages ? 'pointer-events-none opacity-50' : ''}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	);
};
