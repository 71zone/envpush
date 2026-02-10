import { Hono } from "hono";
import type { Env } from "../lib/context.js";
import { requireAuth } from "../middleware/auth.js";

export const auditRoutes = new Hono<Env>()
  /** GET /:id/audit-log — List audit events for a team (paginated). */
  .get("/:id/audit-log", requireAuth, async (c) => {
    const teamId = c.req.param("id");
    const user = c.get("user");
    const db = c.get("db");

    const member = await db.teamMembers.findByTeamAndUser(teamId, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const limit = Number(c.req.query("limit")) || 50;
    const offset = Number(c.req.query("offset")) || 0;

    const events = await db.auditLog.findByTeamId(teamId, { limit, offset });
    return c.json({ events });
  });
