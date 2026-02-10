import { and, eq, notInArray, sql } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "../schema.js";
import type { Secret, UpsertSecret } from "@envpush/shared";
import { encrypt } from "@envpush/shared/crypto";

export function secretQueries(db: PgliteDatabase<typeof schema>, masterKey: string) {
  return {
    async findByEnvironmentId(envId: string): Promise<Secret[]> {
      return (await db.select().from(schema.secrets).where(eq(schema.secrets.environment_id, envId))) as Secret[];
    },

    /** Full-replace upsert: delete keys not in incoming, insert/update the rest. */
    async upsertMany(envId: string, incoming: UpsertSecret[], updatedBy: string): Promise<void> {
      await db.transaction(async (tx) => {
        const existing = await tx.select().from(schema.secrets).where(eq(schema.secrets.environment_id, envId));

        const existingMap = new Map(existing.map((s) => [s.key, s]));
        const incomingKeys = incoming.map((s) => s.key);

        // Delete keys not in incoming set
        if (incomingKeys.length > 0) {
          await tx
            .delete(schema.secrets)
            .where(and(eq(schema.secrets.environment_id, envId), notInArray(schema.secrets.key, incomingKeys)));
        } else {
          // If incoming is empty, delete all
          await tx.delete(schema.secrets).where(eq(schema.secrets.environment_id, envId));
        }

        // Insert new / update changed
        for (const item of incoming) {
          const existingSecret = existingMap.get(item.key);
          const encryptedValue = encrypt(item.value, masterKey);

          if (!existingSecret) {
            // New key
            await tx.insert(schema.secrets).values({
              environment_id: envId,
              key: item.key,
              encrypted_value: encryptedValue,
              version: 1,
              updated_by: updatedBy,
            });
          } else {
            // Update — always re-encrypt since we can't compare encrypted values directly.
            // We could decrypt and compare, but it's simpler to always update.
            await tx
              .update(schema.secrets)
              .set({
                encrypted_value: encryptedValue,
                version: existingSecret.version + 1,
                updated_by: updatedBy,
                updated_at: sql`NOW()`,
              })
              .where(eq(schema.secrets.id, existingSecret.id));
          }
        }
      });
    },

    async delete(envId: string, key: string): Promise<void> {
      await db
        .delete(schema.secrets)
        .where(and(eq(schema.secrets.environment_id, envId), eq(schema.secrets.key, key)));
    },
  };
}
