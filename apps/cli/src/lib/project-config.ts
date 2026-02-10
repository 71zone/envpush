import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PROJECT_CONFIG_FILE } from "@envpush/shared";

export interface ProjectConfig {
  team: string;
  project: string;
  environment: string;
}

export async function loadProjectConfig(cwd?: string): Promise<ProjectConfig | null> {
  try {
    const path = join(cwd || process.cwd(), PROJECT_CONFIG_FILE);
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as ProjectConfig;
  } catch {
    return null;
  }
}

export async function saveProjectConfig(config: ProjectConfig, cwd?: string): Promise<void> {
  const path = join(cwd || process.cwd(), PROJECT_CONFIG_FILE);
  await writeFile(path, JSON.stringify(config, null, 2) + "\n");
}
