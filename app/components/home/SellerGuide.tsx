import { BarChart, Clock, Target, Users } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

const benefits = [
	{
		icon: <Target className="w-8 h-8 text-seller-purple-600" />,
		title: "Optimal Pricing Strategy",
		description:
			"Our AI analyzes market data, comparable sales, and local trends to help you set the perfect listing price for maximum return.",
	},
	{
		icon: <Users className="w-8 h-8 text-seller-purple-600" />,
		title: "Targeted Buyer Matching",
		description:
			"Connect directly with pre-qualified buyers actively searching for properties like yours, reducing time on market.",
	},
	{
		icon: <BarChart className="w-8 h-8 text-seller-purple-600" />,
		title: "Market Performance Insights",
		description:
			"Get detailed analytics on viewer engagement, market reception, and real-time feedback to optimize your listing.",
	},
	{
		icon: <Clock className="w-8 h-8 text-seller-purple-600" />,
		title: "Strategic Timing",
		description:
			"Leverage our predictive analytics to identify the optimal time to list your property based on market conditions.",
	},
];

export function SellerGuide() {
	return (
		<section className="py-20 bg-gradient-to-b from-gray-50 to-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<p className="text-base font-semibold leading-7 text-seller-purple-600">
						For Property Sellers
					</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Maximize Your Property's Potential
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
						Turn data into dollars with REOP. Our AI-powered tools help you make
						informed decisions and connect with the right buyers at the right
						time.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{benefits.map((benefit) => (
						<div
							key={benefit.title}
							className="p-6 text-center border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex items-center justify-center h-12 w-12 rounded-lg bg-seller-purple-100 mb-4 mx-auto">
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
					<Button asChild size="lg" variant="seller">
						<Link to="/sign-up">List Your Property</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
