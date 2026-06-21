import fs from "node:fs";
import path from "node:path";
import type { PartDef, SectionDef } from "./config.js";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Split a part label like "I — Orientation" into its kicker label and name. */
export function splitPart(part: string): { label: string; name: string } {
  const m = part.match(/^(.*?)\s*[—–-]\s*(.+)$/);
  if (m) return { label: m[1]!.trim(), name: m[2]!.trim() };
  return { label: "", name: part.trim() };
}

export interface AssembleResult {
  html: string;
  used: SectionDef[];
  missing: SectionDef[];
}

/** Render the ToC `<nav>` inner groups from the structure (empty parts skipped). */
export function renderToc(structure: PartDef[]): string {
  const groups = structure.filter((p) => p.sections.length > 0).map((p) => {
    const { label, name } = splitPart(p.part);
    const heading = label ? `${escapeHtml(label)} · ${escapeHtml(name)}` : escapeHtml(name);
    const links = p.sections
      .map(
        (s) =>
          `          <a href="#${s.slug}"><span class="num">${s.num}</span><span>${escapeHtml(
            s.title,
          )}</span></a>`,
      )
      .join("\n");
    return `        <div class="toc-group">\n          <div class="toc-group-label">${heading}</div>\n${links}\n        </div>`;
  });
  return groups.join("\n");
}

/**
 * Render the content column: a part divider per part, then each section's
 * scaffolding with its fragment injected between BEGIN/END SECTION markers.
 * A section whose fragment file is missing is left with empty body + reported.
 */
export function renderContent(
  structure: PartDef[],
  sectionsDir: string,
): AssembleResult {
  const used: SectionDef[] = [];
  const missing: SectionDef[] = [];
  const parts: string[] = [];

  for (const p of structure) {
    if (p.sections.length === 0) continue; // skip empty skeleton parts
    const { label, name } = splitPart(p.part);
    const kicker = label ? `Part ${escapeHtml(label)}` : "Part";
    parts.push(
      `          <div class="part-divider">\n            <div class="part-kicker">${kicker}</div>\n            <div class="part-name">${escapeHtml(
        name,
      )}</div>\n          </div>`,
    );

    for (const s of p.sections) {
      const file = path.join(sectionsDir, `${s.num}-${s.slug}.html`);
      let body = "";
      if (fs.existsSync(file)) {
        body = fs.readFileSync(file, "utf8").replace(/^\n+|\n+$/g, "");
        used.push(s);
      } else {
        missing.push(s);
      }
      const begin = `<!-- BEGIN SECTION ${s.num}: ${s.slug} -->`;
      const end = `<!-- END SECTION ${s.num}: ${s.slug} -->`;
      const inner = body ? `            ${begin}\n${body}\n          ${end}` : `            ${begin}\n          ${end}`;
      parts.push(
        `          <section id="${s.slug}" data-num="${s.num}" data-title="${escapeHtml(
          s.title,
        )}">\n            <div class="section-head"><span class="sec-num">${s.num}</span><h2>${escapeHtml(
          s.title,
        )}</h2></div>\n${inner}\n          </section>`,
      );
    }
  }

  return { html: parts.join("\n\n"), used, missing };
}
