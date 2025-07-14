import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function Hero() {
	return (
		<section className="relative bg-gradient-to-b from-gray-50 to-white">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 text-center">
				<h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
					List in Under a Minute
					<br />
					<span className="text-transparent bg-clip-text bg-gradient-to-r from-buyer-orange-500 to-seller-purple-500">
						No Contracts. No Costs.
					</span>
				</h1>
				<p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
					Whether you're buying or selling, REOP transforms real estate with
					instant listings, AI-powered matching, and exclusive deals—all without
					commitments or upfront costs.
				</p>
				<div className="mt-10 flex items-center justify-center gap-x-6">
					<Button asChild size="lg" variant="buyer">
						<Link to="/sign-up">Start Your Journey</Link>
					</Button>
					<a
						href="#how-it-works"
						className="text-sm font-semibold leading-6 text-gray-900"
					>
						See How It Works <span aria-hidden="true">→</span>
					</a>
				</div>
			</div>
		</section>
	);
}
