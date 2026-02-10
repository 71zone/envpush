import { desc, eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { AuditEvent, CreateAuditLog } from "@envpush/shared";

export function auditLogQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async create(data: CreateAuditLog): Promise<void> {
      await db.insert(schema.auditLog).values(data);
    },
    async findByTeamId(teamId: string, opts?: { limit?: number; offset?: number }): Promise<AuditEvent[]> {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;
      return (await db
        .select()
        .from(schema.auditLog)
        .where(eq(schema.auditLog.team_id, teamId))
        .orderBy(desc(schema.auditLog.created_at))
        .limit(limit)
        .offset(offset)) as AuditEvent[];
    },
  };
}
