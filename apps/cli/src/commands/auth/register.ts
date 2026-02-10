import { defineCommand } from "citty";
import { createClient } from "@envpush/client";
import { p, handleCancel, chalk } from "../../lib/ui.js";
import { loadConfig, saveConfig } from "../../lib/config.js";
import { handleApiResponse, handleError } from "../../lib/errors.js";

export default defineCommand({
  meta: { name: "register", description: "Create a new account" },
  async run() {
    try {
      p.intro(chalk.bold("evp register"));

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

      const name = await p.text({
        message: "Name",
        validate: (v) => {
          if (!v || v.trim().length === 0) return "Name is required";
        },
      });
      handleCancel(name);

      const email = await p.text({
        message: "Email",
        validate: (v) => {
          if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Invalid email address";
        },
      });
      handleCancel(email);

      const password = await p.password({
        message: "Password (min 6 chars)",
        validate: (v) => {
          if (!v || v.length < 6) return "Password must be at least 6 characters";
        },
      });
      handleCancel(password);

      const confirmPassword = await p.password({
        message: "Confirm password",
        validate: (v) => {
          if (!v || v.length === 0) return "Please confirm your password";
        },
      });
      handleCancel(confirmPassword);

      if (password !== confirmPassword) {
        p.cancel("Passwords do not match.");
        process.exit(1);
      }

      const s = p.spinner();
      s.start("Creating account...");

      const client = createClient(serverUrl);
      const registerRes = await client.auth.register.$post({
        json: { name, email, password },
      });
      await handleApiResponse(registerRes);
      s.stop("Account created!");

      // Auto-login
      s.start("Logging in...");
      const loginRes = await client.auth.login.$post({
        json: { email, password },
      });
      await handleApiResponse(loginRes);
      const loginData = await loginRes.json() as { token: string };
      await saveConfig({ server_url: serverUrl, token: loginData.token });
      s.stop("Logged in!");

      // Offer to create team
      const createTeam = await p.confirm({
        message: "Create a team now?",
        initialValue: true,
      });
      handleCancel(createTeam);

      if (createTeam) {
        const teamName = await p.text({
          message: "Team name",
          validate: (v) => {
            if (!v || v.trim().length === 0) return "Team name is required";
          },
        });
        handleCancel(teamName);

        s.start("Creating team...");
        const authedClient = createClient(serverUrl, loginData.token);
        const teamRes = await authedClient.teams.$post({
          json: { name: teamName },
        });
        await handleApiResponse(teamRes);
        const teamData = await teamRes.json() as { team: { invite_code: string } };
        s.stop("Team created!");

        p.note(
          `Invite code: ${chalk.bold(teamData.team.invite_code)}\nShare this with your teammates`,
          "Team Invite"
        );
      }

      p.outro("All set! Token saved to ~/.envpush/config.json");
    } catch (err) {
      handleError(err);
    }
  },
});
