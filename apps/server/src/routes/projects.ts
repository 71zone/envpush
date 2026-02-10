import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../lib/context.js";
import { CreateProjectSchema, DEFAULT_ENVIRONMENTS, slugify } from "@envpush/shared";
import { requireAuth } from "../middleware/auth.js";

export const projectRoutes = new Hono<Env>()
  /** POST / — Create a project and seed default environments. */
  .post("/", requireAuth, zValidator("json", CreateProjectSchema), async (c) => {
    const { team_id, name } = c.req.valid("json");
    const user = c.get("user");
    const db = c.get("db");

    const member = await db.teamMembers.findByTeamAndUser(team_id, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const slug = slugify(name);
    const existing = await db.projects.findBySlug(team_id, slug);
    if (existing) {
      return c.json({ error: "Project with this name already exists in this team" }, 409);
    }

    const project = await db.projects.create({ team_id, name, slug });

    // Seed default environments
    const envs = [];
    for (const envName of DEFAULT_ENVIRONMENTS) {
      const env = await db.environments.create({
        project_id: project.id,
        name: envName,
        slug: slugify(envName),
      });
      envs.push(env);
    }

    await db.auditLog.create({
      team_id,
      user_id: user.id,
      action: "project.create",
      resource_type: "project",
      resource_id: project.id,
    });

    return c.json({
      project: { id: project.id, name: project.name, slug: project.slug, team_id: project.team_id },
      environments: envs.map((e) => ({ id: e.id, name: e.name, slug: e.slug })),
    }, 201);
  })

  /** GET /teams/:teamId/projects — List projects in a team. */
  .get("/teams/:teamId/projects", requireAuth, async (c) => {
    const teamId = c.req.param("teamId");
    const user = c.get("user");
    const db = c.get("db");

    const member = await db.teamMembers.findByTeamAndUser(teamId, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const projects = await db.projects.findByTeamId(teamId);
    return c.json({ projects: projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug })) });
  })

  /** GET /:teamSlug/:projectSlug — Get project by team+project slug. */
  .get("/:teamSlug/:projectSlug", requireAuth, async (c) => {
    const teamSlug = c.req.param("teamSlug");
    const projectSlug = c.req.param("projectSlug");
    const db = c.get("db");

    const team = await db.teams.findBySlug(teamSlug);
    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    const project = await db.projects.findBySlug(team.id, projectSlug);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const envs = await db.environments.findByProjectId(project.id);

    return c.json({
      project: { id: project.id, name: project.name, slug: project.slug, team_id: project.team_id },
      environments: envs.map((e) => ({ id: e.id, name: e.name, slug: e.slug })),
    });
  })

  /** DELETE /:id — Delete a project. */
  .delete("/:id", requireAuth, async (c) => {
    const projectId = c.req.param("id");
    const user = c.get("user");
    const db = c.get("db");

    const project = await db.projects.findById(projectId);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await db.teamMembers.findByTeamAndUser(project.team_id, user.id);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await db.projects.delete(projectId);

    await db.auditLog.create({
      team_id: project.team_id,
      user_id: user.id,
      action: "project.delete",
      resource_type: "project",
      resource_id: projectId,
    });

    return c.json({ success: true });
  });
