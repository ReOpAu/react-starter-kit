import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/about";
import { Header } from "~/components/layout/Header";
import { Footer } from "~/components/layout/Footer";
import { AboutHero } from "~/components/about/Hero";
import { HowItWorksDetailed } from "~/components/about/HowItWorksDetailed";
import { Benefits } from "~/components/about/Benefits";
import { FAQ } from "~/components/about/FAQ";

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
