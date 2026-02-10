import { defineCommand } from "citty";

export const main = defineCommand({
  meta: {
    name: "evp",
    version: "0.1.0",
    description: "Self-hosted environment variable manager",
  },
  subCommands: {
    // Auth
    register: () => import("./auth/register.js").then((m) => m.default),
    login: () => import("./auth/login.js").then((m) => m.default),
    logout: () => import("./auth/logout.js").then((m) => m.default),
    whoami: () => import("./auth/whoami.js").then((m) => m.default),

    // Teams
    team: () => import("./team/index.js").then((m) => m.default),

    // Project setup
    init: () => import("./project/init.js").then((m) => m.default),
    link: () => import("./project/link.js").then((m) => m.default),

    // Environments
    env: () => import("./env/index.js").then((m) => m.default),

    // Secrets
    pull: () => import("./secrets/pull.js").then((m) => m.default),
    push: () => import("./secrets/push.js").then((m) => m.default),
    set: () => import("./secrets/set.js").then((m) => m.default),
    unset: () => import("./secrets/unset.js").then((m) => m.default),
    list: () => import("./secrets/list.js").then((m) => m.default),
    diff: () => import("./secrets/diff.js").then((m) => m.default),
  },
});
