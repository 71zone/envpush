import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "create", description: "Create a new team" },
  async run() {
    try {
      p.intro(chalk.bold("evp team create"));

      const name = await p.text({ message: "Team name" });
      handleCancel(name);

      const s = p.spinner();
      s.start("Creating team...");

      const { client } = await getClient();
      const res = await client.teams.$post({ json: { name } });
      await handleApiResponse(res);

      const data = await res.json() as { team: { invite_code: string; name: string } };
      s.stop("Team created!");

      p.note(
        `Invite code: ${chalk.bold(data.team.invite_code)}\nShare this with your teammates`,
        "Team Invite"
      );

      p.outro("Done!");
    } catch (err) {
      handleError(err);
    }
  },
});
