import fs from "node:fs";
import path from "node:path";
import { parse } from "node-html-parser";
import type { ResolvedConfig } from "./config.js";

/**
 * Link & reference health.
 *
 * A guide cites repos, code symbols, and sources of truth that drift over time —
 * a renamed repo, a moved file, a dead wiki URL. These rot silently because the
 * links are computed in the browser (gh-repo / ident anchors carry data-* attrs,
 * not hrefs) and never exercised at build time. `collectLinks` reconstructs every
 * URL the engine would render — mirroring engine.js exactly — and `checkLinks`
 * exercises them over the network.
 */

export type LinkKind = "repo" | "code" | "source" | "external";

export interface LinkTarget {
  url: string;
  kind: LinkKind;
  /** Where it appears: a section file, or "config" for source link bases. */
  file: string;
  /** Human label for reporting (repo name, symbol text, link text). */
  label: string;
}

export interface LinkResult extends LinkTarget {
  ok: boolean;
  status: number | null;
  error?: string;
}

const stripTrailingSlash = (s: string) => s.replace(/\/+$/, "");

/** Reconstruct every external URL the rendered guide points at. */
export function collectLinks(cfg: ResolvedConfig): LinkTarget[] {
  const base = stripTrailingSlash(cfg.repoLinkBase);
  const branch = cfg.links.repoBranch || "HEAD";
  const out: LinkTarget[] = [];
  const seen = new Set<string>();
  const add = (t: LinkTarget) => {
    const key = `${t.url}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  // Source link bases declared in config.
  for (const s of cfg.sources) {
    if (s.linkBase && /^https?:/i.test(s.linkBase)) {
      add({ url: s.linkBase, kind: "source", file: "config", label: `source: ${s.name}` });
    }
  }

  const sectionsDir = path.join(cfg.projectRoot, "sections");
  for (const p of cfg.structure) {
    for (const s of p.sections) {
      const rel = `sections/${s.num}-${s.slug}.html`;
      const file = path.join(sectionsDir, `${s.num}-${s.slug}.html`);
      if (!fs.existsSync(file)) continue;
      const root = parse(fs.readFileSync(file, "utf8"));

      // gh-repo: <repoBase>/<repo>  (repo-root only)
      for (const a of root.querySelectorAll("a.gh-repo")) {
        const repo = a.getAttribute("data-repo");
        if (repo) add({ url: `${base}/${repo}`, kind: "repo", file: rel, label: repo });
      }
      // ident: <repoBase>/<repo>[/blob/<branch>/<path>]
      for (const a of root.querySelectorAll("a.ident")) {
        const repo = a.getAttribute("data-repo");
        if (!repo) continue;
        const p2 = a.getAttribute("data-path");
        const br = a.getAttribute("data-branch") || branch;
        const url = `${base}/${repo}` + (p2 ? `/blob/${br}/${p2}` : "");
        add({ url, kind: "code", file: rel, label: a.text.trim() || repo });
      }
      // source citations + any absolute content links
      for (const a of root.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href") ?? "";
        if (!/^https?:/i.test(href)) continue;
        const kind: LinkKind = a.closest(".sources-data") ? "source" : "external";
        add({ url: href, kind, file: rel, label: a.text.trim() || href });
      }
    }
  }
  return out;
}

export interface CheckOptions {
  timeoutMs?: number;
  concurrency?: number;
  /** Skip deep code links (`…/blob/…`) — the most auth-sensitive, rot-prone kind. */
  skipCode?: boolean;
}

/** Probe each URL once. HEAD first, falling back to GET when HEAD is unsupported. */
export async function checkLinks(
  targets: LinkTarget[],
  opts: CheckOptions = {},
): Promise<LinkResult[]> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const concurrency = Math.max(1, opts.concurrency ?? 8);
  const work = opts.skipCode ? targets.filter((t) => t.kind !== "code") : targets.slice();
  const results: LinkResult[] = [];
  let i = 0;

  async function worker() {
    while (i < work.length) {
      const t = work[i++]!;
      results.push(await probe(t, timeoutMs));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, work.length) }, worker));
  // Preserve input order for stable reporting.
  const rank = new Map(work.map((t, idx) => [t.url, idx] as const));
  results.sort((a, b) => (rank.get(a.url)! - rank.get(b.url)!));
  return results;
}

async function probe(t: LinkTarget, timeoutMs: number): Promise<LinkResult> {
  const tryFetch = async (method: "HEAD" | "GET"): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(t.url, { method, redirect: "follow", signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let res = await tryFetch("HEAD");
    // Many servers reject HEAD (405/501) or gate it (403) — retry with GET.
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await tryFetch("GET");
    }
    return { ...t, ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch (e) {
    const err = e as Error;
    const error = err.name === "AbortError" ? `timeout after ${timeoutMs}ms` : err.message;
    return { ...t, ok: false, status: null, error };
  }
}
