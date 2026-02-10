import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../lib/context.js";
import { CreateEnvironmentSchema, slugify } from "@envpush/shared";
import { requireAuth } from "../middleware/auth.js";

export const environmentRoutes = new Hono<Env>()
  /** POST /:projectId/environments — Create an environment in a project. */
  .post("/:projectId/environments", requireAuth, zValidator("json", CreateEnvironmentSchema), async (c) => {
    const projectId = c.req.param("projectId");
    const { name } = c.req.valid("json");
    const user = c.get("user");
    const db = c.get("db");

    const project = await db.projects.findById(projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await db.teamMembers.findByTeamAndUser(project.team_id, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const slug = slugify(name);
    const existing = await db.environments.findBySlug(projectId, slug);
    if (existing) {
      return c.json({ error: "Environment already exists" }, 409);
    }

    const env = await db.environments.create({ project_id: projectId, name, slug });

    await db.auditLog.create({
      team_id: project.team_id,
      user_id: user.id,
      action: "environment.create",
      resource_type: "environment",
      resource_id: env.id,
    });

    return c.json({ environment: { id: env.id, name: env.name, slug: env.slug } }, 201);
  })

  /** GET /:projectId/environments — List environments in a project. */
  .get("/:projectId/environments", requireAuth, async (c) => {
    const projectId = c.req.param("projectId");
    const db = c.get("db");

    const envs = await db.environments.findByProjectId(projectId);
    return c.json({ environments: envs.map((e) => ({ id: e.id, name: e.name, slug: e.slug })) });
  })

  /** DELETE /:id — Delete an environment. */
  .delete("/:id", requireAuth, async (c) => {
    const envId = c.req.param("id");
    const user = c.get("user");
    const db = c.get("db");

    const env = await db.environments.findById(envId);
    if (!env) {
      return c.json({ error: "Environment not found" }, 404);
    }

    const project = await db.projects.findById(env.project_id);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await db.teamMembers.findByTeamAndUser(project.team_id, user.id);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await db.environments.delete(envId);

    await db.auditLog.create({
      team_id: project.team_id,
      user_id: user.id,
      action: "environment.delete",
      resource_type: "environment",
      resource_id: envId,
    });

    return c.json({ success: true });
  });
