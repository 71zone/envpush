import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "whoami", description: "Show current user & teams" },
  async run() {
    try {
      const { client, config } = await getClient();
      const res = await client.auth.me.$get();
      await handleApiResponse(res);

      const data = await res.json() as {
        user: { name: string; email: string };
        teams: { name: string; slug: string }[];
      };

      console.log(`User:    ${chalk.bold(data.user.name)} (${data.user.email})`);
      console.log(`Server:  ${config.server_url}`);

      if (data.teams.length > 0) {
        const teamList = data.teams.map((t) => t.name).join(", ");
        console.log(`Teams:   ${teamList}`);
      } else {
        console.log(`Teams:   ${chalk.dim("(none)")}`);
      }
    } catch (err) {
      handleError(err);
    }
  },
});
