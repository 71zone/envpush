import { defineCommand } from "citty";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEnvFile } from "@envpush/shared";
import { resolveEnvironmentId } from "../../lib/resolve-env.js";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "push", description: "Push .env to remote (with diff)" },
  async run() {
    try {
      const { client, envId, envName, projectName } = await resolveEnvironmentId();

      // Read local .env
      let localContent: string;
      try {
        localContent = await readFile(join(process.cwd(), ".env"), "utf-8");
      } catch {
        console.error(chalk.red("No .env file found in current directory."));
        process.exit(1);
      }
      const localVars = parseEnvFile(localContent);

      // Get remote secrets
      const remoteRes = await client.secrets[":id"].secrets.$get({
        param: { id: envId },
      });
      await handleApiResponse(remoteRes);
      const remoteData = await remoteRes.json() as {
        secrets: { key: string; value: string }[];
      };
      const remoteVars: Record<string, string> = {};
      for (const s of remoteData.secrets) {
        remoteVars[s.key] = s.value;
      }

      // Compute diff
      const allKeys = new Set([...Object.keys(localVars), ...Object.keys(remoteVars)]);
      const added: string[] = [];
      const removed: string[] = [];
      const changed: string[] = [];
      let unchanged = 0;

      for (const key of allKeys) {
        const inLocal = key in localVars;
        const inRemote = key in remoteVars;
        if (inLocal && !inRemote) {
          added.push(key);
        } else if (!inLocal && inRemote) {
          removed.push(key);
        } else if (localVars[key] !== remoteVars[key]) {
          changed.push(key);
        } else {
          unchanged++;
        }
      }

      console.log(chalk.dim(`\nComparing local .env with remote (${envName})...\n`));

      if (added.length === 0 && removed.length === 0 && changed.length === 0) {
        console.log(chalk.green("  Already in sync! No changes to push.\n"));
        return;
      }

      for (const key of added) {
        console.log(chalk.green(`  + ${key}  (new)`));
      }
      for (const key of changed) {
        console.log(chalk.yellow(`  ~ ${key}  (changed)`));
      }
      for (const key of removed) {
        console.log(chalk.red(`  - ${key}  (removed)`));
      }
      if (unchanged > 0) {
        console.log(chalk.dim(`  = ${unchanged} unchanged`));
      }
      console.log();

      const confirm = await p.confirm({
        message: `Push these changes to ${envName}?`,
      });
      handleCancel(confirm);

      if (!confirm) {
        console.log(chalk.dim("Cancelled."));
        return;
      }

      const s = p.spinner();
      s.start("Pushing...");

      const secrets = Object.entries(localVars).map(([key, value]) => ({ key, value }));
      const pushRes = await client.secrets[":id"].secrets.$put({
        param: { id: envId },
        json: { secrets },
      });
      await handleApiResponse(pushRes);

      const totalChanges = added.length + changed.length + removed.length;
      s.stop(chalk.green(`${totalChanges} changes pushed`));
    } catch (err) {
      handleError(err);
    }
  },
});
