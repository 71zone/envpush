import { and, eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { AddMember, TeamMember, Role } from "@envpush/shared";

export function teamMemberQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async add(data: AddMember): Promise<TeamMember> {
      const [member] = await db.insert(schema.teamMembers).values(data).returning();
      return member! as unknown as TeamMember;
    },
    async findByTeamId(teamId: string): Promise<TeamMember[]> {
      const rows = await db
        .select({
          id: schema.teamMembers.id,
          team_id: schema.teamMembers.team_id,
          user_id: schema.teamMembers.user_id,
          role: schema.teamMembers.role,
          joined_at: schema.teamMembers.joined_at,
          user_name: schema.users.name,
          user_email: schema.users.email,
        })
        .from(schema.teamMembers)
        .innerJoin(schema.users, eq(schema.teamMembers.user_id, schema.users.id))
        .where(eq(schema.teamMembers.team_id, teamId));
      return rows as TeamMember[];
    },
    async findByTeamAndUser(teamId: string, userId: string): Promise<TeamMember | null> {
      const [member] = await db
        .select()
        .from(schema.teamMembers)
        .where(and(eq(schema.teamMembers.team_id, teamId), eq(schema.teamMembers.user_id, userId)))
        .limit(1);
      return (member as unknown as TeamMember) ?? null;
    },
    async updateRole(teamId: string, userId: string, role: Role): Promise<void> {
      await db
        .update(schema.teamMembers)
        .set({ role })
        .where(and(eq(schema.teamMembers.team_id, teamId), eq(schema.teamMembers.user_id, userId)));
    },
    async remove(teamId: string, userId: string): Promise<void> {
      await db
        .delete(schema.teamMembers)
        .where(and(eq(schema.teamMembers.team_id, teamId), eq(schema.teamMembers.user_id, userId)));
    },
  };
}
