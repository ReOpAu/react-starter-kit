import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/home";
import { Conversation } from "~/components/conversation";
import ContentSection from "~/components/homepage/content";
import Footer from "~/components/homepage/footer";
import Integrations from "~/components/homepage/integrations";
import { Navbar } from "~/components/homepage/navbar";
import Pricing from "~/components/homepage/pricing";
import Team from "~/components/homepage/team";

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
			<main className="container mx-auto px-4 py-8">
				<div className="my-12">
					<Conversation />
				</div>
				<Integrations />
				<ContentSection />
				<Team />
				<Pricing />
			</main>
			<Footer />
		</>
	);
}