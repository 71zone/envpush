import { eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { CreateTeam, Team } from "@envpush/shared";

export function teamQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async create(data: CreateTeam): Promise<Team> {
      const [team] = await db.insert(schema.teams).values(data).returning();
      return team! as Team;
    },
    async findById(id: string): Promise<Team | null> {
      const [team] = await db.select().from(schema.teams).where(eq(schema.teams.id, id)).limit(1);
      return (team as Team) ?? null;
    },
    async findBySlug(slug: string): Promise<Team | null> {
      const [team] = await db.select().from(schema.teams).where(eq(schema.teams.slug, slug)).limit(1);
      return (team as Team) ?? null;
    },
    async findByInviteCode(code: string): Promise<Team | null> {
      const [team] = await db.select().from(schema.teams).where(eq(schema.teams.invite_code, code)).limit(1);
      return (team as Team) ?? null;
    },
    async findByUserId(userId: string): Promise<Team[]> {
      const rows = await db
        .select({ team: schema.teams })
        .from(schema.teamMembers)
        .innerJoin(schema.teams, eq(schema.teamMembers.team_id, schema.teams.id))
        .where(eq(schema.teamMembers.user_id, userId));
      return rows.map((r) => r.team as Team);
    },
    async regenerateInviteCode(teamId: string, newCode: string): Promise<string> {
      await db.update(schema.teams).set({ invite_code: newCode }).where(eq(schema.teams.id, teamId));
      return newCode;
    },
  };
}
