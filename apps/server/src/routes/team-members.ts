import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../lib/context.js";
import { UpdateMemberRoleSchema } from "@envpush/shared";
import { requireAuth } from "../middleware/auth.js";

export const teamMemberRoutes = new Hono<Env>()
  /** GET /:id/members — List team members. */
  .get("/:id/members", requireAuth, async (c) => {
    const teamId = c.req.param("id");
    const db = c.get("db");
    const user = c.get("user");

    const member = await db.teamMembers.findByTeamAndUser(teamId, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const members = await db.teamMembers.findByTeamId(teamId);
    return c.json({
      members: members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        user_name: m.user_name,
        user_email: m.user_email,
      })),
    });
  })

  /** PATCH /:id/members/:userId — Update a member's role. */
  .patch("/:id/members/:userId", requireAuth, zValidator("json", UpdateMemberRoleSchema), async (c) => {
    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const { role } = c.req.valid("json");
    const user = c.get("user");
    const db = c.get("db");

    const callerMember = await db.teamMembers.findByTeamAndUser(teamId, user.id);
    if (!callerMember || callerMember.role !== "owner") {
      return c.json({ error: "Only owners can change roles" }, 403);
    }

    const targetMember = await db.teamMembers.findByTeamAndUser(teamId, targetUserId);
    if (!targetMember) {
      return c.json({ error: "Member not found" }, 404);
    }
    if (targetMember.role === "owner") {
      return c.json({ error: "Cannot change owner role" }, 403);
    }

    await db.teamMembers.updateRole(teamId, targetUserId, role);

    await db.auditLog.create({
      team_id: teamId,
      user_id: user.id,
      action: "member.update_role",
      resource_type: "team_member",
      resource_id: targetUserId,
      metadata: { new_role: role },
    });

    return c.json({ success: true });
  })

  /** DELETE /:id/members/:userId — Remove a member from the team. */
  .delete("/:id/members/:userId", requireAuth, async (c) => {
    const teamId = c.req.param("id");
    const targetUserId = c.req.param("userId");
    const user = c.get("user");
    const db = c.get("db");

    const callerMember = await db.teamMembers.findByTeamAndUser(teamId, user.id);
    if (!callerMember || (callerMember.role !== "owner" && callerMember.role !== "admin")) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    const targetMember = await db.teamMembers.findByTeamAndUser(teamId, targetUserId);
    if (!targetMember) {
      return c.json({ error: "Member not found" }, 404);
    }
    if (targetMember.role === "owner") {
      return c.json({ error: "Cannot remove the owner" }, 403);
    }

    await db.teamMembers.remove(teamId, targetUserId);

    await db.auditLog.create({
      team_id: teamId,
      user_id: user.id,
      action: "member.remove",
      resource_type: "team_member",
      resource_id: targetUserId,
    });

    return c.json({ success: true });
  });
