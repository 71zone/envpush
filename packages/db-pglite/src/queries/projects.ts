import { and, eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { CreateProject, Project } from "@envpush/shared";

export function projectQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async create(data: CreateProject): Promise<Project> {
      const [project] = await db.insert(schema.projects).values(data).returning();
      return project! as Project;
    },
    async findById(id: string): Promise<Project | null> {
      const [project] = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
      return (project as Project) ?? null;
    },
    async findByTeamId(teamId: string): Promise<Project[]> {
      return (await db.select().from(schema.projects).where(eq(schema.projects.team_id, teamId))) as Project[];
    },
    async findBySlug(teamId: string, slug: string): Promise<Project | null> {
      const [project] = await db
        .select()
        .from(schema.projects)
        .where(and(eq(schema.projects.team_id, teamId), eq(schema.projects.slug, slug)))
        .limit(1);
      return (project as Project) ?? null;
    },
    async delete(id: string): Promise<void> {
      await db.delete(schema.projects).where(eq(schema.projects.id, id));
    },
  };
}
