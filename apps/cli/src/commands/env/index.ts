import { defineCommand } from "citty";

export default defineCommand({
  meta: { name: "env", description: "Environment management" },
  subCommands: {
    list: () => import("./list.js").then((m) => m.default),
    switch: () => import("./switch.js").then((m) => m.default),
    create: () => import("./create.js").then((m) => m.default),
  },
});
