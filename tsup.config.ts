import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Emit a CLI shebang on the entry so `dist/cli.js` is directly executable.
  banner: { js: "#!/usr/bin/env node" },
});
