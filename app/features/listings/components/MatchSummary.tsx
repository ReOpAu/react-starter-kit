import type React from "react";
import {
	type StandardScoreBreakdown,
	calculateMatchScore,
	getMatchQualityColorClasses,
	getMatchQualityText,
} from "../services/matchingService";
import type { ConvexListing } from "../types";
import { calculateListingDistance, formatDistance } from "../utils";
import { DonutChart } from "./DonutChart";

interface ScoreComponentProps {
	label: string;
	score: number;
	weight: number;
	tooltip?: string;
}

interface MatchSummaryProps {
	originalListing: ConvexListing;
	matchedListing: ConvexListing;
	overrideScore?: number;
	overrideBreakdown?: StandardScoreBreakdown;
	showDetailedBreakdown?: boolean;
}

// Score component with small donut chart
const ScoreComponent: React.FC<ScoreComponentProps> = ({
	label,
	score,
	weight,
	tooltip,
}) => {
	// Format weight as percentage
	const formattedWeight =
		weight < 1 ? Math.round(weight * 100) : Math.round(weight);

	return (
		<div
			className="flex flex-col items-center justify-center space-y-1 px-1"
			title={
				tooltip || `${label}: ${score} points (${formattedWeight}% weighting)`
			}
		>
			<div className="text-xs text-gray-500 font-medium">{label}</div>
			<div className="relative">
				<DonutChart
					value={score}
					size={48}
					strokeWidth={4}
					showValue={true}
					className="text-xs font-semibold"
				/>
			</div>
		</div>
	);
};

export const MatchSummary: React.FC<MatchSummaryProps> = ({
	originalListing,
	matchedListing,
	overrideScore,
	overrideBreakdown,
	showDetailedBreakdown = false,
}) => {
	// Always calculate with our centralized service to ensure correct interface
	// The overrideBreakdown might be in old format from database, so we ignore it for now
	const scoreBreakdown = calculateMatchScore(originalListing, matchedListing);
	
	if (!scoreBreakdown) {
		return <div className="text-red-500">Error: Unable to calculate match score</div>;
	}
	
	const finalScore = overrideScore ?? scoreBreakdown.overall;

	// Calculate distance for display
	const distance = calculateListingDistance(originalListing, matchedListing);

	// Get standardized match quality
	const overallQualityText = getMatchQualityText(finalScore);
	const overallQualityColors = getMatchQualityColorClasses(finalScore);

	// Check for specific matches based on component scores
	const hasLocationMatch = scoreBreakdown.components.distance >= 80;
	const hasBuildingTypeMatch = scoreBreakdown.components.propertyType >= 80;
	const hasPriceMatch = scoreBreakdown.components.price >= 70;
	const hasBedroomMatch = scoreBreakdown.components.bedrooms >= 80;
	const hasParkingMatch = scoreBreakdown.components.parking >= 90;
	const hasFeaturesMatch = scoreBreakdown.components.features >= 50;

	// Same suburb check
	const sameSuburb =
		originalListing.suburb.toLowerCase() ===
		matchedListing.suburb.toLowerCase();

	// Get match quality text for features and price
	const getFeatureMatchQuality = () => {
		if (scoreBreakdown.components.features >= 90) return "Excellent";
		if (scoreBreakdown.components.features >= 70) return "Good";
		return "Passable";
	};

	const getPriceMatchQuality = () => {
		if (scoreBreakdown.components.price >= 90) return "Excellent";
		if (scoreBreakdown.components.price >= 80) return "Good";
		return "Fair";
	};

	// Get badge colors using centralized function
	const getFeatureMatchBadgeClasses = () => {
		const colors = getMatchQualityColorClasses(
			scoreBreakdown.components.features,
		);
		return `${colors.bg} ${colors.text} ${colors.border}`;
	};

	const getPriceMatchBadgeClasses = () => {
		const colors = getMatchQualityColorClasses(scoreBreakdown.components.price);
		return `${colors.bg} ${colors.text} ${colors.border}`;
	};

	return (
		<div className="bg-white rounded-2xl shadow-lg border border-gray-100">
			<div className="px-8 py-6 border-b border-gray-100">
				<h3 className="text-xl font-semibold text-gray-900">Match Summary</h3>
			</div>
			<div className="p-8 space-y-8">
				{/* Score display with component breakdown */}
				{finalScore > 0 && (
					<div className="flex justify-center w-full bg-blue-50 rounded-xl py-6">
						<div className="flex flex-col md:flex-row items-center gap-4">
							{/* Main Score Circle */}
							<div className="flex flex-col items-center">
								<div className="relative w-32 h-32 flex items-center justify-center">
									<div
										className={`absolute inset-0 rounded-full border-4 ${overallQualityColors.text} ${overallQualityColors.border} bg-white flex items-center justify-center`}
									>
										<span
											className={`font-bold text-4xl ${overallQualityColors.text}`}
										>
											{finalScore}
										</span>
									</div>
								</div>
								<div
									className={`mt-2 font-semibold ${overallQualityColors.text}`}
								>
									{overallQualityText}
								</div>
							</div>

							{/* Component Scores Grid */}
							<div className="mt-4 md:mt-0 grid grid-cols-3 gap-2 items-center justify-center">
								<ScoreComponent
									label="Distance"
									score={scoreBreakdown.components.distance}
									weight={scoreBreakdown.weights.distance}
									tooltip="Location proximity score"
								/>
								<ScoreComponent
									label="Price"
									score={scoreBreakdown.components.price}
									weight={scoreBreakdown.weights.price}
									tooltip="Price range match score"
								/>
								<ScoreComponent
									label="Type"
									score={scoreBreakdown.components.propertyType}
									weight={scoreBreakdown.weights.propertyType}
									tooltip="Property type match score"
								/>
								<ScoreComponent
									label="Bedrooms"
									score={scoreBreakdown.components.bedrooms}
									weight={scoreBreakdown.weights.bedrooms}
									tooltip="Bedroom count match score"
								/>
								<ScoreComponent
									label="Parking"
									score={scoreBreakdown.components.parking}
									weight={scoreBreakdown.weights.parking}
									tooltip="Parking availability match score"
								/>
								<ScoreComponent
									label="Features"
									score={scoreBreakdown.components.features}
									weight={scoreBreakdown.weights.features}
									tooltip="Property features match score"
								/>
							</div>
						</div>
					</div>
				)}

				{/* Match Quality Badges */}
				<div className="flex flex-wrap justify-center gap-2">
					{sameSuburb && (
						<span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
							Same Suburb
						</span>
					)}
					{hasLocationMatch && (
						<span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
							Location Match
						</span>
					)}
					{hasBuildingTypeMatch && (
						<span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
							Building Type Match
						</span>
					)}
					{hasPriceMatch && (
						<span
							className={`px-3 py-1 rounded-full font-medium ${getPriceMatchBadgeClasses()}`}
						>
							Price Compatible
						</span>
					)}
					{hasBedroomMatch && (
						<span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
							Bedroom Match
						</span>
					)}
					{hasParkingMatch && (
						<span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full font-medium">
							Parking Match
						</span>
					)}
					{hasFeaturesMatch && (
						<span
							className={`px-3 py-1 rounded-full font-medium ${getFeatureMatchBadgeClasses()}`}
						>
							Feature Match
						</span>
					)}
				</div>

				{/* Distance Information */}
				{distance !== undefined && distance !== null && (
					<div className="text-center">
						<div className="text-sm text-gray-600">
							Distance between properties:{" "}
							<span className="font-medium text-gray-900">
								{formatDistance(distance)}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MatchSummary;
