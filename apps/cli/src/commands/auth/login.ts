import { defineCommand } from "citty";
import { createClient } from "@envpush/client";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { saveConfig } from "../../lib/config.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "login", description: "Login to server" },
  async run() {
    try {
      p.intro(chalk.bold("evp login"));

      const serverUrl = await p.text({
        message: "Server URL",
        placeholder: "http://localhost:8787",
        defaultValue: "http://localhost:8787",
      });
      handleCancel(serverUrl);

      const email = await p.text({ message: "Email" });
      handleCancel(email);

      const password = await p.password({ message: "Password" });
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
