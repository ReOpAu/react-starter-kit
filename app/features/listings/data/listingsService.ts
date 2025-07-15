import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import type { Listing, ListingType } from "../types";
import type { Id } from "@/convex/_generated/dataModel";

interface UseListingsArgs {
  listingType?: ListingType | "all";
  state?: string;
  suburb?: string;
  page?: number;
  pageSize?: number;
}

// Fetch listings with filters (type, state, suburb, pagination)
export function useListings({ listingType, state, suburb, page = 1, pageSize = 10 }: UseListingsArgs) {
  // Convex query expects filters as args
  const result = useQuery(api.listings.listListings, {
    listingType: listingType === "all" ? undefined : listingType,
    state: state || undefined,
    suburb: suburb || undefined,
    // Pagination can be added to backend and here if needed
  });
  
  const listings = result || [];
  const isLoading = result === undefined;
  
  // TODO: Add pagination support if backend supports it
  return { listings, totalPages: 1, isLoading };
}

// Fetch a single listing by ID
export function useListingById(id: string) {
  return useQuery(api.listings.getListing, { id: id as Id<"listings"> });
}

// Fetch matches for a listing (by ID)
export function useMatchesForListing(listingId: string, options = {}) {
  return useQuery(api.matches.findMatches, { listingId: listingId as Id<"listings">, options });
}

// Mutations for create/update/delete can be added as needed
export function useCreateListing() {
  return useMutation(api.listings.createListing);
}
export function useUpdateListing() {
  return useMutation(api.listings.updateListing);
}
export function useDeleteListing() {
  return useMutation(api.listings.deleteListing);
}
