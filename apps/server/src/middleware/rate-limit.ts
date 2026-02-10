import { createMiddleware } from "hono/factory";
import type { Env } from "../lib/context.js";

const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5;

/** In-memory rate limiter for auth endpoints. */
export const rateLimit = createMiddleware<Env>(async (c, next) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
    if (entry.count > MAX_REQUESTS) {
      return c.json({ error: "Too many requests. Try again later." }, 429);
    }
  }

  await next();
});
