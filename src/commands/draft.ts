import { loadConfig } from "../core/config.js";
import { buildDraftPrompt, emitPrompt } from "../core/prompts.js";
import { maybeRunAgent } from "./run-agent.js";
import { log } from "../core/log.js";

export async function runDraft(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();

  if (!cfg.structure.length) {
    log.warn("No sections are defined yet — run `pal outline` (or `pal section add`) first.");
  }
  if (!cfg.sources.length) {
    log.warn("No sources of truth are defined — content can't be grounded. Add them with `pal source add`.");
    log.info("");
  }

  const prompt = buildDraftPrompt(cfg);
  emitPrompt(cfg, "draft", prompt, opts.print === true);

  if (await maybeRunAgent(cfg, prompt, "draft", opts)) return;

  log.info("");
  log.dim("The prompt tells the agent to use a Workflow (Research → Generate →");
  log.dim("Synthesize → Audit) with subagents at max effort. Run it in this repo,");
  log.dim("then review with `pal validate` and `pal dev`.");
}
