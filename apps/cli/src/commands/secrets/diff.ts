import { defineCommand } from "citty";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEnvFile } from "@envpush/shared";
import { resolveEnvironmentId } from "../../lib/resolve-env.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "diff", description: "Diff local .env vs remote" },
  async run() {
    try {
      const { client, envId, envName } = await resolveEnvironmentId();

      // Read local
      let localContent: string;
      try {
        localContent = await readFile(join(process.cwd(), ".env"), "utf-8");
      } catch {
        console.error(chalk.red("No .env file found in current directory."));
        process.exit(1);
      }
      const localVars = parseEnvFile(localContent);

      // Get remote
      const res = await client.secrets[":id"].secrets.$get({
        param: { id: envId },
      });
      await handleApiResponse(res);
      const data = await res.json() as {
        secrets: { key: string; value: string }[];
      };
      const remoteVars: Record<string, string> = {};
      for (const s of data.secrets) {
        remoteVars[s.key] = s.value;
      }

      // Compute diff
      const allKeys = new Set([...Object.keys(localVars), ...Object.keys(remoteVars)]);
      let hasChanges = false;
      let unchanged = 0;

      console.log(chalk.dim(`\nComparing local .env <-> remote (${envName})\n`));

      for (const key of [...allKeys].sort()) {
        const inLocal = key in localVars;
        const inRemote = key in remoteVars;
        if (inLocal && !inRemote) {
          console.log(chalk.green(`  + ${key}  (local only)`));
          hasChanges = true;
        } else if (!inLocal && inRemote) {
          console.log(chalk.red(`  - ${key}  (remote only)`));
          hasChanges = true;
        } else if (localVars[key] !== remoteVars[key]) {
          console.log(chalk.yellow(`  ~ ${key}  (value differs)`));
          hasChanges = true;
        } else {
          unchanged++;
        }
      }

      if (unchanged > 0) {
        console.log(chalk.dim(`    ${unchanged} unchanged`));
      }

      console.log();
      if (!hasChanges) {
        console.log(chalk.green("In sync! No differences.\n"));
      } else {
        console.log(chalk.dim("No action taken. Use `evp push` to sync.\n"));
      }
    } catch (err) {
      handleError(err);
    }
  },
});
