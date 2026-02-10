import { defineCommand } from "citty";
import { getClient } from "../../lib/client.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "join", description: "Join a team by invite code" },
  args: {
    code: { type: "positional", required: false, description: "Invite code" },
  },
  async run({ args }) {
    try {
      let code = args.code;
      if (!code) {
        p.intro(chalk.bold("evp team join"));
        const input = await p.text({ message: "Invite code" });
        handleCancel(input);
        code = input;
      }

      const s = p.spinner();
      s.start("Joining team...");

      const { client } = await getClient();
      const res = await client.teams.join.$post({
        json: { invite_code: code },
      });
      await handleApiResponse(res);

      const data = await res.json() as { team: { name: string } };
      s.stop(`Joined "${data.team.name}"!`);
    } catch (err) {
      handleError(err);
    }
  },
});
