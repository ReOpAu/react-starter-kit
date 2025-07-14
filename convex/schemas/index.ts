import { defineSchema } from "convex/server";
import { searches } from "./searches";
import { subscriptions } from "./subscriptions";
import { userPreferences } from "./userPreferences";
import { users } from "./users";
import { webhookEvents } from "./webhooks";

export default defineSchema({
	users,
	subscriptions,
	webhookEvents,
	searches,
	userPreferences,
});
