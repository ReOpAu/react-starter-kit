import {
	FileText,
	Handshake,
	Search,
	ShieldCheck,
	Users,
	Zap,
} from "lucide-react";

const buyerBenefits = [
	{
		icon: <Search className="w-8 h-8 text-buyer-orange-600" />,
		title: "Exclusive Access",
		description:
			"Get first access to off-market properties before they hit the public market, giving you a competitive advantage.",
	},
	{
		icon: <Handshake className="w-8 h-8 text-buyer-orange-600" />,
		title: "Direct Negotiations",
		description:
			"Deal directly with property owners, enabling more flexible negotiations and better terms.",
	},
];

const sellerBenefits = [
	{
		icon: <Users className="w-8 h-8 text-seller-purple-600" />,
		title: "Qualified Buyers",
		description:
			"Connect only with pre-qualified buyers who match your specific criteria, saving time and ensuring serious inquiries.",
	},
	{
		icon: <ShieldCheck className="w-8 h-8 text-seller-purple-600" />,
		title: "Private Listings",
		description:
			"Maintain privacy and control over your property listing, choosing who sees your property details.",
	},
];

const platformBenefits = [
	{
		icon: <Zap className="w-8 h-8 text-gray-700" />,
		title: "Efficient Matching",
		description:
			"Our matching system connects the right buyers with the right properties quickly and effectively.",
	},
	{
		icon: <FileText className="w-8 h-8 text-gray-700" />,
		title: "Time Savings",
		description:
			"Save time and effort by only dealing with relevant, matched opportunities that meet your criteria.",
	},
];

const BenefitCard = ({
	benefit,
}: {
	benefit: { icon: React.ReactNode; title: string; description: string };
}) => (
	<div className="p-6 border border-gray-200/50 rounded-xl shadow-sm bg-white">
		<div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100 mb-4">
			{benefit.icon}
		</div>
		<h3 className="text-lg font-semibold text-gray-800 mb-2">
			{benefit.title}
		</h3>
		<p className="text-gray-600">{benefit.description}</p>
	</div>
);

export function Benefits() {
	return (
		<section className="py-20 bg-gradient-to-b from-gray-50 to-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16">
					<p className="text-base font-semibold leading-7 text-primary">
						Platform Benefits
					</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Why Choose REOP
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
						Experience the advantages of off-market real estate transactions
						through our efficient matching platform.
					</p>
				</div>
				<div className="space-y-16">
					<div>
						<h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
							For Buyers
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
							{buyerBenefits.map((benefit) => (
								<BenefitCard key={benefit.title} benefit={benefit} />
							))}
						</div>
					</div>
					<div>
						<h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
							For Sellers
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
							{sellerBenefits.map((benefit) => (
								<BenefitCard key={benefit.title} benefit={benefit} />
							))}
						</div>
					</div>
					<div>
						<h3 className="text-2xl font-semibold text-center text-gray-800 mb-8">
							Platform Features
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
							{platformBenefits.map((benefit) => (
								<BenefitCard key={benefit.title} benefit={benefit} />
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
