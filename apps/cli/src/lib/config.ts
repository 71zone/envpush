import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { CONFIG_DIR, CONFIG_FILE } from "@envpush/shared";

export interface CLIConfig {
  server_url: string;
  token: string;
}

function configDir(): string {
  return join(homedir(), CONFIG_DIR);
}

function configPath(): string {
  return join(configDir(), CONFIG_FILE);
}

export async function loadConfig(): Promise<CLIConfig | null> {
  try {
    const content = await readFile(configPath(), "utf-8");
    return JSON.parse(content) as CLIConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(config: CLIConfig): Promise<void> {
  await mkdir(configDir(), { recursive: true });
  await writeFile(configPath(), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
}

export async function clearConfig(): Promise<void> {
  try {
    await rm(configPath());
  } catch {
    // Already gone
  }
}

export function getConfigPath(): string {
  return configPath();
}
