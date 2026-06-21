# AGENTS.md — {{TITLE}}

Guidance for people and agents working in this repo. This guide is a
**palimpsest** project: a self-contained, living HTML handbook built from source.
Follow these conventions or you'll break the build or the house style.

## 1. The guide is BUILT — never hand-edit the HTML

- The generated artifact (`{{ARTIFACT}}`) is **overwritten on every build.** Editing
  it directly is wasted work.
- **Content** lives in `sections/<n>-<slug>.html` — one HTML fragment per section.
- **Structure** (parts, sections, order, titles) lives in `palimpsest.config.json`
  under `structure`. The table of contents and section scaffolding are generated
  from it.
- **Design** (colors, fonts, spacing) lives in `theme/tokens.css` — semantic
  tokens the engine renders from. The page shell, components, and interactive
  behavior come from the palimpsest engine (run `pal eject` to take ownership).
- After any change: **`{{BUILD}}`** reassembles the artifact.
- Preview live with **`pal dev`** (watches sources, rebuilds, reloads).

## 2. Write to be SCANNED, not read

The #1 quality bar: **no dense prose.** If a paragraph lists several things, you're
doing it wrong. Instead:

- 3+ parallel facts/items → a `<ul>`/`<ol>`, a `<dl>`, or a small table.
- Steps/sequences → bold lead-ins: `<strong>Declare.</strong> Run …`.
- Keep paragraphs to **2–4 sentences**. Lead with the answer. No marketing fluff.
- Long/complex section → a short "In short" `<ul>` right after the lead.

**HARD RULE — no inline-`<code>` soup.** If a paragraph has more than ~3 inline
`<code>` spans, it's a structure dump in disguise — move it to a table, a `<dl>`,
or a code block (`.codeblock`). Keep inline `<code>` for the one identifier a
sentence is actually about.

## 3. Hierarchy

`Part → Section (h2) → Subsection (h3) → Sub-subsection (h4)`. Use **h4** to break
a long multi-topic h3 into labeled parts. Never skip a level (no h4 without an h3).
The section's `<h2>` and number are generated — a fragment is **body content only**:
no `<section>`, no `<h2>` section head, no `BEGIN/END SECTION` markers, no
`<html>`/`<style>`/`<script>`.

## 4. Content conventions (in fragments)

- First element is `<p class="lead annotatable">`. Every other standalone `<p>`
  and every `.panel-body` gets `class="annotatable"` (powers the Suggest feature).
- **Repo names are links, never monospace.** Write a Git repo as
  `<a class="gh-repo" data-repo="REPO"></a>` — the engine renders it as a link to
  `{{REPO_LINK_BASE}}/REPO` with a GitHub icon. Repo-root links only — **never**
  deep file/line links.
- **Code identifiers** (class / function / module / constant) are linked, not
  `<code>`: `<a class="ident" data-type="class|method|module|constant"
  data-repo="REPO" data-path="path/to/file">Name</a>`. `data-path` is optional —
  omit it (links to the repo root) and **never guess a path**. Plain `<code>` is
  still right for file paths, shell commands, config keys, enum values, and URLs.
- **Panels:** `panel info|tip|warning|danger` (copy an existing one's icon SVG).
- **Diagrams:** Mermaid inside a `.canvas` (`<pre class="mermaid">…</pre>` in a
  `.canvas-stage`). Mermaid is themed globally from your tokens — **don't** theme
  per-diagram or hand-author SVG. Short node labels; `<br/>` for line breaks.
- **Sources:** a leaf content unit may carry a hidden
  `<div class="sources-data" hidden>…links…</div>` right after its `<h3>`; the
  engine adds a "Sources" button that lists them.
- **No** inline styles, new colors, font sizes, or off-grid spacing. Everything
  comes from `theme/tokens.css`. Validate with **`pal validate`**.

## 5. Accuracy & the source of truth

This guide **summarises** authoritative sources; it must never contradict them.
Manage your sources of truth with **`pal source add|list|remove`** — they're
recorded in `palimpsest.config.json` and codified into the managed block below
(and surfaced in the in-page Suggest prompt). State only what the sources support;
if unsure, hedge or omit. Point-in-time facts (counts, versions, ports) drift —
keep them minimal and verifiable.

### Sources of truth

<!-- pal:sources:start -->
_No sources defined yet. Add them with `pal source add`._
<!-- pal:sources:end -->

> The block above is generated from `palimpsest.config.json`. Edit a source's
> wording with `pal source add`/your config, not by hand here.

## 6. Suggestions & history

The in-page **"Suggest a change"** feature generates a ready-to-paste agent
prompt. The flow it asks for:

**Check the change against the source of truth FIRST.** If the suggestion
conflicts with a source, **STOP** — do not edit the guide. Record it in
`changelog/` as `blocked — conflicts with source`, then tell the user which source
to update first. The guide is updated only after the source is. (Pure
wording/structure/clarity edits that change no fact are exempt.)

When a suggestion is consistent with the sources: **(1)** log it in
`changelog/CHANGELOG.md` (status `applied`) with an ISO timestamp, **(2)** edit the
named `sections/<n>-<slug>.html` fragment, **(3)** rebuild with `{{BUILD}}`.

## 7. Publishing

Deploy the built bundle with **`pal publish`** (configure the target under
`publish` in `palimpsest.config.json`). It rebuilds, rewrites asset paths for the
deploy location, and uploads the bundle (HTML + css/js + vendored Mermaid +
changelog). Don't upload by hand — the bundle layout matters.
