import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../lib/context.js";
import { UpsertSecretsSchema } from "@envpush/shared";
import { decrypt } from "@envpush/shared/crypto";
import { requireAuth } from "../middleware/auth.js";

export const secretRoutes = new Hono<Env>()
  /** GET /:id/secrets — List secrets for an environment (decrypted). */
  .get("/:id/secrets", requireAuth, async (c) => {
    const envId = c.req.param("id");
    const db = c.get("db");
    const masterKey = c.get("masterKey");
    const user = c.get("user");

    const env = await db.environments.findById(envId);
    if (!env) {
      return c.json({ error: "Environment not found" }, 404);
    }

    const project = await db.projects.findById(env.project_id);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await db.teamMembers.findByTeamAndUser(project.team_id, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const secrets = await db.secrets.findByEnvironmentId(envId);
    return c.json({
      secrets: secrets.map((s) => ({
        key: s.key,
        value: decrypt(s.encrypted_value, masterKey),
        version: s.version,
        updated_by: s.updated_by,
        updated_at: s.updated_at,
      })),
    });
  })

  /** PUT /:id/secrets — Full-replace secrets for an environment. */
  .put("/:id/secrets", requireAuth, zValidator("json", UpsertSecretsSchema), async (c) => {
    const envId = c.req.param("id");
    const { secrets } = c.req.valid("json");
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
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    await db.secrets.upsertMany(envId, secrets, user.id);

    await db.auditLog.create({
      team_id: project.team_id,
      user_id: user.id,
      action: "secrets.push",
      resource_type: "environment",
      resource_id: envId,
      metadata: { count: secrets.length },
    });

    return c.json({ success: true, count: secrets.length });
  })

  /** DELETE /:id/secrets/:key — Delete a single secret. */
  .delete("/:id/secrets/:key", requireAuth, async (c) => {
    const envId = c.req.param("id");
    const key = c.req.param("key");
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
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    await db.secrets.delete(envId, key);

    await db.auditLog.create({
      team_id: project.team_id,
      user_id: user.id,
      action: "secrets.delete",
      resource_type: "secret",
      resource_id: `${envId}/${key}`,
    });

    return c.json({ success: true });
  })

  /** GET /:id/secrets/export — Export secrets as .env format. */
  .get("/:id/secrets/export", requireAuth, async (c) => {
    const envId = c.req.param("id");
    const db = c.get("db");
    const masterKey = c.get("masterKey");
    const user = c.get("user");

    const env = await db.environments.findById(envId);
    if (!env) {
      return c.json({ error: "Environment not found" }, 404);
    }

    const project = await db.projects.findById(env.project_id);
    if (!project) {
      return c.json({ error: "Project not found" }, 404);
    }

    const member = await db.teamMembers.findByTeamAndUser(project.team_id, user.id);
    if (!member) {
      return c.json({ error: "Not a member of this team" }, 403);
    }

    const secrets = await db.secrets.findByEnvironmentId(envId);
    const envContent = secrets
      .map((s) => `${s.key}=${decrypt(s.encrypted_value, masterKey)}`)
      .join("\n") + (secrets.length > 0 ? "\n" : "");

    return c.text(envContent);
  });
