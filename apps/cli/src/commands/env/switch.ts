import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { loadProjectConfig, saveProjectConfig } from "../../lib/project-config.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "switch", description: "Switch active environment" },
  async run() {
    try {
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
        environments: { id: string; name: string; slug: string }[];
      };

      const selected = await p.select({
        message: "Select environment",
        options: projectData.environments.map((e) => ({
          value: e.slug,
          label: e.slug === projectConfig.environment ? `${e.name} (current)` : e.name,
        })),
      });
      handleCancel(selected);

      await saveProjectConfig({ ...projectConfig, environment: selected as string });
      console.log(chalk.green(`Switched to ${selected}`));
      console.log(chalk.dim("Run `evp pull` to fetch secrets."));
    } catch (err) {
      handleError(err);
    }
  },
});
