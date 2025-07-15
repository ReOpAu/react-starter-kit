import type React from "react";

interface StatusRibbonProps {
	variant: "SAMPLE" | "NEW";
	className?: string;
}

/**
 * StatusRibbon component displays a corner ribbon for listing status
 * Based on the legacy SampleRibbon component design
 */
export const StatusRibbon: React.FC<StatusRibbonProps> = ({ 
	variant, 
	className = "" 
}) => {
	// Determine styles based on variant
	const styles = {
		SAMPLE: {
			backgroundColor: "#FBBF24", // yellow-400
			color: "#78350F", // yellow-900
		},
		NEW: {
			backgroundColor: "#10B981", // emerald-500
			color: "#064E3B", // emerald-900
		},
	};

	const currentStyle = styles[variant];

	return (
		<div
			className={`absolute right-0 top-0 ${className}`}
			style={{
				width: "120px",
				height: "120px",
				overflow: "hidden",
				pointerEvents: "none",
				zIndex: 10,
			}}
		>
			<div
				style={{
					position: "absolute",
					width: "150px",
					backgroundColor: currentStyle.backgroundColor,
					transform: "rotate(45deg)",
					right: "-38px",
					top: "28px",
					textAlign: "center",
					lineHeight: "24px",
					fontSize: "12px",
					fontWeight: 600,
					color: currentStyle.color,
					letterSpacing: "1px",
					boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
				}}
			>
				{variant}
			</div>
		</div>
	);
};