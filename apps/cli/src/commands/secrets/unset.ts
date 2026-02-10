import { defineCommand } from "citty";
import { resolveEnvironmentId } from "../../lib/resolve-env.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "unset", description: "Remove a single secret" },
  args: {
    key: { type: "positional", required: true, description: "Secret key to remove" },
  },
  async run({ args }) {
    try {
      const { client, envId, envName } = await resolveEnvironmentId();

      // Get current secrets
      const res = await client.secrets[":id"].secrets.$get({
        param: { id: envId },
      });
      await handleApiResponse(res);
      const data = await res.json() as {
        secrets: { key: string; value: string }[];
      };

      // Remove the key and push remaining
      const secrets = data.secrets
        .filter((s) => s.key !== args.key)
        .map((s) => ({ key: s.key, value: s.value }));

      const pushRes = await client.secrets[":id"].secrets.$put({
        param: { id: envId },
        json: { secrets },
      });
      await handleApiResponse(pushRes);

      console.log(chalk.green(`Removed ${args.key} from ${envName}`));
    } catch (err) {
      handleError(err);
    }
  },
});
