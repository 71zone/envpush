import { createMiddleware } from "hono/factory";
import type { Env } from "../lib/context.js";
import type { Role } from "@envpush/shared";

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/**
 * RBAC middleware factory. Checks that the user has the required role in the team.
 * Expects `teamId` to be available as a param named `:teamId` or `:id`.
 */
export function rbac(...allowedRoles: Role[]) {
  const minLevel = Math.min(...allowedRoles.map((r) => ROLE_HIERARCHY[r]));

  return createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    const teamId = c.req.param("teamId") || c.req.param("id");

    if (!teamId) {
      return c.json({ error: "Team ID required" }, 400);
    }

    const db = c.get("db");
    const member = await db.teamMembers.findByTeamAndUser(teamId, user.id);

    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    if (ROLE_HIERARCHY[member.role] < minLevel) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  });
}
