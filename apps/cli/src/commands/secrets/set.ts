import { defineCommand } from "citty";
import { resolveEnvironmentId } from "../../lib/resolve-env.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "set", description: "Set a single secret (KEY=VALUE)" },
  args: {
    keyvalue: { type: "positional", required: true, description: "KEY=VALUE" },
  },
  async run({ args }) {
    try {
      const eqIndex = args.keyvalue.indexOf("=");
      if (eqIndex === -1) {
        console.error(chalk.red("Usage: evp set KEY=VALUE"));
        process.exit(1);
      }

      const key = args.keyvalue.slice(0, eqIndex);
      const value = args.keyvalue.slice(eqIndex + 1);

      const { client, envId, envName } = await resolveEnvironmentId();

      // Get current secrets
      const res = await client.secrets[":id"].secrets.$get({
        param: { id: envId },
      });
      await handleApiResponse(res);
      const data = await res.json() as {
        secrets: { key: string; value: string }[];
      };

      // Build new set
      const secrets = data.secrets
        .filter((s) => s.key !== key)
        .map((s) => ({ key: s.key, value: s.value }));
      secrets.push({ key, value });

      const pushRes = await client.secrets[":id"].secrets.$put({
        param: { id: envId },
        json: { secrets },
      });
      await handleApiResponse(pushRes);

      console.log(chalk.green(`Set ${key} in ${envName}`));
    } catch (err) {
      handleError(err);
    }
  },
});
