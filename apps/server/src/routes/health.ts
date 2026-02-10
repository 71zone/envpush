import { Hono } from "hono";
import type { Env } from "../lib/context.js";
import { VERSION } from "@envpush/shared";

export const healthRoutes = new Hono<Env>()
  /** GET / — Health check. */
  .get("/", (c) => {
    return c.json({ status: "ok", version: VERSION });
  });
