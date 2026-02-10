import { defineCommand } from "citty";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveEnvironmentId } from "../../lib/resolve-env.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "pull", description: "Pull remote secrets to .env" },
  args: {
    env: { type: "string", description: "Environment name" },
    stdout: { type: "boolean", description: "Print to stdout instead of writing file" },
  },
  async run({ args }) {
    try {
      const { client, envId, envName } = await resolveEnvironmentId(args.env);

      const res = await client.secrets[":id"].secrets.export.$get({
        param: { id: envId },
      });
      await handleApiResponse(res);
      const content = await res.text();

      if (args.stdout) {
        process.stdout.write(content);
      } else {
        const path = join(process.cwd(), ".env");
        await writeFile(path, content);
        const count = content.split("\n").filter((l) => l.trim() && !l.startsWith("#")).length;
        console.log(chalk.green(`  ${count} secrets -> .env (${envName})`));
        console.log(chalk.green("Done"));
      }
    } catch (err) {
      handleError(err);
    }
  },
});
