import { defineCommand, runCommand, type CommandDef } from "citty";
import { p, handleCancel, chalk } from "../lib/ui.js";
import { loadConfig } from "../lib/config.js";
import { loadProjectConfig } from "../lib/project-config.js";

const commands = {
  // Secrets
  pull: () => import("./secrets/pull.js").then((m) => m.default),
  push: () => import("./secrets/push.js").then((m) => m.default),
  set: () => import("./secrets/set.js").then((m) => m.default),
  unset: () => import("./secrets/unset.js").then((m) => m.default),
  list: () => import("./secrets/list.js").then((m) => m.default),
  diff: () => import("./secrets/diff.js").then((m) => m.default),
  // Environments
  "env list": () => import("./env/list.js").then((m) => m.default),
  "env switch": () => import("./env/switch.js").then((m) => m.default),
  "env create": () => import("./env/create.js").then((m) => m.default),
  // Project
  init: () => import("./project/init.js").then((m) => m.default),
  link: () => import("./project/link.js").then((m) => m.default),
  // Team
  "team create": () => import("./team/create.js").then((m) => m.default),
  "team join": () => import("./team/join.js").then((m) => m.default),
  "team members": () => import("./team/members.js").then((m) => m.default),
  "team invite-code": () => import("./team/invite-code.js").then((m) => m.default),
  // Account
  server: () => import("./server.js").then((m) => m.default),
  login: () => import("./auth/login.js").then((m) => m.default),
  register: () => import("./auth/register.js").then((m) => m.default),
  whoami: () => import("./auth/whoami.js").then((m) => m.default),
  logout: () => import("./auth/logout.js").then((m) => m.default),
} satisfies Record<string, () => Promise<CommandDef>>;

type CmdKey = keyof typeof commands;
type MenuValue = CmdKey | "__back__" | "__exit__";
type MenuItem = { value: MenuValue; label: string; hint: string };

type Category = {
  value: string;
  label: string;
  hint: string;
  items: MenuItem[];
};

function buildCategories(loggedIn: boolean, hasProject: boolean): Category[] {
  const categories: Category[] = [];

  if (hasProject) {
    categories.push({
      value: "secrets", label: "Secrets", hint: "pull, push, set, unset, list, diff",
      items: [
        { value: "pull", label: "Pull", hint: "sync remote → local .env" },
        { value: "push", label: "Push", hint: "sync local .env → remote" },
        { value: "set", label: "Set", hint: "set KEY=VALUE remotely" },
        { value: "unset", label: "Unset", hint: "remove a key remotely" },
        { value: "list", label: "List", hint: "show all remote keys" },
        { value: "diff", label: "Diff", hint: "compare local vs remote" },
      ],
    });
    categories.push({
      value: "env", label: "Environments", hint: "list, switch, create",
      items: [
        { value: "env list", label: "List", hint: "show all environments" },
        { value: "env switch", label: "Switch", hint: "change active environment" },
        { value: "env create", label: "Create", hint: "add a new environment" },
      ],
    });
  }

  if (loggedIn) {
    categories.push({
      value: "project", label: "Project", hint: "init, link",
      items: [
        { value: "init", label: "Initialize", hint: "set up new project" },
        { value: "link", label: "Link", hint: "link to existing project" },
      ],
    });
    categories.push({
      value: "team", label: "Team", hint: "create, join, members, invite code",
      items: [
        { value: "team create", label: "Create", hint: "start a new team" },
        { value: "team join", label: "Join", hint: "join with invite code" },
        { value: "team members", label: "Members", hint: "view team members" },
        { value: "team invite-code", label: "Invite code", hint: "show or regenerate" },
      ],
    });
    categories.push({
      value: "account", label: "Account", hint: "whoami, logout, server",
      items: [
        { value: "whoami", label: "Who am I", hint: "show current user" },
        { value: "logout", label: "Logout", hint: "clear credentials" },
        { value: "server", label: "Server settings", hint: "set or show server URL" },
      ],
    });
  }

  if (!loggedIn) {
    categories.push({
      value: "account", label: "Account", hint: "login, register, server",
      items: [
        { value: "login", label: "Login", hint: "authenticate" },
        { value: "register", label: "Register", hint: "create account" },
        { value: "server", label: "Server settings", hint: "set or show server URL" },
      ],
    });
  }

  return categories;
}

export const main = defineCommand({
  meta: {
    name: "evp",
    version: "0.1.0",
    description: "Self-hosted environment variable manager",
  },
  subCommands: {
    server: commands.server,
    register: commands.register,
    login: commands.login,
    logout: commands.logout,
    whoami: commands.whoami,
    team: () => import("./team/index.js").then((m) => m.default),
    init: commands.init,
    link: commands.link,
    env: () => import("./env/index.js").then((m) => m.default),
    pull: commands.pull,
    push: commands.push,
    set: commands.set,
    unset: commands.unset,
    list: commands.list,
    diff: commands.diff,
  },
  async run() {
    p.intro(chalk.bold("evp") + chalk.dim(" v0.1.0"));

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [config, projectConfig] = await Promise.all([
        loadConfig(),
        loadProjectConfig(),
      ]);
      const loggedIn = !!(config?.server_url && config?.token);
      const hasProject = loggedIn && !!projectConfig;

      if (!loggedIn) {
        p.log.warn("Not logged in. Run " + chalk.cyan("evp login") + " or " + chalk.cyan("evp register") + " to get started.");
      } else if (!hasProject) {
        p.log.warn("No project linked. Run " + chalk.cyan("evp init") + " or " + chalk.cyan("evp link") + " to set up a project.");
      }

      const categories = buildCategories(loggedIn, hasProject);
      const hasMultiple = categories.length > 1;

      // Single category? Skip straight to its items
      let items: MenuItem[];
      if (!hasMultiple) {
        items = categories[0]!.items;
      } else {
        const category = await p.select({
          message: "What would you like to do?",
          options: [
            ...categories.map((c) => ({ value: c.value, label: c.label, hint: c.hint })),
            { value: "exit", label: "Exit", hint: "quit evp" },
          ],
        });
        handleCancel(category);
        if (category === "exit") {
          p.outro("Goodbye!");
          process.exit(0);
        }
        items = categories.find((c) => c.value === category)!.items;
      }

      const footer: MenuItem[] = [];
      if (hasMultiple) footer.push({ value: "__back__", label: "Back", hint: "return to menu" });
      footer.push({ value: "__exit__", label: "Exit", hint: "quit evp" });

      const selected = await p.select({
        message: "Select action",
        options: [...items, ...footer],
      });
      handleCancel(selected);

      if (selected === "__exit__") {
        p.outro("Goodbye!");
        process.exit(0);
      }
      if (selected === "__back__") {
        console.log();
        continue;
      }

      const cmd = await commands[selected as CmdKey]();
      await runCommand(cmd, { rawArgs: [] });

      if (selected === "logout") {
        p.outro("Logged out. Goodbye!");
        process.exit(0);
      }

      console.log();
    }
  },
});
