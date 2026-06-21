import path from "node:path";
import { loadConfig } from "../core/config.js";
import { build } from "../core/build.js";
import { log, pc } from "../core/log.js";

export async function runBuild(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  const result = build(cfg, {
    outDir: opts.out ? path.resolve(String(opts.out)) : undefined,
    inline: opts.inline === true,
    changelog: opts.changelog !== false,
    check: opts.check === true,
  });

  for (const w of result.warnings) log.warn(w);

  const dry = opts.check === true ? pc.dim("(dry run) ") : "";
  log.ok(
    `${dry}${opts.check ? "would build" : "built"} ${pc.bold(result.artifact)} ` +
      `· ${result.used.length} section(s) · ${result.version} · updated ${result.updated}`,
  );
  log.dim(`  ${result.outDir}`);
  for (const f of result.files) log.dim(`    ${f}`);
}
