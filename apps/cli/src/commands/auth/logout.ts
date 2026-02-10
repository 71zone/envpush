import { defineCommand } from "citty";
import { clearConfig, getConfigPath } from "../../lib/config.js";
import chalk from "chalk";

export default defineCommand({
  meta: { name: "logout", description: "Clear credentials" },
  async run() {
    await clearConfig();
    console.log(chalk.green(`Logged out. Removed ${getConfigPath()}`));
  },
});
