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
	route("address-finder", "routes/address-finder.tsx"),
	route("test-aldi", "routes/test-aldi.tsx"),
	route("api/validate-address", "routes/api.validate-address.tsx"),
	layout("routes/dashboard/layout.tsx", [
		route("dashboard", "routes/dashboard/index.tsx"),
		route("dashboard/chat", "routes/dashboard/chat.tsx"),
		route("dashboard/settings", "routes/dashboard/settings.tsx"),
	]),
] satisfies RouteConfig;
