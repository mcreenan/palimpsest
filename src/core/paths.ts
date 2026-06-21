import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

/**
 * Resolve the installed palimpsest package root — the directory that contains
 * the shipped `engine/` and `templates/` asset trees. At runtime this file is
 * bundled to `dist/cli.js`, so the package root is one level up from `dist/`.
 * We walk upward to tolerate differing bundle layouts and `vitest` (src) runs.
 */
export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    if (
      fs.existsSync(path.join(dir, "engine", "template.html")) &&
      fs.existsSync(path.join(dir, "package.json"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fall back to the dist/.. assumption.
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

export function engineDir(): string {
  return path.join(packageRoot(), "engine");
}

export function templatesDir(): string {
  return path.join(packageRoot(), "templates");
}

export const CONFIG_FILENAME = "palimpsest.config.json";

/** Walk up from `start` looking for a palimpsest.config.json. */
export function findProjectRoot(start: string = process.cwd()): string | null {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, CONFIG_FILENAME))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
