import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../lib/context.js";
import { CreateTeamSchema, JoinTeamSchema, slugify, generateInviteCode } from "@envpush/shared";
import { requireAuth } from "../middleware/auth.js";

export const teamRoutes = new Hono<Env>()
  /** POST / — Create a new team. */
  .post("/", requireAuth, zValidator("json", CreateTeamSchema), async (c) => {
    const { name } = c.req.valid("json");
    const user = c.get("user");
    const db = c.get("db");
    const slug = slugify(name);
    const invite_code = generateInviteCode(name);

    const team = await db.teams.create({ name, slug, invite_code, created_by: user.id });
    await db.teamMembers.add({ team_id: team.id, user_id: user.id, role: "owner" });

    await db.auditLog.create({
      team_id: team.id,
      user_id: user.id,
      action: "team.create",
      resource_type: "team",
      resource_id: team.id,
    });

    return c.json({ team: { id: team.id, name: team.name, slug: team.slug, invite_code: team.invite_code } }, 201);
  })

  /** GET /mine — List teams the current user belongs to. */
  .get("/mine", requireAuth, async (c) => {
    const user = c.get("user");
    const db = c.get("db");
    const teams = await db.teams.findByUserId(user.id);

    // Get user's role in each team
    const teamsWithRole = await Promise.all(
      teams.map(async (team) => {
        const member = await db.teamMembers.findByTeamAndUser(team.id, user.id);
        return { id: team.id, name: team.name, slug: team.slug, role: member?.role };
      })
    );

    return c.json({ teams: teamsWithRole });
  })

  /** GET /:slug — Get team details by slug. */
  .get("/:slug", requireAuth, async (c) => {
    const slug = c.req.param("slug");
    const db = c.get("db");
    const team = await db.teams.findBySlug(slug);

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    return c.json({ team: { id: team.id, name: team.name, slug: team.slug, invite_code: team.invite_code, created_at: team.created_at } });
  })

  /** POST /join — Join a team using an invite code. */
  .post("/join", requireAuth, zValidator("json", JoinTeamSchema), async (c) => {
    const { invite_code } = c.req.valid("json");
    const user = c.get("user");
    const db = c.get("db");

    const team = await db.teams.findByInviteCode(invite_code);
    if (!team) {
      return c.json({ error: "Invalid invite code" }, 404);
    }

    const existing = await db.teamMembers.findByTeamAndUser(team.id, user.id);
    if (existing) {
      return c.json({ error: "Already a member of this team" }, 409);
    }

    await db.teamMembers.add({ team_id: team.id, user_id: user.id, role: "member" });

    await db.auditLog.create({
      team_id: team.id,
      user_id: user.id,
      action: "team.join",
      resource_type: "team",
      resource_id: team.id,
    });

    return c.json({ team: { id: team.id, name: team.name, slug: team.slug } });
  })

  /** POST /:id/regenerate-invite — Regenerate a team's invite code. */
  .post("/:id/regenerate-invite", requireAuth, async (c) => {
    const teamId = c.req.param("id");
    const user = c.get("user");
    const db = c.get("db");

    const team = await db.teams.findById(teamId);
    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    const member = await db.teamMembers.findByTeamAndUser(teamId, user.id);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    const newCode = generateInviteCode(team.name);
    await db.teams.regenerateInviteCode(teamId, newCode);

    await db.auditLog.create({
      team_id: teamId,
      user_id: user.id,
      action: "team.regenerate_invite",
      resource_type: "team",
      resource_id: teamId,
    });

    return c.json({ invite_code: newCode });
  });
