import { spawn } from "node:child_process";
import type { ResolvedConfig } from "./config.js";

/**
 * Run a generated prompt through an agent, end-to-end.
 *
 * `pal outline`/`pal draft` produce prompts written for an agentic harness — the
 * agent must read the sources of truth (grep repos, skim the wiki), write the
 * section fragments, and run `pal build`/`pal validate`. A single LLM API call
 * can't do that: it has no filesystem and no tools. So `--run` hands the prompt
 * to a coding-agent CLI already installed locally (Claude Code by default),
 * launched in the project directory with stdio inherited so the user watches —
 * and can steer — the work. This replaces the copy/paste-into-an-agent step
 * without embedding an agent runtime in palimpsest.
 */

export interface RunAgentOptions {
  /** Agent CLI to launch. Defaults to $PAL_AGENT or "claude" (Claude Code). */
  agent?: string;
  /** Headless: pass the prompt via `-p` (print mode) instead of interactively. */
  headless?: boolean;
}

export function resolveAgentCommand(opts: RunAgentOptions): string {
  return opts.agent || process.env.PAL_AGENT || "claude";
}

/**
 * Launch the agent with the prompt in the project directory. Resolves with the
 * child's exit code; rejects only if the command can't be spawned (e.g. not
 * installed), so callers can print an actionable hint.
 */
export function runAgentWithPrompt(
  cfg: ResolvedConfig,
  prompt: string,
  opts: RunAgentOptions,
): Promise<number> {
  const cmd = resolveAgentCommand(opts);
  // Interactive by default so the user can watch/steer the long workflow;
  // `-p` runs Claude Code headless (one-shot print mode).
  const args = opts.headless ? ["-p", prompt] : [prompt];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: cfg.projectRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 0));
  });
}
