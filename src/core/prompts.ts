import fs from "node:fs";
import path from "node:path";
import type { ResolvedConfig, SourceDef } from "./config.js";
import { copyToClipboard } from "./clipboard.js";
import { log, pc } from "./log.js";

function renderSources(sources: SourceDef[]): string {
  if (!sources.length) {
    return [
      "No sources of truth are defined yet. STRONGLY prefer adding them first with",
      "`pal source add` (one per authoritative source: code repos, wiki, help center)",
      "so this work is grounded in the real stack. If you proceed without them, base",
      "your work on a standard structure and clearly flag what needs org-specific",
      "grounding.",
    ].join("\n");
  }
  return sources
    .map((s) => {
      const meta = [s.path ? `local: ${s.path}` : "", s.linkBase ? `link: ${s.linkBase}` : ""].filter(Boolean).join("  ");
      const instr = s.instructions
        .split("\n")
        .map((l) => `      ${l}`)
        .join("\n");
      return `  - ${s.title || s.name} (${s.type}) — ${s.description}${meta ? `\n      ${meta}` : ""}\n${instr}`;
    })
    .join("\n");
}

function flatSections(cfg: ResolvedConfig): { num: number; slug: string; title: string }[] {
  return cfg.structure.flatMap((p) => p.sections).sort((a, b) => a.num - b.num);
}

/** Prompt: have an agent read the sources and propose + apply a section outline. */
export function buildOutlinePrompt(cfg: ResolvedConfig): string {
  return `You are working in "${cfg.title}" (project ${cfg.name}) — a palimpsest engineering
guide. Propose and apply an initial SECTION OUTLINE tailored to ${cfg.org.name}'s
actual engineering and tech stack.

HOW THIS GUIDE WORKS
- Structure lives in palimpsest.config.json under "structure" (Parts → Sections).
- Content lives in sections/<num>-<slug>.html (one fragment per section).
- \`pal build\` assembles it. House conventions are in ${cfg.suggest.conventionsDoc}.

SOURCES OF TRUTH (read these to ground the outline in the REAL stack):
${renderSources(cfg.sources)}

DO THIS
1. Explore the sources — grep the code repos, skim the wiki/help — to learn
   ${cfg.org.name}'s architecture, services, languages, and processes.
2. Propose an outline as Parts → Sections. A strong engineering guide typically
   covers, and you should ADAPT to what the sources actually show:
     • Orientation — what the org/product is; architecture at a glance.
     • Building — service catalog, core domain & data model, local development,
       per-stack development (one section per major language/service as warranted),
       authentication/authorization, supporting services.
     • Shipping — engineering standards, testing, source control & PRs, release.
     • Supporting & Maintaining — observability, incident response, triage,
       data/reporting, feature flags, security.
     • Reference — glossary, key links, changelog.
   Drop sections that don't apply, add stack-specific ones, and NAME them for
   ${cfg.org.name}'s real systems. Aim for ~15–25 sections. The project already
   scaffolds these five Parts in palimpsest.config.json — keep them (rename only
   if clearly warranted) and distribute your sections across them.
3. APPLY it: edit palimpsest.config.json "structure" to your proposed parts and
   sections. Each section needs: num (1..N in global reading order), slug
   (kebab-case), title. For every section create sections/<num>-<slug>.html with a
   single placeholder lead:  <p class="lead annotatable">TODO: &lt;title&gt;.</p>
4. Run \`pal build\` and confirm it builds with no errors (a clean run, just the
   expected "TODO" placeholders). Then summarize the outline you chose and WHY,
   and ask me to review it before I run \`pal draft\` to write the real content.

Keep the outline grounded in the sources — don't invent systems that don't exist.`;
}

/** Prompt: have an agent write the baseline content for every section. */
export function buildDraftPrompt(cfg: ResolvedConfig): string {
  const sections = flatSections(cfg);
  const list = sections.length
    ? sections.map((s) => `  - ${s.num}. ${s.title}  →  sections/${s.num}-${s.slug}.html`).join("\n")
    : "  (no sections defined yet — run `pal outline` first, or add them with `pal section add`)";

  return `You are working in "${cfg.title}" (project ${cfg.name}) — a palimpsest engineering
guide. Write the BASELINE CONTENT for every section, grounded entirely in the
sources of truth. This is a large, high-stakes authoring task: use MAXIMUM effort.

USE WORKFLOWS AND SUBAGENTS.
If you are Claude Code, author a Workflow that fans out subagents across these
PHASES, and run every agent at the highest reasoning effort:
  1. RESEARCH  — one subagent per section gathers facts from the sources (grep the
     repos, read the wiki/help). Output: a per-section research brief of VERIFIED
     facts with citations. Never invent; explicitly mark unknowns.
  2. GENERATE  — one subagent per section drafts sections/<num>-<slug>.html from
     its brief, strictly following the house style in ${cfg.suggest.conventionsDoc}.
  3. SYNTHESIZE — reconcile across sections: consistent terminology, no
     duplication, a coherent glossary, working cross-references, sensible reading
     order. Write the final fragments.
  4. AUDIT — adversarially verify EVERY factual claim against the sources; run
     \`pal validate\` and \`pal build\`; fix every error and house-style violation.
     Loop until validate is clean and the content is accurate.
If your harness has no workflow engine, run parallel subagents per section through
the same four phases; at minimum, work section-by-section at maximum effort.

SOURCES OF TRUTH (the ONLY basis for factual claims — read them, do not guess):
${renderSources(cfg.sources)}

HOUSE STYLE (read ${cfg.suggest.conventionsDoc} in full and obey it)
- Write to be SCANNED: short paragraphs (2–4 sentences), lists/tables/<dl> over
  prose, bold lead-ins for steps. Lead with the answer.
- First element of every fragment: <p class="lead annotatable">. Every other
  standalone <p> and every .panel-body: class="annotatable".
- Repos: <a class="gh-repo" data-repo="REPO"></a> (repo-root links only, never
  deep file links). Code symbols: <a class="ident" data-type="class|method|module|
  constant" data-repo="REPO" data-path="path">Name</a> (omit data-path unless you
  verified it).
- Use panels (info/tip/warning/danger), Mermaid diagrams inside .canvas, and
  .codeblock for code. No inline styles, no new colors/fonts. Fragments are body
  content only (no <section>, no <h2> section head, no <html>/<style>/<script>).

SECTIONS TO WRITE (${sections.length}):
${list}

DELIVERABLE
Every sections/*.html filled with accurate, source-grounded, scannable content;
\`pal validate\` clean; \`pal build\` succeeds. Append concise \`changelog/CHANGELOG.md\`
entries for the work. Finally, summarize what you wrote and list any facts you
could NOT verify from the sources (so I can add a source or correct them).`;
}

/** Copy a generated prompt to the clipboard, save a copy, and print instructions. */
export function emitPrompt(cfg: ResolvedConfig, slug: string, prompt: string, alsoPrint: boolean): void {
  const copied = copyToClipboard(prompt);
  const dir = path.join(cfg.projectRoot, ".palimpsest");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}-prompt.md`);
  fs.writeFileSync(file, prompt + "\n");

  if (copied) log.ok("Prompt copied to your clipboard.");
  else log.warn("Could not access the clipboard — copy the prompt from the file below.");
  log.info(`${pc.bold("Paste it into an agent running in this directory:")} ${pc.dim(cfg.projectRoot)}`);
  log.dim(`  saved to ${path.relative(cfg.projectRoot, file)}`);
  if (alsoPrint) {
    log.info("");
    log.info(prompt);
  }
}
