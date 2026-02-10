import { readFile, access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { parseEnvFile } from "./env-parser.js";

export interface DetectedProjectInfo {
  name?: string;
  branch?: string;
  hasEnvFile: boolean;
  envVarCount?: number;
  suggestedEnv?: string;
}

function getBranch(cwd: string): string | undefined {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return undefined;
  }
}

function branchToEnv(branch: string): string {
  if (branch === "main" || branch === "master") return "production";
  if (branch === "develop" || branch === "dev") return "staging";
  return "development";
}

/** Auto-detect project info from the current working directory. */
export async function detectProjectInfo(cwd: string): Promise<DetectedProjectInfo> {
  let name: string | undefined;

  // Try package.json
  try {
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf-8"));
    name = pkg.name;
  } catch {
    // Fallback to directory name
    const parts = cwd.split("/");
    name = parts[parts.length - 1];
  }

  const branch = getBranch(cwd);

  let hasEnvFile = false;
  let envVarCount: number | undefined;
  try {
    const envContent = await readFile(join(cwd, ".env"), "utf-8");
    hasEnvFile = true;
    envVarCount = Object.keys(parseEnvFile(envContent)).length;
  } catch {
    // No .env file
  }

  return {
    name,
    branch,
    hasEnvFile,
    envVarCount,
    suggestedEnv: branch ? branchToEnv(branch) : "development",
  };
}
