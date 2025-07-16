import type React from "react";
import { Badge } from "../../../components/ui/badge";
import type { ConvexListing } from "../types";
import { formatDistance } from "../utils";
import {
	formatListingDetails,
	formatListingLocation,
	getListingTypeLabel,
	normalizeSuburb,
} from "../utils/matchUtils";

interface MatchTitleSectionProps {
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	isOriginalBuyer: boolean;
	isMatchedBuyer: boolean;
	isOriginalSuburbBuyer: boolean;
	isMatchedSuburbBuyer: boolean;
	score?: number;
	distance?: number;
}

export const MatchTitleSection: React.FC<MatchTitleSectionProps> = ({
	originalListing,
	matchedListing,
	isOriginalBuyer,
	isMatchedBuyer,
	isOriginalSuburbBuyer,
	isMatchedSuburbBuyer,
	score,
	distance,
}) => {
	// Format match score for accessibility
	const matchScoreLabel = score ? `${score}% compatibility score` : "";

	// Determine match quality text and color
	const getMatchQualityInfo = (
		score?: number,
	): { text: string; color: string } => {
		if (!score) return { text: "", color: "bg-gray-100 text-gray-800" };
		if (score >= 90) {
			return { text: "Excellent Match", color: "bg-green-100 text-green-800" };
		}
		if (score >= 80) {
			return {
				text: "Very Good Match",
				color: "bg-emerald-100 text-emerald-800",
			};
		}
		if (score >= 70) {
			return { text: "Good Match", color: "bg-teal-100 text-teal-800" };
		}
		if (score >= 60) {
			return { text: "Fair Match", color: "bg-yellow-100 text-yellow-800" };
		}
		return { text: "Average Match", color: "bg-orange-100 text-orange-800" };
	};

	const matchQuality = getMatchQualityInfo(score);

	return (
		<div className="space-y-4">
			<h1 className="text-3xl font-bold text-gray-900 md:flex md:flex-wrap md:items-center gap-3">
				<span className="text-orange-500">
					{isOriginalBuyer ? "Buyer" : "Seller"}
					{formatListingLocation(originalListing, isOriginalSuburbBuyer)}
				</span>
				<span className="text-gray-400 font-normal">with</span>
				<span className="text-purple-500">
					{isMatchedBuyer ? "Buyer" : "Seller"}
					{formatListingLocation(matchedListing, isMatchedSuburbBuyer)}
				</span>
				{score && (
					<Badge
						variant="outline"
						className={`text-lg px-4 py-1.5 inline-block mt-2 md:mt-0 ${matchQuality.color}`}
						title={matchQuality.text}
					>
						{score}% Match
					</Badge>
				)}
			</h1>
			<p className="text-gray-600 text-lg">
				{formatListingDetails(originalListing, isOriginalSuburbBuyer)} matched
				with {formatListingDetails(matchedListing, isMatchedSuburbBuyer)}
				{distance !== undefined && (
					<span className="ml-2 text-gray-500">
						({formatDistance(distance)} apart)
					</span>
				)}
			</p>
		</div>
	);
};

export default MatchTitleSection;
