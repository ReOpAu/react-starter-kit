import type React from "react";
import { useState } from "react";
import { ListingsGrid } from "./ListingsGrid";
import type { Listing, ListingType } from "../types";
import { useListings } from "../data/listingsService";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";

export interface ListingsDisplayProps {
  initialFilters?: { listingType?: ListingType | "all"; state?: string; suburb?: string };
}

export const ListingsDisplay: React.FC<ListingsDisplayProps> = ({ initialFilters }) => {
  const [filters, setFilters] = useState({
    listingType: initialFilters?.listingType || "all",
    state: initialFilters?.state || "",
    suburb: initialFilters?.suburb || "",
    page: 1,
  });

  const { listings, totalPages, isLoading } = useListings(filters);

  const handleFilterChange = (name: string, value: string) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select 
                value={filters.listingType} 
                onValueChange={(value) => handleFilterChange("listingType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select listing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="buyer">Buyer</SelectItem>
                  <SelectItem value="seller">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                name="state"
                value={filters.state}
                onChange={(e) => handleFilterChange("state", e.target.value)}
                placeholder="State (e.g., NSW, VIC)"
              />
            </div>
            <div className="flex-1">
              <Input
                name="suburb"
                value={filters.suburb}
                onChange={(e) => handleFilterChange("suburb", e.target.value)}
                placeholder="Suburb"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No listings found.</div>
      ) : (
        <ListingsGrid
          listings={listings}
          pagination={{
            currentPage: filters.page,
            totalPages,
            onPageChange: handlePageChange,
          }}
        />
      )}
    </div>
  );
};
