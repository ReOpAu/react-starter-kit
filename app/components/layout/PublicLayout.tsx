import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PublicLayout({
	children,
	loaderData,
}: { children: ReactNode; loaderData?: { isSignedIn: boolean } }) {
	return (
		<>
			<Header loaderData={loaderData} />
			<main>{children}</main>
			<Footer />
		</>
	);
}
