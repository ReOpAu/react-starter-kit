import { Link } from "react-router";

export function Footer() {
	return (
		<footer className="border-t border-gray-100 py-16 md:py-24">
			<div className="container mx-auto max-w-5xl px-6">
				<Link to="/" aria-label="go home" className="mx-auto block w-fit">
					<img src="/rsk.png" alt="REOP Logo" className="h-12 w-12" />
				</Link>
				<div className="my-8 flex flex-wrap justify-center gap-6">
					<Link
						to="/"
						className="text-muted-foreground hover:text-primary text-sm transition-colors"
					>
						Home
					</Link>
					<Link
						to="/about"
						className="text-muted-foreground hover:text-primary text-sm transition-colors"
					>
						About
					</Link>
					<Link
						to="https://x.com/rasmickyy"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="X/Twitter"
						className="text-muted-foreground hover:text-primary transition-colors"
					>
						<svg
							className="size-5"
							xmlns="http://www.w3.org/2000/svg"
							width="1em"
							height="1em"
							viewBox="0 0 24 24"
						>
							<path
								fill="currentColor"
								d="M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z"
							/>
						</svg>
					</Link>
				</div>
				<p className="text-muted-foreground text-center text-sm">
					© {new Date().getFullYear()} REOP. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
