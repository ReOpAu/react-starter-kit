import type React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../../../components/ui/button";
import type { ConvexListing } from "../types";
import { generateMatchesUrl } from "../utils/urlHelpers";

interface NavigationSectionProps {
	originalListing: ConvexListing;
	matchedListing?: ConvexListing;
}

export const NavigationSection: React.FC<NavigationSectionProps> = ({
	originalListing,
	matchedListing,
}) => {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-4">
				<Button variant="ghost" asChild>
					<Link to={generateMatchesUrl(originalListing)}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Matches
					</Link>
				</Button>

				{matchedListing && (
					<Button variant="outline" asChild>
						<Link to={`/listings/${originalListing.state.toLowerCase()}/${originalListing.listingType}/${originalListing.suburb.toLowerCase()}/${originalListing._id}`}>
							View Original Listing
						</Link>
					</Button>
				)}
			</div>
		</div>
	);
};

export default NavigationSection;