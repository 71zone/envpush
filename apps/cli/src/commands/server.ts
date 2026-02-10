import { defineCommand } from "citty";
import { loadConfig, saveServerUrl } from "../lib/config.js";
import { p, handleCancel, chalk } from "../lib/ui.js";

export default defineCommand({
  meta: { name: "server", description: "Set or show the server URL" },
  args: {
    url: {
      type: "positional",
      description: "Server URL to save",
      required: false,
    },
  },
  async run({ args }) {
    const url = args.url as string | undefined;

    if (url) {
      await saveServerUrl(url);
      p.log.success(`Server URL saved: ${chalk.bold(url)}`);
      return;
    }

    const config = await loadConfig();
    if (config?.server_url) {
      p.log.info(`Current server URL: ${chalk.bold(config.server_url)}`);
    } else {
      const newUrl = await p.text({
        message: "Server URL",
        placeholder: "http://localhost:8787",
        defaultValue: "http://localhost:8787",
      });
      handleCancel(newUrl);
      await saveServerUrl(newUrl);
      p.log.success(`Server URL saved: ${chalk.bold(newUrl)}`);
    }
  },
});
