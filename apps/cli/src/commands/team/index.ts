import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "team", description: "Team management" },
  subCommands: {
    create: () => import("./create.js").then((m) => m.default),
    join: () => import("./join.js").then((m) => m.default),
    members: () => import("./members.js").then((m) => m.default),
    "invite-code": () => import("./invite-code.js").then((m) => m.default),
  },
});
