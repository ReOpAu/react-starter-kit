import { getAuth } from "@clerk/react-router/ssr.server";
import { PublicLayout } from "~/components/layout/PublicLayout";
import MyListingsPage from "~/features/listings/pages/MyListingsPage";
import type { Route } from "./+types/my-listings";

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);
	return {
		isSignedIn: !!userId,
	};
}

export default function MyListingsRoute({ loaderData }: Route.ComponentProps) {
	return (
		<PublicLayout loaderData={loaderData}>
			<MyListingsPage />
		</PublicLayout>
	);
}