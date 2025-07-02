import { defineSchema } from "convex/server";
import { subscriptions } from "./subscriptions";
import { users } from "./users";
import { webhookEvents } from "./webhooks";

export default defineSchema({
	users,
	subscriptions,
	webhookEvents,
});
