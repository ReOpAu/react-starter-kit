import { getAuth } from "@clerk/react-router/ssr.server";
import { Benefits } from "~/components/about/Benefits";
import { FAQ } from "~/components/about/FAQ";
import { AboutHero } from "~/components/about/Hero";
import { HowItWorksDetailed } from "~/components/about/HowItWorksDetailed";
import { Footer } from "~/components/layout/footer";
import { Header } from "~/components/layout/Header";
import type { Route } from "./+types/about";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function AboutPage({ loaderData }: Route.ComponentProps) {
	return (
		<>
			<Header loaderData={loaderData} />
			<main>
				<AboutHero />
				<HowItWorksDetailed />
				<Benefits />
				<FAQ />
			</main>
			<Footer />
		</>
	);
}
