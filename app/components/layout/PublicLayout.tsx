import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

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
