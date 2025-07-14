import { BarChart, Bell, Search, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

const benefits = [
	{
		icon: <Search className="w-8 h-8 text-buyer-orange-600" />,
		title: "Smart Property Matching",
		description:
			"Our AI analyzes thousands of properties to find perfect matches based on your specific criteria and investment goals.",
	},
	{
		icon: <BarChart className="w-8 h-8 text-buyer-orange-600" />,
		title: "Market Intelligence",
		description:
			"Get real-time insights into property values, market trends, and growth potential in your target areas.",
	},
	{
		icon: <TrendingUp className="w-8 h-8 text-buyer-orange-600" />,
		title: "Investment Analysis",
		description:
			"Comprehensive ROI calculations, rental yield projections, and property appreciation forecasts.",
	},
	{
		icon: <Bell className="w-8 h-8 text-buyer-orange-600" />,
		title: "Opportunity Alerts",
		description:
			"Receive instant notifications when properties matching your criteria hit the market or have price adjustments.",
	},
];

export function BuyerGuide() {
	return (
		<section className="py-20 bg-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<p className="text-base font-semibold leading-7 text-buyer-orange-600">
						For Property Buyers
					</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Your Intelligent Property Search Partner
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
						REOP revolutionizes how you find and evaluate property investments,
						combining AI-powered insights with comprehensive market data.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{benefits.map((benefit) => (
						<div
							key={benefit.title}
							className="p-6 text-center border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex items-center justify-center h-12 w-12 rounded-lg bg-buyer-orange-100 mb-4 mx-auto">
								{benefit.icon}
							</div>
							<h3 className="text-xl font-semibold text-gray-800 mb-2">
								{benefit.title}
							</h3>
							<p className="text-gray-600">{benefit.description}</p>
						</div>
					))}
				</div>
				<div className="mt-12 text-center">
					<Button asChild size="lg" variant="buyer">
						<Link to="/sign-up">Start Your Property Search</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
