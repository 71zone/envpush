import { defineCommand } from "citty";
import { createClient } from "@envpush/client";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { loadConfig, saveConfig, saveServerUrl } from "../../lib/config.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "login", description: "Login to server" },
  async run() {
    try {
      p.intro(chalk.bold("evp login"));

      const config = await loadConfig();
      let serverUrl: string;

      if (config?.server_url) {
        serverUrl = config.server_url;
        p.log.info(`Server: ${chalk.bold(serverUrl)}`);
      } else {
        const input = await p.text({
          message: "Server URL",
          placeholder: "http://localhost:8787",
          defaultValue: "http://localhost:8787",
        });
        handleCancel(input);
        serverUrl = input;
      }

      const email = await p.text({
        message: "Email",
        validate: (v) => {
          if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Invalid email address";
        },
      });
      handleCancel(email);

      const password = await p.password({
        message: "Password",
        validate: (v) => {
          if (!v || v.length === 0) return "Password is required";
        },
      });
      handleCancel(password);

      const s = p.spinner();
      s.start("Authenticating...");

      const client = createClient(serverUrl);
      const res = await client.auth.login.$post({
        json: { email, password },
      });
      await handleApiResponse(res);

      const data = await res.json() as { token: string };
      await saveConfig({ server_url: serverUrl, token: data.token });

      s.stop("Authenticated!");
      p.outro("Logged in! Token saved to ~/.envpush/config.json");
    } catch (err) {
      handleError(err);
    }
  },
});
