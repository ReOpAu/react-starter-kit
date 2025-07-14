const steps = [
	{
		number: 1,
		title: "Create Your Profile",
		description:
			"Sign up and create your detailed profile. Buyers specify their property criteria and budget. Sellers list their property details and requirements.",
	},
	{
		number: 2,
		title: "Property Matching",
		description:
			"Our system matches buyers with relevant off-market properties and connects sellers with qualified buyers who meet their criteria.",
	},
	{
		number: 3,
		title: "Direct Communication",
		description:
			"When a match is found, both parties are notified and can communicate directly through our secure platform to discuss details.",
	},
	{
		number: 4,
		title: "Complete Transaction",
		description:
			"Once both parties agree to proceed, they can complete the transaction with their preferred real estate professionals and legal advisors.",
	},
];

export function HowItWorksDetailed() {
	return (
		<section className="py-20 bg-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<p className="text-base font-semibold leading-7 text-primary">
						Process Guide
					</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						How REOP Works
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
						Our streamlined process connects buyers and sellers directly, making
						off-market real estate transactions efficient and straightforward.
					</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
					{steps.map((step) => (
						<div
							key={step.number}
							className="p-6 text-center border border-gray-200/50 rounded-xl shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-buyer-orange-500 to-seller-purple-500 mb-4 mx-auto">
								<span className="text-2xl font-bold text-white">
									{step.number}
								</span>
							</div>
							<h3 className="text-xl font-semibold text-gray-800 mb-2">
								{step.title}
							</h3>
							<p className="text-gray-600">{step.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
