const steps = [
	{
		number: 1,
		title: "Create Your Listing",
		description:
			"List your property or buyer requirements in under a minute—no contracts, no costs, and complete privacy.",
	},
	{
		number: 2,
		title: "Get Matched",
		description:
			"Our AI instantly connects you with perfect matches—sellers find qualified buyers, buyers discover ideal properties.",
	},
	{
		number: 3,
		title: "Access Services",
		description:
			"Explore exclusive lending deals, insurance offers, and other essential services through our trusted partners.",
	},
	{
		number: 4,
		title: "Connect Directly",
		description:
			"Engage with matched parties on your terms, maintaining control and privacy throughout the process.",
	},
];

export function HowItWorks() {
	return (
		<section id="how-it-works" className="py-20 bg-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<p className="text-base font-semibold leading-7 text-primary">
						Simple Process
					</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Transform Your Real Estate Journey
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
						Experience a new way to buy and sell property—faster, easier, and on
						your terms. No commitments, no pressure, just results.
					</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
					{steps.map((step) => (
						<div key={step.number} className="p-6 text-center">
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
