import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function CallToAction() {
	return (
		<section className="relative py-20 overflow-hidden">
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-r from-buyer-orange-500 to-seller-purple-500"
			>
				<div className="absolute inset-0 bg-black/30"></div>
				<div className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-white/20 via-transparent to-white/20 opacity-50 blur-3xl" />
			</div>
			<div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
				<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
					Ready to Experience Stress-Free Real Estate?
				</h2>
				<p className="mt-6 text-lg leading-8 text-white max-w-2xl mx-auto">
					Join REOP today and discover how easy buying and selling can be. List
					in under a minute, get matched instantly, and access exclusive
					deals—all with no contracts or upfront costs.
				</p>
				<div className="mt-10 flex items-center justify-center gap-x-6">
					<Button asChild size="lg" variant="outline">
						<Link to="/sign-up">List Now - It's Free</Link>
					</Button>
					<Link
						to="/about"
						className="text-sm font-semibold leading-6 text-white"
					>
						Explore Benefits <span aria-hidden="true">→</span>
					</Link>
				</div>
			</div>
		</section>
	);
}
