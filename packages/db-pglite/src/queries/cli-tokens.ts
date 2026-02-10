import { eq } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { CLIToken, CreateCLIToken } from "@envpush/shared";

export function cliTokenQueries(db: PgliteDatabase<typeof schema>) {
  return {
    async create(data: CreateCLIToken): Promise<CLIToken> {
      const [token] = await db.insert(schema.cliTokens).values(data).returning();
      return token! as unknown as CLIToken;
    },
    async findByTokenHash(hash: string): Promise<CLIToken | null> {
      const rows = await db
        .select({
          id: schema.cliTokens.id,
          user_id: schema.cliTokens.user_id,
          name: schema.cliTokens.name,
          token_hash: schema.cliTokens.token_hash,
          last_used_at: schema.cliTokens.last_used_at,
          expires_at: schema.cliTokens.expires_at,
          created_at: schema.cliTokens.created_at,
          user_id_2: schema.users.id,
          user_email: schema.users.email,
          user_name: schema.users.name,
          user_password_hash: schema.users.password_hash,
          user_created_at: schema.users.created_at,
        })
        .from(schema.cliTokens)
        .innerJoin(schema.users, eq(schema.cliTokens.user_id, schema.users.id))
        .where(eq(schema.cliTokens.token_hash, hash))
        .limit(1);

      if (rows.length === 0) return null;

      const row = rows[0]!;
      return {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        token_hash: row.token_hash,
        last_used_at: row.last_used_at,
        expires_at: row.expires_at,
        created_at: row.created_at,
        user: {
          id: row.user_id_2,
          email: row.user_email,
          name: row.user_name,
          password_hash: row.user_password_hash,
          created_at: row.user_created_at,
        },
      } as CLIToken;
    },
    async updateLastUsed(id: string): Promise<void> {
      await db
        .update(schema.cliTokens)
        .set({ last_used_at: new Date() })
        .where(eq(schema.cliTokens.id, id));
    },
    async delete(id: string): Promise<void> {
      await db.delete(schema.cliTokens).where(eq(schema.cliTokens.id, id));
    },
    async deleteByUserId(userId: string): Promise<void> {
      await db.delete(schema.cliTokens).where(eq(schema.cliTokens.user_id, userId));
    },
  };
}
