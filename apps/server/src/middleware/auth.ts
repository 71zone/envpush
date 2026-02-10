import { createMiddleware } from "hono/factory";
import { hashToken } from "@envpush/shared/crypto";
import type { Env } from "../lib/context.js";

/** Require a valid Bearer token. Sets `c.var.user`. */
export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const rawToken = header.slice(7);
  const hash = hashToken(rawToken);
  const db = c.get("db");
  const tokenRecord = await db.cliTokens.findByTokenHash(hash);

  if (!tokenRecord) {
    return c.json({ error: "Invalid token" }, 401);
  }

  if (tokenRecord.expires_at < new Date()) {
    return c.json({ error: "Token expired" }, 401);
  }

  if (!tokenRecord.user) {
    return c.json({ error: "User not found" }, 401);
  }

  // Update last used (fire-and-forget)
  db.cliTokens.updateLastUsed(tokenRecord.id).catch(() => {});

  c.set("user", tokenRecord.user);
  await next();
});
