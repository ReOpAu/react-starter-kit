import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/home";
import { Header } from "~/components/layout/Header";
import { Footer } from "~/components/layout/Footer";
import { Hero } from "~/components/home/Hero";
import { Features } from "~/components/home/Features";
import { InvestorTypes } from "~/components/home/InvestorTypes";
import { BuyerGuide } from "~/components/home/BuyerGuide";
import { SellerGuide } from "~/components/home/SellerGuide";
import { HowItWorks } from "~/components/home/HowItWorks";
import { CallToAction } from "~/components/home/CallToAction";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function HomePage({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Header loaderData={loaderData} />
      <main>
        <Hero />
        <Features />
        <InvestorTypes />
        <BuyerGuide />
        <SellerGuide />
        <HowItWorks />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}