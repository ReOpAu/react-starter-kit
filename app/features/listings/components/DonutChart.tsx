import type React from "react";

interface DonutChartProps {
	value: number;
	max?: number;
	size?: number;
	strokeWidth?: number;
	color?: string;
	backgroundColor?: string;
	label?: string;
	showValue?: boolean;
	className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
	value,
	max = 100,
	size = 80,
	strokeWidth = 8,
	color = "#3b82f6",
	backgroundColor = "#e5e7eb",
	label,
	showValue = true,
	className = "",
}) => {
	const normalizedValue = Math.min(Math.max(value, 0), max);
	const percentage = (normalizedValue / max) * 100;
	
	const radius = (size - strokeWidth) / 2;
	const circumference = radius * 2 * Math.PI;
	const strokeDasharray = circumference;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	// Get color based on score
	const getScoreColor = (score: number) => {
		if (score >= 90) return "#059669"; // green-600
		if (score >= 80) return "#0ea5e9"; // sky-500
		if (score >= 70) return "#eab308"; // yellow-500
		if (score >= 60) return "#f97316"; // orange-500
		return "#dc2626"; // red-600
	};

	const scoreColor = color === "#3b82f6" ? getScoreColor(normalizedValue) : color;

	return (
		<div className={`flex flex-col items-center ${className}`}>
			<div className="relative" style={{ width: size, height: size }}>
				<svg
					width={size}
					height={size}
					className="transform -rotate-90"
				>
					{/* Background circle */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke={backgroundColor}
						strokeWidth={strokeWidth}
						fill="none"
					/>
					{/* Progress circle */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						stroke={scoreColor}
						strokeWidth={strokeWidth}
						fill="none"
						strokeDasharray={strokeDasharray}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						className="transition-all duration-1000 ease-out"
					/>
				</svg>
				{/* Center content */}
				{showValue && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<div className="text-sm font-bold" style={{ color: scoreColor }}>
								{normalizedValue}%
							</div>
						</div>
					</div>
				)}
			</div>
			{label && (
				<div className="mt-2 text-xs text-gray-600 text-center max-w-20">
					{label}
				</div>
			)}
		</div>
	);
};

export default DonutChart;