import type React from "react";
import { Badge } from "../../../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";

interface ScoreBreakdownData {
	location: number;
	buildingType: number;
	price: number;
	propertyDetails: number;
	features: number;
}

interface ScoreBreakdownProps {
	breakdown: ScoreBreakdownData;
	totalScore: number;
	weights?: {
		location: number;
		buildingType: number;
		price: number;
		propertyDetails: number;
		features: number;
	};
}

const defaultWeights = {
	location: 30,
	buildingType: 25,
	price: 20,
	propertyDetails: 15,
	features: 10,
};

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
	breakdown,
	totalScore,
	weights = defaultWeights,
}) => {
	const getScoreColor = (score: number) => {
		if (score >= 80) return "text-green-600";
		if (score >= 60) return "text-yellow-600";
		return "text-red-600";
	};

	const getProgressColor = (score: number) => {
		if (score >= 80) return "bg-green-500";
		if (score >= 60) return "bg-yellow-500";
		return "bg-red-500";
	};

	const scoreItems = [
		{
			key: "location",
			label: "Location Match",
			score: breakdown.location,
			weight: weights.location,
		},
		{
			key: "buildingType",
			label: "Building Type",
			score: breakdown.buildingType,
			weight: weights.buildingType,
		},
		{
			key: "price",
			label: "Price Range",
			score: breakdown.price,
			weight: weights.price,
		},
		{
			key: "propertyDetails",
			label: "Property Details",
			score: breakdown.propertyDetails,
			weight: weights.propertyDetails,
		},
		{
			key: "features",
			label: "Features",
			score: breakdown.features,
			weight: weights.features,
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					Score Breakdown
					<Badge
						variant="outline"
						className={`text-lg px-3 py-1 ${getScoreColor(totalScore)}`}
					>
						{totalScore}% Overall
					</Badge>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{scoreItems.map((item) => (
						<div key={item.key} className="space-y-2">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">{item.label}</span>
								<div className="flex items-center gap-2">
									<span className="text-xs text-gray-500">
										Weight: {item.weight}%
									</span>
									<span
										className={`text-sm font-medium ${getScoreColor(item.score)}`}
									>
										{item.score}%
									</span>
								</div>
							</div>
							<div className="relative">
								<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
									<div
										className={`h-full transition-all ${getProgressColor(item.score)}`}
										style={{ width: `${item.score}%` }}
									/>
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
};
