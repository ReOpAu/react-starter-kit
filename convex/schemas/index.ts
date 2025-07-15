import { defineSchema } from "convex/server";
import { listings } from "./listings";
import { searches } from "./searches";
import { subscriptions } from "./subscriptions";
import { userPreferences } from "./userPreferences";
import { users } from "./users";
import { webhookEvents } from "./webhooks";
import { savedListingsTable } from "./savedListings";

export default defineSchema({
	users,
	listings,
	subscriptions,
	webhookEvents,
	searches,
	userPreferences,
	savedListings: savedListingsTable,
});
