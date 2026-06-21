import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // child-process pool so tests can process.chdir() into temp projects
    pool: "forks",
  },
});
