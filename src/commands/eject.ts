import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../core/config.js";
import { engineDir, CONFIG_FILENAME } from "../core/paths.js";
import { log, pc } from "../core/log.js";

export async function runEject(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  const target = path.join(cfg.projectRoot, "engine");

  if (fs.existsSync(target) && opts.force !== true) {
    throw new Error(`${target} already exists. Re-run with --force to overwrite.`);
  }

  fs.cpSync(engineDir(), target, { recursive: true });

  // Point the config at the local engine so future builds use it.
  const configPath = path.join(cfg.projectRoot, CONFIG_FILENAME);
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
  raw.engine = "./engine";
  fs.writeFileSync(configPath, JSON.stringify(raw, null, 2) + "\n");

  log.ok(`Ejected the engine to ${pc.bold("engine/")}`);
  log.dim("  Builds now use your local engine. Edit engine/{template.html,engine.css,engine.js}.");
  log.dim("  Note: ejected projects no longer receive engine updates via `npm update palimpsest`.");
}
