import { getAuth } from "@clerk/react-router/ssr.server";
import type { Route } from "./+types/home";
import { Navbar } from "~/components/homepage/navbar";
import  Footer from "~/components/homepage/footer";
import ContentSection from "~/components/homepage/content";
import Integrations from "~/components/homepage/integrations";
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
      <main>
        <Integrations />
        <ContentSection />
        <Team />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}