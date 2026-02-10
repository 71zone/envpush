import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./lib/context.js";
import type { EnvpushDatabase } from "@envpush/shared";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { teamRoutes } from "./routes/teams.js";
import { teamMemberRoutes } from "./routes/team-members.js";
import { projectRoutes } from "./routes/projects.js";
import { environmentRoutes } from "./routes/environments.js";
import { secretRoutes } from "./routes/secrets.js";
import { auditRoutes } from "./routes/audit.js";

export function createApp(db: EnvpushDatabase, masterKey: string) {
  const app = new Hono<Env>()
    .use("*", logger())
    .use("*", cors())
    .use("*", async (c, next) => {
      c.set("db", db);
      c.set("masterKey", masterKey);
      await next();
    })
    .route("/health", healthRoutes)
    .route("/auth", authRoutes)
    .route("/teams", teamRoutes)
    .route("/teams", teamMemberRoutes)
    .route("/projects", projectRoutes)
    .route("/environments", environmentRoutes)
    .route("/secrets", secretRoutes)
    .route("/audit", auditRoutes);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
