import { DEFAULT_PORT } from "@envpush/shared";

export function getEnv() {
  const masterKey = process.env.EVPUSH_MASTER_KEY;
  if (!masterKey) {
    console.error("EVPUSH_MASTER_KEY is required. Set it to a secure random string (32+ chars).");
    process.exit(1);
  }
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  const dataDir = process.env.EVPUSH_DATA_DIR || "./data/envpush";
  return { masterKey, port, dataDir };
}
