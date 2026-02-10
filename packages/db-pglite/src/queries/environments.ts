import { and, eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { CreateEnvironment, Environment } from "@envpush/shared";

export function environmentQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async create(data: CreateEnvironment): Promise<Environment> {
      const [env] = await db.insert(schema.environments).values(data).returning();
      return env! as Environment;
    },
    async findById(id: string): Promise<Environment | null> {
      const [env] = await db.select().from(schema.environments).where(eq(schema.environments.id, id)).limit(1);
      return (env as Environment) ?? null;
    },
    async findByProjectId(projectId: string): Promise<Environment[]> {
      return (await db.select().from(schema.environments).where(eq(schema.environments.project_id, projectId))) as Environment[];
    },
    async findBySlug(projectId: string, slug: string): Promise<Environment | null> {
      const [env] = await db
        .select()
        .from(schema.environments)
        .where(and(eq(schema.environments.project_id, projectId), eq(schema.environments.slug, slug)))
        .limit(1);
      return (env as Environment) ?? null;
    },
    async delete(id: string): Promise<void> {
      await db.delete(schema.environments).where(eq(schema.environments.id, id));
    },
  };
}
