import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { p, handleCancel, chalk, formatTable, timeAgo } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "members", description: "List team members" },
  async run() {
    try {
      const { client } = await getClient();

      // Get teams
      const teamsRes = await client.teams.mine.$get();
      await handleApiResponse(teamsRes);
      const teamsData = await teamsRes.json() as {
        teams: { id: string; name: string; slug: string; role: string }[];
      };

      if (teamsData.teams.length === 0) {
        console.log(chalk.dim("No teams. Create one with `evp team create`."));
        return;
      }

      let teamId: string;
      if (teamsData.teams.length === 1) {
        teamId = teamsData.teams[0]!.id;
      } else {
        const selected = await p.select({
          message: "Select team",
          options: teamsData.teams.map((t) => ({ value: t.id, label: `${t.name} (${t.role})` })),
        });
        handleCancel(selected);
        teamId = selected as string;
      }

      const team = teamsData.teams.find((t) => t.id === teamId)!;
      const membersRes = await client.teams[":id"].members.$get({
        param: { id: teamId },
      });
      await handleApiResponse(membersRes);

      const data = await membersRes.json() as {
        members: {
          user_name: string;
          user_email: string;
          role: string;
          joined_at: string;
        }[];
      };

      console.log(`\nTeam: ${chalk.bold(team.name)}\n`);
      const table = formatTable(
        ["NAME", "EMAIL", "ROLE", "JOINED"],
        data.members.map((m) => [
          m.user_name,
          m.user_email,
          m.role,
          timeAgo(m.joined_at),
        ])
      );
      console.log("  " + table.split("\n").join("\n  "));
      console.log();
    } catch (err) {
      handleError(err);
    }
  },
});
