import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";

const faqs = [
	{
		question: "What is REOP?",
		answer:
			"REOP is an off-market real estate platform that connects serious buyers directly with property sellers. We facilitate private, direct transactions by matching buyers' specific requirements with available off-market properties.",
	},
	{
		question: "What are the benefits of off-market properties?",
		answer:
			"Off-market properties offer unique advantages: less competition, more room for negotiation, private transactions, and the ability to deal directly with motivated sellers. For sellers, it means qualified buyers and discretion in selling their property.",
	},
	{
		question: "How does the matching process work?",
		answer:
			"Buyers specify their exact requirements (location, property type, budget, etc.), and we match them with sellers who have suitable properties. Sellers list their properties with detailed specifications, and we connect them with qualified buyers who match their criteria.",
	},
	{
		question: "What types of properties are available?",
		answer:
			"We handle all types of real estate including residential (houses, apartments, land), commercial (retail, office space, industrial), and investment properties. All properties are exclusively off-market listings.",
	},
	{
		question: "How do I get started as a buyer?",
		answer:
			"Simply create a profile, specify your property requirements, and our system will match you with relevant off-market properties. You'll be notified when matching properties become available.",
	},
	{
		question: "How do I list my property?",
		answer:
			"As a seller, you can list your property by creating an account, providing property details, and setting your terms. Your property will only be shown to qualified buyers who match your requirements, ensuring privacy and targeted exposure.",
	},
];

export function FAQ() {
	return (
		<section className="py-20 bg-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
				<div className="text-center mb-12">
					<p className="text-base font-semibold leading-7 text-primary">FAQ</p>
					<h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
						Frequently Asked Questions
					</h2>
					<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
						Learn more about how REOP connects buyers and sellers in the
						off-market real estate space.
					</p>
				</div>
				<Accordion type="single" collapsible className="w-full">
					{faqs.map((faq, index) => (
						<AccordionItem key={index} value={`item-${index + 1}`}>
							<AccordionTrigger className="text-left text-lg hover:no-underline">
								{faq.question}
							</AccordionTrigger>
							<AccordionContent className="text-base text-gray-600 pt-2 pb-4">
								<div className="w-full h-px bg-gradient-to-r from-transparent via-buyer-orange-400 to-transparent my-2" />
								{faq.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
