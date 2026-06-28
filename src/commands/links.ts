import { loadConfig } from "../core/config.js";
import { collectLinks, checkLinks, type LinkResult, type LinkKind } from "../core/links.js";
import { log, pc } from "../core/log.js";

const KIND_LABEL: Record<LinkKind, string> = {
  repo: "repo",
  code: "code",
  source: "src ",
  external: "ext ",
};

export async function runLinks(opts: Record<string, unknown>): Promise<void> {
  const cfg = loadConfig();
  const targets = collectLinks(cfg);

  if (!targets.length) {
    log.ok("links: no external repo, code, or source links to check");
    return;
  }

  // --offline / --list: inventory the targets without touching the network.
  if (opts.offline || opts.list) {
    log.info(pc.bold(`${targets.length} link target(s):`));
    for (const t of targets) {
      log.info(`  ${pc.dim("[" + KIND_LABEL[t.kind] + "]")} ${t.url} ${pc.dim("← " + t.file)}`);
    }
    log.ok(`${targets.length} target(s) collected (offline — not probed).`);
    return;
  }

  log.step(`Checking ${targets.length} link(s)…`);
  const results = await checkLinks(targets, {
    timeoutMs: numOpt(opts.timeout, 10) * 1000,
    concurrency: numOpt(opts.concurrency, 8),
    skipCode: Boolean(opts.skipCode),
  });

  const broken = results.filter((r) => !r.ok);
  for (const r of results) {
    if (opts.quiet && r.ok) continue;
    line(r);
  }

  log.info("");
  if (!broken.length) {
    log.ok(`links: all ${results.length} reachable`);
    return;
  }
  log.error(`links: ${broken.length}/${results.length} unreachable`);
  log.dim("  Note: private/auth-gated hosts can report 403/404 even when valid — use --skip-code or fix the reference.");
  process.exit(1);
}

function line(r: LinkResult): void {
  const tag = r.ok ? pc.green("ok  ") : pc.red("FAIL");
  const status = r.status !== null ? String(r.status) : r.error ?? "error";
  const detail = r.ok ? pc.dim(status) : pc.red(status);
  log.info(`${tag} ${pc.dim("[" + KIND_LABEL[r.kind] + "]")} ${r.url} ${detail} ${pc.dim("← " + r.file)}`);
}

function numOpt(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
