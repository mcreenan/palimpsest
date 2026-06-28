import type { ResolvedConfig } from "../core/config.js";
import { runAgentWithPrompt, resolveAgentCommand, type RunAgentOptions } from "../core/agent.js";
import { log, pc } from "../core/log.js";

/**
 * If `--run` was passed, launch the prompt through a local agent CLI and return
 * true (the caller should stop — the agent takes over). Otherwise return false
 * so the caller prints its usual "paste this into an agent" guidance.
 */
export async function maybeRunAgent(
  cfg: ResolvedConfig,
  prompt: string,
  label: "outline" | "draft",
  opts: Record<string, unknown>,
): Promise<boolean> {
  if (!opts.run) return false;

  const runOpts: RunAgentOptions = {
    agent: typeof opts.agent === "string" ? opts.agent : undefined,
    headless: opts.headless === true,
  };
  const cmd = resolveAgentCommand(runOpts);

  log.info("");
  log.step(`Launching ${pc.bold(cmd)} in ${pc.dim(cfg.projectRoot)} to run the ${label}…`);
  log.dim(`  (the prompt is also saved under .palimpsest/${label}-prompt.md)`);
  log.info("");

  try {
    const code = await runAgentWithPrompt(cfg, prompt, runOpts);
    if (code !== 0) log.warn(`${cmd} exited with code ${code}.`);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      log.error(`Could not launch "${cmd}" — is it installed and on your PATH?`);
      log.dim("  Use --agent <command> to pick a different agent (e.g. --agent codex),");
      log.dim("  set PAL_AGENT, or omit --run and paste the saved prompt manually.");
    } else {
      log.error(`Failed to launch "${cmd}": ${err.message}`);
    }
  }
  return true;
}
