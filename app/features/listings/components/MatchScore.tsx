import type React from "react";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";

interface MatchScoreProps {
	score: number;
	size?: "sm" | "md" | "lg";
	showProgress?: boolean;
	className?: string;
}

export const MatchScore: React.FC<MatchScoreProps> = ({
	score,
	size = "md",
	showProgress = true,
	className = "",
}) => {
	const getScoreColor = (score: number) => {
		if (score >= 80) return "text-green-600 bg-green-50 border-green-200";
		if (score >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200";
		return "text-red-600 bg-red-50 border-red-200";
	};

	const getProgressColor = (score: number) => {
		if (score >= 80) return "bg-green-500";
		if (score >= 60) return "bg-yellow-500";
		return "bg-red-500";
	};

	const sizeClasses = {
		sm: "text-xs px-2 py-1",
		md: "text-sm px-3 py-1",
		lg: "text-base px-4 py-2",
	};

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			{showProgress && (
				<div className="flex-1 min-w-16 relative">
					<div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
						<div
							className={`h-full transition-all ${getProgressColor(score)}`}
							style={{ width: `${score}%` }}
						/>
					</div>
				</div>
			)}
			<Badge
				variant="outline"
				className={`${getScoreColor(score)} ${sizeClasses[size]}`}
			>
				{score}%
			</Badge>
		</div>
	);
};
