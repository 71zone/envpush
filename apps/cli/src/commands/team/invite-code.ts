import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "invite-code", description: "Show or regenerate invite code" },
  async run() {
    try {
      p.intro(chalk.bold("evp team invite-code"));

      const { client } = await getClient();
      const teamsRes = await client.teams.mine.$get();
      await handleApiResponse(teamsRes);
      const teamsData = await teamsRes.json() as {
        teams: { id: string; name: string; slug: string; role: string }[];
      };

      if (teamsData.teams.length === 0) {
        p.cancel("No teams. Create one with `evp team create`.");
        return;
      }

      let teamId: string;
      if (teamsData.teams.length === 1) {
        teamId = teamsData.teams[0]!.id;
      } else {
        const selected = await p.select({
          message: "Select team",
          options: teamsData.teams.map((t) => ({ value: t.id, label: t.name })),
        });
        handleCancel(selected);
        teamId = selected as string;
      }

      const team = teamsData.teams.find((t) => t.id === teamId)!;
      const teamRes = await client.teams[":slug"].$get({ param: { slug: team.slug } });
      await handleApiResponse(teamRes);
      const teamData = await teamRes.json() as { team: { invite_code: string } };

      p.note(`Current invite code: ${chalk.bold(teamData.team.invite_code)}`, team.name);

      const action = await p.select({
        message: "What do you want to do?",
        options: [
          { value: "keep", label: "Keep current code" },
          { value: "regenerate", label: "Regenerate new code" },
        ],
      });
      handleCancel(action);

      if (action === "regenerate") {
        const s = p.spinner();
        s.start("Regenerating...");

        const regenRes = await client.teams[":id"]["regenerate-invite"].$post({
          param: { id: teamId },
        });
        await handleApiResponse(regenRes);
        const regenData = await regenRes.json() as { invite_code: string };

        s.stop("Regenerated!");
        p.note(`New invite code: ${chalk.bold(regenData.invite_code)}`, "Updated");
        p.outro("Old code is now invalid.");
      } else {
        p.outro("Done!");
      }
    } catch (err) {
      handleError(err);
    }
  },
});
