import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { loadProjectConfig } from "../../lib/project-config.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "list", description: "List environments" },
  async run() {
    try {
      const projectConfig = await loadProjectConfig();
      if (!projectConfig) {
        console.error(chalk.red("No .evp.json found. Run `evp init` or `evp link` first."));
        process.exit(1);
      }

      const { client } = await getClient();

      // Resolve project
      const projectRes = await client.projects[":teamSlug"][":projectSlug"].$get({
        param: { teamSlug: projectConfig.team, projectSlug: projectConfig.project },
      });
      await handleApiResponse(projectRes);
      const projectData = await projectRes.json() as {
        project: { name: string };
        environments: { id: string; name: string; slug: string }[];
      };

      console.log(`\nProject: ${chalk.bold(projectData.project.name)}\n`);
      for (const env of projectData.environments) {
        const isCurrent = env.slug === projectConfig.environment;
        const marker = isCurrent ? chalk.green("●") : chalk.dim("○");
        const name = isCurrent ? chalk.bold(env.name) : env.name;
        console.log(`  ${marker} ${name}`);
      }
      console.log();
    } catch (err) {
      handleError(err);
    }
  },
});
