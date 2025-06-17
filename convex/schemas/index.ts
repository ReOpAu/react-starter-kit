import { defineSchema } from "convex/server";
import { users } from "./users";
import { subscriptions } from "./subscriptions";
import { webhookEvents } from "./webhooks";

export default defineSchema({
  users,
  subscriptions,
  webhookEvents,
}); 