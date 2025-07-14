import { getAuth } from "@clerk/react-router/ssr.server";
import { fetchAction, fetchQuery } from "convex/nextjs";
import { useEffect } from "react";
import { Conversation } from "~/components/conversation";
import ContentSection from "~/components/homepage/content";
import Footer from "~/components/homepage/footer";
import Integrations from "~/components/homepage/integrations";
import Pricing from "~/components/homepage/pricing";
import Team from "~/components/homepage/team";
import { api } from "../../convex/_generated/api";
import type { Route } from "./+types/home";

// Declare the custom element type for TypeScript
declare global {
	namespace JSX {
		interface IntrinsicElements {
			"elevenlabs-convai": React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement> & {
					"agent-id": string;
				},
				HTMLElement
			>;
		}
	}
}

interface ElevenLabsCallEvent extends Event {
	detail: {
		config: {
			clientTools: Record<string, unknown>;
		};
	};
}

export function meta(_: Route.MetaArgs) {
	const title = "React Starter Kit - Launch Your SAAS Quickly";
	const description =
		"This powerful starter kit is designed to help you launch your SAAS application quickly and efficiently.";
	const keywords = "React, Starter Kit, SAAS, Launch, Quickly, Efficiently";
	const siteUrl = "https://www.reactstarter.xyz/";
	const imageUrl =
		"https://jdj14ctwppwprnqu.public.blob.vercel-storage.com/rsk-image-FcUcfBMBgsjNLo99j3NhKV64GT2bQl.png";

	return [
		{ title },
		{
			name: "description",
			content: description,
		},

		// Open Graph / Facebook
		{ property: "og:type", content: "website" },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:image", content: imageUrl },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:url", content: siteUrl },
		{ property: "og:site_name", content: "React Starter Kit" },

		// Twitter Card
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: title },
		{
			name: "twitter:description",
			content: description,
		},
		{ name: "twitter:image", content: imageUrl },
		{
			name: "keywords",
			content: keywords,
		},
		{ name: "author", content: "Ras Mic" },
		{ name: "favicon", content: imageUrl },
	];
}

export async function loader(args: Route.LoaderArgs) {
	const { userId } = await getAuth(args);

	// Parallel data fetching to reduce waterfall
	const [subscriptionData, plans] = await Promise.all([
		userId
			? fetchQuery(api.subscriptions.checkUserSubscriptionStatus, {
					userId,
				}).catch((error) => {
					console.error("Failed to fetch subscription data:", error);
					return null;
				})
			: Promise.resolve(null),
		fetchAction(api.subscriptions.getAvailablePlans).catch((error) => {
			console.error("Failed to fetch available plans:", error);
			// Return empty plans array if Polar.sh is not configured or API fails
			return { items: [], pagination: { hasNextPage: false, hasPreviousPage: false } };
		}),
	]);

	return {
		isSignedIn: !!userId,
		hasActiveSubscription: subscriptionData?.hasActiveSubscription || false,
		plans,
	};
}

export default function Home({ loaderData }: Route.ComponentProps) {
	useEffect(() => {
		const widget = document.querySelector("elevenlabs-convai");

		if (widget) {
			// Listen for the widget's "call" event to trigger client-side tools
			widget.addEventListener("elevenlabs-convai:call", (event: Event) => {
				const callEvent = event as ElevenLabsCallEvent;
				callEvent.detail.config.clientTools = {
					redirectToExternalURL: ({ url }: { url: string }) => {
						window.open(url, "_blank", "noopener,noreferrer");
					},
					AddressAutocomplete: async ({ address }: { address: string }) => {
						try {
							// Import the Convex action dynamically
							const { api } = await import("../../convex/_generated/api");
							const { ConvexReactClient } = await import("convex/react");

							// Create a Convex client
							const convex = new ConvexReactClient(
								import.meta.env.VITE_CONVEX_URL,
							);

							// Call the place suggestions action
							const result = await convex.action(api.address.getPlaceSuggestions.getPlaceSuggestions, {
								query: address,
								intent: "suburb",
								maxResults: 1,
							});

							if (result.success && result.suggestions.length > 0) {
								const suggestion = result.suggestions[0];
								return {
									success: true,
									canonicalAddress: suggestion.description,
									message: `Found: ${suggestion.description}`,
								};
							}

							return {
								success: false,
								error: result.success ? "No suggestions found" : result.error,
								message: `Could not find address: ${result.success ? "No suggestions found" : result.error}`,
							};
						} catch (error) {
							console.error("AddressAutocomplete client tool error:", error);
							return {
								success: false,
								error: "Lookup failed",
								message: "Address lookup service is currently unavailable",
							};
						}
					},
				};
			});
		}
	}, []); // Empty dependency array means this runs once on mount

	return (
		<>
			<Integrations loaderData={loaderData} />
			<Conversation />
			<ContentSection />
			<Team />
			<Pricing loaderData={loaderData} />
			<Footer />
		</>
	);
}
