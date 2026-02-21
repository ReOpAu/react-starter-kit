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
	route("address-finder-cartesia", "routes/address-finder-cartesia.tsx"),
	route("test-aldi", "routes/test-aldi.tsx"),
	route("address-validation-tests", "routes/address-validation-tests.tsx"),
	route("debug-listings", "routes/debug-listings.tsx"),
	route("blog", "routes/blog/index.tsx"),
	route("blog/:slug", "routes/blog/$slug.tsx"),
	// Listings feature routes - complex hierarchical structure
	route("listings", "routes/listings/index.tsx"),
	route("listings/my-listings", "routes/listings/my-listings.tsx"),
	route("listings/create", "routes/listings/create.tsx"),
	route("listings/:state", "routes/listings/$state.tsx"),
	route("listings/:state/:type", "routes/listings/$state.$type.tsx"),
	route(
		"listings/:state/:type/:suburb",
		"routes/listings/$state.$type.$suburb.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id",
		"routes/listings/$state.$type.$suburb.$id.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id/edit",
		"routes/listings/$state.$type.$suburb.$id/edit.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id/matches",
		"routes/listings/$state.$type.$suburb.$id/matches.tsx",
	),
	route(
		"listings/:state/:type/:suburb/:id/matches/:matchId",
		"routes/listings/$state.$type.$suburb.$id/matches/$matchId.tsx",
	),
	// Admin routes
	route("admin", "routes/admin/index.tsx"),
	route("admin/listings", "routes/admin/listings/index.tsx"),
	route("admin/listings/create", "routes/admin/listings/create.tsx"),
	route("admin/listings/edit/:id", "routes/admin/listings/edit/$id.tsx"),
	layout("routes/dashboard/layout.tsx", [
		route("dashboard", "routes/dashboard/index.tsx"),
		route("dashboard/chat", "routes/dashboard/chat.tsx"),
		route("dashboard/settings", "routes/dashboard/settings.tsx"),
	]),
] satisfies RouteConfig;
