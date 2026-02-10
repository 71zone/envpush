import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { loadProjectConfig } from "../../lib/project-config.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "create", description: "Create a new environment" },
  async run() {
    try {
      p.intro(chalk.bold("evp env create"));

      const projectConfig = await loadProjectConfig();
      if (!projectConfig) {
        p.cancel("No .evp.json found. Run `evp init` or `evp link` first.");
        process.exit(1);
      }

      const { client } = await getClient();

      // Resolve project
      const projectRes = await client.projects[":teamSlug"][":projectSlug"].$get({
        param: { teamSlug: projectConfig.team, projectSlug: projectConfig.project },
      });
      await handleApiResponse(projectRes);
      const projectData = await projectRes.json() as {
        project: { id: string };
        environments: { id: string; name: string; slug: string }[];
      };

      const name = await p.text({ message: "Environment name" });
      handleCancel(name);

      // Copy from existing?
      const copyOptions = [
        ...projectData.environments.map((e) => ({ value: e.id, label: e.name })),
        { value: "empty", label: "Start empty" },
      ];
      const copyFrom = await p.select({
        message: "Copy secrets from existing environment?",
        options: copyOptions,
      });
      handleCancel(copyFrom);

      const s = p.spinner();
      s.start("Creating environment...");

      const createRes = await client.environments[":projectId"].environments.$post({
        param: { projectId: projectData.project.id },
        json: { name },
      });
      await handleApiResponse(createRes);
      const envData = await createRes.json() as { environment: { id: string; name: string } };

      // Copy secrets if selected
      if (copyFrom !== "empty") {
        const secretsRes = await client.secrets[":id"].secrets.$get({
          param: { id: copyFrom as string },
        });
        await handleApiResponse(secretsRes);
        const secretsData = await secretsRes.json() as {
          secrets: { key: string; value: string }[];
        };

        if (secretsData.secrets.length > 0) {
          await client.secrets[":id"].secrets.$put({
            param: { id: envData.environment.id },
            json: { secrets: secretsData.secrets.map((s) => ({ key: s.key, value: s.value })) },
          });
        }

        s.stop(`Created "${envData.environment.name}" with ${secretsData.secrets.length} secrets`);
      } else {
        s.stop(`Created "${envData.environment.name}"`);
      }

      p.outro("Done! Use `evp env switch` to activate.");
    } catch (err) {
      handleError(err);
    }
  },
});
