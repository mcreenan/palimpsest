import { loadConfig } from "../core/config.js";
import { validate } from "../core/validate.js";
import { log, pc } from "../core/log.js";

export async function runValidate(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  const findings = validate(cfg);

  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");

  for (const f of findings) {
    if (opts.quiet && f.level !== "error") continue;
    const tag = f.level === "error" ? pc.red("error") : pc.yellow("warn ");
    log.info(`${tag} ${pc.dim(f.file)} ${pc.dim(`[${f.rule}]`)} ${f.message}`);
  }

  if (!findings.length) {
    log.ok("validate: no issues");
    return;
  }
  log.info("");
  const summary = `${errors.length} error(s), ${warns.length} warning(s)`;
  if (errors.length) {
    log.error(`validate: ${summary}`);
    process.exit(1);
  }
  log.warn(`validate: ${summary}`);
}
