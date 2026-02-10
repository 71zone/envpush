import { serve } from "@hono/node-server";
import { envpushDb } from "@envpush/db-pglite";
import { getEnv } from "./env.js";
import { createApp } from "./app.js";

async function main() {
  const { masterKey, port, dataDir } = getEnv();

  console.log("Initializing database...");
  const db = await envpushDb({ masterKey, connectionString: dataDir });
  console.log("Database ready.");

  const app = createApp(db, masterKey);

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`EnvPush server running on http://localhost:${info.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
