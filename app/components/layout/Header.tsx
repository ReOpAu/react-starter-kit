import { UserButton } from "@clerk/react-router";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function Header({
	loaderData,
}: {
	loaderData?: { isSignedIn: boolean };
}) {
	return (
		<header className="bg-white border-b border-gray-200">
			<nav className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<Link to="/" className="text-2xl font-bold text-gray-800">
						REOP
					</Link>
					<div className="flex items-center gap-8">
						<Link to="/" className="text-gray-600 hover:text-primary">
							Home
						</Link>
						<Link to="/about" className="text-gray-600 hover:text-primary">
							About
						</Link>
						<Link to="/blog" className="text-gray-600 hover:text-primary">
							Blog
						</Link>
                        <Link to="/listings" className="text-gray-600 hover:text-primary">
                            Listings
                        </Link>
						<Link to="/address-finder" className="text-gray-600 hover:text-primary">
							Address Finder
						</Link>
						<div className="flex items-center gap-2">
							{loaderData?.isSignedIn ? (
								<UserButton />
							) : (
								<>
									<Button asChild variant="outline" size="sm">
										<Link to="/sign-in" prefetch="viewport">
											Login
										</Link>
									</Button>
									<Button
										asChild
										size="sm"
										className="bg-buyer-orange-500 text-white hover:bg-buyer-orange-600"
									>
										<Link to="/sign-up" prefetch="viewport">
											Sign Up
										</Link>
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</nav>
		</header>
	);
}
