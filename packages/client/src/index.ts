import { hc } from "hono/client";
import type { AppType } from "@envpush/server";

/**
 * Create a typed Hono RPC client for the EnvPush API.
 *
 * @param serverUrl - EnvPush server URL (e.g., "http://localhost:8787")
 * @param token - Optional CLI token for authenticated requests
 * @returns Fully typed Hono RPC client
 */
export function createClient(serverUrl: string, token?: string) {
  return hc<AppType>(serverUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export type { AppType };
