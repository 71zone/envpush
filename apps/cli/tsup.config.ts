import { defineConfig } from "tsup";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
  noExternal: [/@envpush\/.*/],
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
