import {
	type RouteConfig,
	index,
	layout,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("sign-in/*", "routes/sign-in.tsx"),
	route("sign-up/*", "routes/sign-up.tsx"),
	route("pricing", "routes/pricing.tsx"),
	route("success", "routes/success.tsx"),
	route("subscription-required", "routes/subscription-required.tsx"),
	route("about", "routes/about.tsx"),
	route("address-finder", "routes/address-finder.tsx"),
	route("test-aldi", "routes/test-aldi.tsx"),
	route("address-validation-tests", "routes/address-validation-tests.tsx"),
	route("debug-listings", "routes/debug-listings.tsx"),
	route("blog", "routes/blog/index.tsx"),
	route("blog/:slug", "routes/blog/$slug.tsx"),
	// Listings feature routes - complex hierarchical structure
	route("listings", "features/listings/pages/ListingsOverviewPage.tsx"),
	route("listings/:state", "features/listings/pages/StateListingsPage.tsx"),
	route("listings/:state/:type", "features/listings/pages/TypeListingsPage.tsx"),
	route("listings/:state/:type/:suburb", "features/listings/pages/SuburbListingsPage.tsx"),
	route("listings/:state/:type/:suburb/:id", "features/listings/pages/ListingDetailPage.tsx"),
	route("listings/:state/:type/:suburb/:id/matches", "features/listings/pages/MatchesPage.tsx"),
	route("listings/:state/:type/:suburb/:id/matches/:matchId", "features/listings/pages/MatchDetailPage.tsx"),
	layout("routes/dashboard/layout.tsx", [
		route("dashboard", "routes/dashboard/index.tsx"),
		route("dashboard/chat", "routes/dashboard/chat.tsx"),
		route("dashboard/settings", "routes/dashboard/settings.tsx"),
	]),
] satisfies RouteConfig;
