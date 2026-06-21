import fs from "node:fs";
import path from "node:path";
import { parse, HTMLElement } from "node-html-parser";
import type { ResolvedConfig } from "./config.js";

export type Level = "error" | "warn";
export interface Finding {
  file: string;
  level: Level;
  rule: string;
  message: string;
}

const IDENT_TYPES = new Set(["class", "method", "function", "module", "constant"]);
const BANNED_TAGS = ["section", "html", "head", "style", "script", "h1", "h2"];

/** Lint one section fragment's HTML. */
export function lintFragment(rel: string, html: string): Finding[] {
  const out: Finding[] = [];
  const add = (level: Level, rule: string, message: string) =>
    out.push({ file: rel, level, rule, message });

  const root = parse(html, { comment: true } as never);

  // R3 — fragments are body content only.
  for (const tag of BANNED_TAGS) {
    if (root.querySelector(tag)) add("error", "body-only", `contains a <${tag}> — fragments are body content only (no section head, html, style, script)`);
  }
  if (/<!--\s*(BEGIN|END) SECTION/i.test(html)) {
    add("error", "body-only", "contains BEGIN/END SECTION markers — those are generated, not authored");
  }

  // R1 — the lead.
  const firstEl = root.childNodes.find((n) => n instanceof HTMLElement) as HTMLElement | undefined;
  if (!firstEl) {
    add("warn", "lead", "fragment is empty");
  } else if (firstEl.tagName?.toLowerCase() !== "p" || !firstEl.classList.contains("lead")) {
    add("warn", "lead", "first element should be <p class=\"lead annotatable\">");
  }

  // R2 — annotatable on standalone <p> and panel bodies.
  for (const p of root.querySelectorAll("p")) {
    if (!p.classList.contains("annotatable")) {
      add("warn", "annotatable", `a <p> is missing class \"annotatable\": "${snippet(p.text)}"`);
    }
    // R8 — inline <code> soup.
    const codes = p.querySelectorAll("code").length;
    if (codes > 3) add("warn", "code-soup", `a <p> has ${codes} inline <code> spans — move them to a list/table/code block`);
  }
  for (const pb of root.querySelectorAll(".panel-body")) {
    if (!pb.classList.contains("annotatable")) add("warn", "annotatable", "a .panel-body is missing class \"annotatable\"");
  }

  // R4 — repo & identifier references.
  for (const a of root.querySelectorAll("a.gh-repo")) {
    const repo = a.getAttribute("data-repo");
    if (!repo) add("error", "gh-repo", "<a class=\"gh-repo\"> is missing data-repo");
    else if (repo.includes("/")) add("error", "gh-repo", `gh-repo data-repo="${repo}" must be a repo name only (repo-root links, never deep paths)`);
  }
  for (const a of root.querySelectorAll("a.ident")) {
    const type = a.getAttribute("data-type");
    if (type && !IDENT_TYPES.has(type)) add("error", "ident", `ident data-type="${type}" is invalid (use ${[...IDENT_TYPES].join(" | ")})`);
  }

  // R5 — no inline styles.
  for (const el of root.querySelectorAll("[style]")) {
    add("error", "no-inline-style", `<${el.tagName?.toLowerCase()}> has an inline style — use theme tokens / component classes`);
  }

  // R7 — heading hierarchy (no h4 without a preceding h3).
  let seenH3 = false;
  for (const h of root.querySelectorAll("h3, h4")) {
    const t = h.tagName?.toLowerCase();
    if (t === "h3") seenH3 = true;
    else if (t === "h4" && !seenH3) add("warn", "hierarchy", "an <h4> appears before any <h3> (don't skip heading levels)");
  }

  // R10 — empty diagrams.
  for (const m of root.querySelectorAll("pre.mermaid")) {
    if (!m.text.trim()) add("warn", "diagram", "an empty <pre class=\"mermaid\"> has no diagram source");
  }

  return out;
}

function snippet(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 50 ? t.slice(0, 50) + "…" : t;
}

/** Cross-check structure ↔ fragment files. */
export function lintStructure(cfg: ResolvedConfig): Finding[] {
  const out: Finding[] = [];
  const sectionsDir = path.join(cfg.projectRoot, "sections");
  const declared = new Set<string>();
  for (const p of cfg.structure) {
    for (const s of p.sections) {
      const name = `${s.num}-${s.slug}.html`;
      declared.add(name);
      if (!fs.existsSync(path.join(sectionsDir, name))) {
        out.push({ file: `sections/${name}`, level: "error", rule: "structure", message: `declared in structure but no fragment file exists` });
      }
    }
  }
  if (fs.existsSync(sectionsDir)) {
    for (const f of fs.readdirSync(sectionsDir)) {
      if (f.endsWith(".html") && !declared.has(f)) {
        out.push({ file: `sections/${f}`, level: "warn", rule: "structure", message: "fragment file is not referenced by any structure section" });
      }
    }
  }
  return out;
}

/** Run all lint rules over a project. */
export function validate(cfg: ResolvedConfig): Finding[] {
  const findings: Finding[] = [...lintStructure(cfg)];
  const sectionsDir = path.join(cfg.projectRoot, "sections");
  for (const p of cfg.structure) {
    for (const s of p.sections) {
      const rel = `sections/${s.num}-${s.slug}.html`;
      const file = path.join(sectionsDir, `${s.num}-${s.slug}.html`);
      if (fs.existsSync(file)) findings.push(...lintFragment(rel, fs.readFileSync(file, "utf8")));
    }
  }
  return findings;
}
