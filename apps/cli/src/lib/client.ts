import { createClient } from "@envpush/client";
import { loadConfig } from "./config.js";

/** Get an authenticated API client. Exits if not logged in. */
export async function getClient() {
  const config = await loadConfig();
  if (!config) {
    console.error("Not logged in. Run `evp login` first.");
    process.exit(1);
  }
  return { client: createClient(config.server_url, config.token), config };
}
