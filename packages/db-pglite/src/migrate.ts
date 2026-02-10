import type { PgliteDatabase } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

/** Run auto-migration: creates tables if they don't exist. */
export async function migrate(db: PgliteDatabase<typeof schema>): Promise<void> {
  // PGlite does not support multiple statements in one execute(), so we run each separately.
  const statements = [
    sql`CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL UNIQUE,
      invite_code VARCHAR(20) NOT NULL UNIQUE,
      created_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE TABLE IF NOT EXISTS team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(10) NOT NULL,
      joined_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS team_members_team_user_idx ON team_members(team_id, user_id)`,
    sql`CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS projects_team_slug_idx ON projects(team_id, slug)`,
    sql`CREATE TABLE IF NOT EXISTS environments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS environments_project_slug_idx ON environments(project_id, slug)`,
    sql`CREATE TABLE IF NOT EXISTS secrets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
      key VARCHAR(256) NOT NULL,
      encrypted_value TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_by UUID NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE UNIQUE INDEX IF NOT EXISTS secrets_env_key_idx ON secrets(environment_id, key)`,
    sql`CREATE TABLE IF NOT EXISTS audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id),
      action VARCHAR(50) NOT NULL,
      resource_type VARCHAR(50) NOT NULL,
      resource_id VARCHAR(100) NOT NULL,
      metadata JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    sql`CREATE TABLE IF NOT EXISTS cli_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      last_used_at TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  ];

  for (const stmt of statements) {
    await db.execute(stmt);
  }
}
