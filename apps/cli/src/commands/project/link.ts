import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { saveProjectConfig } from "../../lib/project-config.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "link", description: "Link to existing project/environment" },
  async run() {
    try {
      p.intro(chalk.bold("evp link"));

      const { client } = await getClient();

      // Select team
      const teamsRes = await client.teams.mine.$get();
      await handleApiResponse(teamsRes);
      const teamsData = await teamsRes.json() as {
        teams: { id: string; name: string; slug: string }[];
      };

      if (teamsData.teams.length === 0) {
        p.cancel("No teams.");
        process.exit(1);
      }

      const teamId = await p.select({
        message: "Select team",
        options: teamsData.teams.map((t) => ({ value: t.id, label: t.name })),
      });
      handleCancel(teamId);
      const team = teamsData.teams.find((t) => t.id === teamId)!;

      // Select project
      const projectsRes = await client.projects.teams[":teamId"].projects.$get({
        param: { teamId: teamId as string },
      });
      await handleApiResponse(projectsRes);
      const projectsData = await projectsRes.json() as {
        projects: { id: string; name: string; slug: string }[];
      };

      if (projectsData.projects.length === 0) {
        p.cancel("No projects in this team. Use `evp init` to create one.");
        process.exit(1);
      }

      const projectId = await p.select({
        message: "Select project",
        options: projectsData.projects.map((pr) => ({ value: pr.id, label: pr.name })),
      });
      handleCancel(projectId);
      const project = projectsData.projects.find((pr) => pr.id === projectId)!;

      // Select environment
      const envsRes = await client.environments[":projectId"].environments.$get({
        param: { projectId: projectId as string },
      });
      await handleApiResponse(envsRes);
      const envsData = await envsRes.json() as {
        environments: { id: string; name: string; slug: string }[];
      };

      const envId = await p.select({
        message: "Select environment",
        options: envsData.environments.map((e) => ({ value: e.slug, label: e.name })),
      });
      handleCancel(envId);

      await saveProjectConfig({
        team: team.slug,
        project: project.slug,
        environment: envId as string,
      });

      p.log.success("Created .evp.json");
      p.outro("Linked! Run `evp pull` to fetch secrets.");
    } catch (err) {
      handleError(err);
    }
  },
});
