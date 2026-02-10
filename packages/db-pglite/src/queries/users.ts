import { eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { CreateUser, User } from "@envpush/shared";

export function userQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async create(data: CreateUser): Promise<User> {
      const [user] = await db.insert(schema.users).values(data).returning();
      return user! as User;
    },
    async findByEmail(email: string): Promise<User | null> {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
      return (user as User) ?? null;
    },
    async findById(id: string): Promise<User | null> {
      const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
      return (user as User) ?? null;
    },
  };
}
