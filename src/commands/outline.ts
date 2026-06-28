import { loadConfig } from "../core/config.js";
import { buildOutlinePrompt, emitPrompt } from "../core/prompts.js";
import { maybeRunAgent } from "./run-agent.js";
import { log } from "../core/log.js";

export async function runOutline(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();

  if (!cfg.sources.length) {
    log.warn("No sources of truth are defined yet.");
    log.dim("  For a grounded outline, add them first — e.g.:");
    log.dim("    pal source add platform --type repo --description \"Core monorepo\" \\");
    log.dim("      --path sources/code/platform --link-base https://github.com/<org>/platform");
    log.dim("    pal source add wiki --type wiki --description \"Engineering wiki\"");
    log.info("");
  }

  const prompt = buildOutlinePrompt(cfg);
  emitPrompt(cfg, "outline", prompt, opts.print === true);

  if (await maybeRunAgent(cfg, prompt, "outline", opts)) return;

  log.info("");
  log.dim("The agent will propose a Parts→Sections outline and write it into");
  log.dim("palimpsest.config.json. Review it, then run `pal draft` to fill content.");
}
