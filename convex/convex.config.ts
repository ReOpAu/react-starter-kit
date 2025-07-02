import polar from "@convex-dev/polar/convex.config";
// convex/convex.config.ts
import { defineApp } from "convex/server";

const app = defineApp();
app.use(polar);

export default app;
