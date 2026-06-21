import fs from "node:fs";
import path from "node:path";
import type { SourceDef } from "./config.js";

export const SOURCES_START = "<!-- pal:sources:start -->";
export const SOURCES_END = "<!-- pal:sources:end -->";

export interface InstructionInput {
  name: string;
  title?: string;
  path?: string;
  linkBase?: string;
}

/** Seed agent instructions for a source type. Editable after generation. */
export function defaultInstructions(type: SourceDef["type"], i: InstructionInput): string {
  const grepPath = i.path || `sources/${type === "help" || type === "wiki" ? "docs" : "code"}/${i.name}`;
  const link = i.linkBase || "<link base>";
  switch (type) {
    case "wiki":
      return [
        "Canonical for architecture decisions (ADRs), runbooks, and engineering process.",
        i.path
          ? `- Local checkout: \`${grepPath}\` — search the page source (Markdown) before asserting anything.`
          : "- Search the wiki for relevant pages before asserting anything; then read the page's CURRENT content.",
        "- Cite pages by title (and link them when a URL is available). The guide summarises these pages; never contradict them.",
        "- On conflict: update the wiki page first, then the guide.",
      ].join("\n");
    case "confluence":
      return [
        "Capabilities: search, get-content.",
        "- Search: query the Confluence search tool/CLI for relevant pages before asserting anything.",
        "- Get content: fetch a page by id (or title) and read its CURRENT content.",
        "- Cite pages by title + id. The guide summarises these pages; never contradict them.",
        "- On conflict: update the Confluence page first, then the guide.",
      ].join("\n");
    case "repo":
      return [
        "Authoritative for how the system actually behaves (the code is the source of truth).",
        `- Local checkout: \`${grepPath}\` — grep/read it to verify behavior.`,
        `- Freshness: confirm the clone is current (\`git -C ${grepPath} log -1 --format=%cr\`) before trusting an absence.`,
        `- Link in the guide as <a class="gh-repo" data-repo="${i.name}"></a>; deep references resolve under ${link}. Repo-root links only.`,
      ].join("\n");
    case "help":
      return [
        "Authoritative for product-facing behavior (help/marketing content).",
        `- Local checkout: \`${grepPath}\` — search the article source (e.g. Astro/Markdown content).`,
        `- Cite the published article URL under ${link}.`,
        "- On conflict: update the help article first, then the guide.",
      ].join("\n");
    case "custom":
      return [
        `${i.title || i.name} is an authoritative source. Describe here how an agent should query it`,
        "and how to cite it. The guide summarises it and must never contradict it.",
      ].join("\n");
  }
}

function renderSource(s: SourceDef): string {
  const heading = `#### ${s.title || s.name} (${s.type})`;
  const lines = [heading, "", s.description, "", s.instructions];
  const meta: string[] = [];
  if (s.path) meta.push(`- Local path: \`${s.path}\``);
  if (s.linkBase) meta.push(`- Links: ${s.linkBase}`);
  if (meta.length) lines.push("", ...meta);
  return lines.join("\n");
}

/** The content that lives between the AGENTS.md source markers. */
export function renderSourcesBlock(sources: SourceDef[]): string {
  if (!sources.length) {
    return "_No sources defined yet. Add them with `pal source add`._";
  }
  return sources.map(renderSource).join("\n\n");
}

/** A one-line summary for the in-page Suggest prompt (window.__PAL__.sourcesOfTruth). */
export function sourcesSummary(sources: SourceDef[]): string | undefined {
  if (!sources.length) return undefined;
  const parts = sources.map((s) => `${s.title || s.name} (${s.type})`);
  return `${joinList(parts)} — see AGENTS.md "Sources of truth" for how to query and cite each.`;
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Write the rendered sources into AGENTS.md, replacing the managed block between
 * the markers (or appending a "Sources of truth" section if the markers are gone).
 */
export function applySourcesToAgents(projectRoot: string, sources: SourceDef[], conventionsDoc = "AGENTS.md"): void {
  const file = path.join(projectRoot, conventionsDoc);
  if (!fs.existsSync(file)) return;
  const md = fs.readFileSync(file, "utf8");
  const block = `${SOURCES_START}\n${renderSourcesBlock(sources)}\n${SOURCES_END}`;

  const start = md.indexOf(SOURCES_START);
  const end = md.indexOf(SOURCES_END);
  let next: string;
  if (start !== -1 && end !== -1 && end > start) {
    next = md.slice(0, start) + block + md.slice(end + SOURCES_END.length);
  } else {
    next = md.replace(/\s*$/, "") + `\n\n## Sources of truth\n\n${block}\n`;
  }
  fs.writeFileSync(file, next);
}
