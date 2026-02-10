import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import type { EnvpushDatabase, EnvpushDbConfig } from "@envpush/shared";
import * as schema from "./schema.js";
import { migrate } from "./migrate.js";
import {
  userQueries,
  teamQueries,
  teamMemberQueries,
  projectQueries,
  environmentQueries,
  secretQueries,
  auditLogQueries,
  cliTokenQueries,
} from "./queries/index.js";

const DEFAULT_CONNECTION_STRING = "./data/envpush";

/**
 * Create an EnvPush database instance using PGLite (embedded Postgres).
 *
 * @param config - Configuration with masterKey for encryption and optional connectionString.
 * @returns A fully initialized EnvpushDatabase with auto-migration applied.
 */
export async function envpushDb(config: EnvpushDbConfig): Promise<EnvpushDatabase> {
  const connectionString = config.connectionString ?? DEFAULT_CONNECTION_STRING;
  mkdirSync(connectionString, { recursive: true });
  const client = new PGlite(connectionString);
  const db = drizzle(client, { schema });

  await migrate(db);

  return {
    users: userQueries(db),
    teams: teamQueries(db),
    teamMembers: teamMemberQueries(db),
    projects: projectQueries(db),
    environments: environmentQueries(db),
    secrets: secretQueries(db, config.masterKey),
    auditLog: auditLogQueries(db),
    cliTokens: cliTokenQueries(db),
  };
}
