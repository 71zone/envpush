import { loadProjectConfig } from "./project-config.js";
import { getClient } from "./client.js";
import { handleApiResponse } from "./errors.js";
import chalk from "chalk";

/**
 * Resolve the current environment ID from .evp.json + server lookup.
 * Optionally override with a specific env name.
 */
export async function resolveEnvironmentId(envOverride?: string) {
  const projectConfig = await loadProjectConfig();
  if (!projectConfig) {
    console.error(chalk.red("No .evp.json found. Run `evp init` or `evp link` first."));
    process.exit(1);
  }

  const { client } = await getClient();

  const projectRes = await client.projects[":teamSlug"][":projectSlug"].$get({
    param: { teamSlug: projectConfig.team, projectSlug: projectConfig.project },
  });
  await handleApiResponse(projectRes);

  const projectData = await projectRes.json() as {
    project: { id: string; name: string };
    environments: { id: string; name: string; slug: string }[];
  };

  const envSlug = envOverride || projectConfig.environment;
  const env = projectData.environments.find((e) => e.slug === envSlug);
  if (!env) {
    console.error(chalk.red(`Environment "${envSlug}" not found.`));
    process.exit(1);
  }

  return {
    client,
    envId: env.id,
    envName: env.name,
    projectName: projectData.project.name,
    projectConfig,
  };
}
