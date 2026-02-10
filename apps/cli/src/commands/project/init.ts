import { defineCommand } from "citty";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getClient } from "../../lib/client.js";
import { saveProjectConfig } from "../../lib/project-config.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import { detectProjectInfo, parseEnvFile } from "@envpush/shared";

export default defineCommand({
  meta: { name: "init", description: "Initialize project (smart detection)" },
  async run() {
    try {
      p.intro(chalk.bold("evp init"));

      const cwd = process.cwd();
      const info = await detectProjectInfo(cwd);

      // Show detection results
      const lines = [];
      if (info.name) lines.push(`Name:    ${info.name}`);
      if (info.branch) lines.push(`Branch:  ${info.branch}`);
      if (info.hasEnvFile) lines.push(`.env:    found (${info.envVarCount} variables)`);
      else lines.push(`.env:    not found`);

      if (lines.length) p.note(lines.join("\n"), "Detected project info");

      // Get teams
      const { client } = await getClient();
      const teamsRes = await client.teams.mine.$get();
      await handleApiResponse(teamsRes);
      const teamsData = await teamsRes.json() as {
        teams: { id: string; name: string; slug: string }[];
      };

      if (teamsData.teams.length === 0) {
        p.cancel("No teams. Create one with `evp team create` first.");
        process.exit(1);
      }

      let teamId: string;
      let teamSlug: string;
      if (teamsData.teams.length === 1) {
        teamId = teamsData.teams[0]!.id;
        teamSlug = teamsData.teams[0]!.slug;
      } else {
        const selected = await p.select({
          message: "Select team",
          options: teamsData.teams.map((t) => ({ value: t.id, label: t.name })),
        });
        handleCancel(selected);
        teamId = selected as string;
        teamSlug = teamsData.teams.find((t) => t.id === teamId)!.slug;
      }

      const projectName = await p.text({
        message: "Project name",
        initialValue: info.name || "",
      });
      handleCancel(projectName);

      // Map branch to environment
      const envOptions = [
        { value: "development", label: "development" },
        { value: "staging", label: "staging" },
        { value: "production", label: "production" },
      ];
      const suggestedEnv = info.suggestedEnv || "development";

      const selectedEnv = await p.select({
        message: `Map current branch "${info.branch || "unknown"}" to environment:`,
        options: envOptions,
        initialValue: suggestedEnv,
      });
      handleCancel(selectedEnv);
      const envName = selectedEnv as string;

      // Create project
      const s = p.spinner();
      s.start("Creating project...");

      const projectRes = await client.projects.$post({
        json: { team_id: teamId, name: projectName },
      });
      await handleApiResponse(projectRes);
      const projectData = await projectRes.json() as {
        project: { id: string; slug: string };
        environments: { id: string; name: string; slug: string }[];
      };
      s.stop("Project created!");

      // Find the selected environment
      const targetEnv = projectData.environments.find((e) => e.slug === envName);
      if (!targetEnv) {
        p.cancel(`Environment "${envName}" not found.`);
        process.exit(1);
      }

      // Import .env if exists
      if (info.hasEnvFile && info.envVarCount && info.envVarCount > 0) {
        const importEnv = await p.confirm({
          message: `Import ${info.envVarCount} variables from .env to ${envName}?`,
          initialValue: true,
        });
        handleCancel(importEnv);

        if (importEnv) {
          s.start(`Pushing ${info.envVarCount} secrets to ${envName}...`);
          const envContent = await readFile(join(cwd, ".env"), "utf-8");
          const vars = parseEnvFile(envContent);
          const secrets = Object.entries(vars).map(([key, value]) => ({ key, value }));

          const pushRes = await client.secrets[":id"].secrets.$put({
            param: { id: targetEnv.id },
            json: { secrets },
          });
          await handleApiResponse(pushRes);
          s.stop(`Pushed ${secrets.length} secrets!`);
        }
      }

      // Write .evp.json
      await saveProjectConfig({
        team: teamSlug,
        project: projectData.project.slug,
        environment: envName,
      });
      p.log.success("Created .evp.json");

      // Suggest .gitignore
      p.log.info(chalk.dim("Add .evp.json and .env to your .gitignore"));

      p.note(
        [
          `Project:     ${projectName}`,
          `Environment: ${envName}`,
          info.envVarCount ? `Secrets:     ${info.envVarCount} synced` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        "Summary"
      );

      p.outro("Done! Use `evp pull` and `evp push` to sync.");
    } catch (err) {
      handleError(err);
    }
  },
});
