import { defineCommand } from "citty";
import { resolveEnvironmentId } from "../../lib/resolve-env.js";
import { formatTable, timeAgo, maskValue, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "list", description: "List all secrets" },
  args: {
    reveal: { type: "boolean", description: "Show actual values" },
  },
  async run({ args }) {
    try {
      const { client, envId, envName, projectName } = await resolveEnvironmentId();

      const res = await client.secrets[":id"].secrets.$get({
        param: { id: envId },
      });
      await handleApiResponse(res);
      const data = await res.json() as {
        secrets: { key: string; value: string; version: number; updated_by: string; updated_at: string }[];
      };

      console.log(`\nEnvironment: ${chalk.bold(envName)} (${projectName})\n`);

      if (data.secrets.length === 0) {
        console.log(chalk.dim("  No secrets yet. Use `evp push` or `evp set` to add some.\n"));
        return;
      }

      const table = formatTable(
        ["KEY", "VALUE", "VERSION", "UPDATED"],
        data.secrets.map((s) => [
          s.key,
          args.reveal ? s.value : maskValue(s.value),
          `v${s.version}`,
          timeAgo(s.updated_at),
        ])
      );
      console.log("  " + table.split("\n").join("\n  "));
      console.log(chalk.dim(`\n  ${data.secrets.length} secrets total\n`));
    } catch (err) {
      handleError(err);
    }
  },
});
