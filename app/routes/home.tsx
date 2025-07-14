import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/home";
import { Conversation } from "~/components/conversation";
import { Hero } from "~/components/home/Hero";
import { Features } from "~/components/home/Features";
import { InvestorTypes } from "~/components/home/InvestorTypes";
import { BuyerGuide } from "~/components/home/BuyerGuide";
import { SellerGuide } from "~/components/home/SellerGuide";
import { HowItWorks } from "~/components/home/HowItWorks";
import { CallToAction } from "~/components/home/CallToAction";
import Footer from "~/components/homepage/footer";
import { Navbar } from "~/components/homepage/navbar";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<Navbar loaderData={loaderData} />
			<main>
				<Hero />
				<Features />
				<InvestorTypes />
				<div className="my-12">
					<Conversation />
				</div>
				<BuyerGuide />
				<SellerGuide />
				<HowItWorks />
				<CallToAction />
			</main>
			<Footer />
		</>
	);
}