# palimpsest

[![npm](https://img.shields.io/npm/v/@kelotenic/palimpsest)](https://www.npmjs.com/package/@kelotenic/palimpsest)

A starter kit and toolchain for building an organization's **engineering guide** —
a self-contained, living HTML handbook assembled from source. palimpsest ships the
whole interactive engine (a minimal, restyleable design system, two-level scrollspy
ToC, zoomable/fullscreen Mermaid diagrams, linked repo & code references, and an
in-page **"Suggest a change"** flow); your project supplies only **config + theme
tokens + content**.

```bash
# install once, then run `pal` anywhere:
npm install -g @kelotenic/palimpsest
pal init                              # scaffold a new guide (interactive wizard)
pal demo                              # ...or a fully-worked example you can open immediately

# prefer not to install? run it straight from npm:
npx @kelotenic/palimpsest@latest       # same scaffold wizard
npx @kelotenic/palimpsest@latest demo  # the demo
```

## The workflow

palimpsest does the scaffolding and the busywork; an agent does the writing. The
intended path from empty project to published guide:

```bash
npx @kelotenic/palimpsest@latest       # 1. SCAFFOLD — creates a thin project + first build
cd my-org-engineering-guide

pal source add <name> --type repo …   # 2. SOURCES — register your sources of truth FIRST
                                      #    (code repos, wiki, help center — one each).
                                      #    Everything below is grounded in these.

pal outline                           # 3. OUTLINE — generates a prompt; paste it into an
                                      #    agent here → it proposes your section structure.
                                      #    Review the result before moving on.

pal draft                             # 4. DRAFT — generates a prompt; paste it into an
                                      #    agent here → it writes the content via a Workflow
                                      #    (research → generate → synthesize → audit).

pal validate                          # 5. REVIEW — lint the house style; fix any issues.
pal dev                               #    live-preview as you iterate.

pal publish                           # 6. SHIP — deploy the bundle (S3 / GitHub Pages).
```

**Steps 3 and 4 don't call an LLM themselves.** They build a thorough prompt, copy
it to your clipboard, and tell you to paste it into an agent running in the
project (saved under `.palimpsest/` too). Register sources **before** `pal outline`
and `pal draft` so the agent grounds the guide in your real stack.

Prefer to write by hand? Skip 3–4: use `pal section add` to build the structure and
edit `sections/*.html` yourself. `pal dev` reloads as you go.

### Try it without your own sources

```bash
npx @kelotenic/palimpsest@latest demo            # does steps 1–2 for you (init + sample sources)
cd palimpsest-demo
pal outline   →   pal draft   →   pal dev
```

`pal demo` scaffolds a project with a branded theme and a full set of **sources of
truth already wired up and populated with sample material** (detailed under
[Sources of truth](#sources-of-truth) below). You then run the same
`outline → draft → preview` workflow against them — the fastest way to see the
whole thing end to end.

## How it works

A generated project is intentionally thin:

```
my-org-engineering-guide/
  palimpsest.config.json   project config + structure (parts → sections → ToC)
  theme/tokens.css         semantic design tokens the look is rendered from
  sections/*.html          one content fragment per section (the source of truth)
  changelog/CHANGELOG.md    edit history → version stamp + changelog.html
  AGENTS.md  CLAUDE.md      house style + build contract (read by the Suggest flow)
```

`pal init` seeds `structure` with the five standard parts — Orientation, Building,
Shipping, Supporting and Maintaining, References — as an empty skeleton to fill
(empty parts aren't rendered until they have sections).

`pal build` composes the palimpsest **engine** (shipped in this package) with your
config, theme, and content into a deployable bundle: the guide HTML, its css/js,
the vendored Mermaid library, and `changelog.html`. The engine improves with
`npm update @kelotenic/palimpsest`; run `pal eject` to copy it into your project and own it.

## Commands

| Command | What it does |
| --- | --- |
| `pal init [name]` | Scaffold a new guide (the default when run with no command). |
| `pal demo` | Scaffold a fully-featured demo (branded theme + sources + content). |
| `pal outline` | Generate an agent prompt that reads your sources and proposes a section outline. |
| `pal draft` | Generate an agent prompt that writes baseline content (Claude Code Workflow: research → generate → synthesize → audit). |
| `pal build` | Build the artifact bundle. `--inline` for a single file, `--check` for a dry run. |
| `pal dev` | Build, serve, and live-reload on change. |
| `pal section add/list/remove` | Manage sections + their fragment files (handles numbering). |
| `pal source add/list/remove` | Manage sources of truth — codified into `AGENTS.md` and the Suggest prompt. |
| `pal theme import <file>` | Map an org's CSS / design-tokens file onto palimpsest's semantic slots and derive the rest. Also `sync` and `check`. |
| `pal validate` | Lint section sources against the house-style rules (`AGENTS.md`). |
| `pal publish` | Build and deploy the bundle (`s3` or `gh-pages`). `--check` to preview. |
| `pal eject` | Copy the engine into the project for full customization. |

## Sources of truth

Engineering guides summarise authoritative sources — code, wikis, help centers.
Register them so the Suggest flow knows what to check against:

```bash
pal source add platform --type repo \
  --description "Core monorepo" --path sources/code/platform \
  --link-base https://github.com/acme/platform
pal source add wiki --type wiki --description "Engineering wiki"
```

Each source carries agent instructions (seeded per type: `repo` → grep a local
checkout + link on GitHub; `wiki` → search + get-content (a local checkout or an
API wrapped as CLI scripts); `confluence` → search + get-content; `help` → search
article content). Sources are recorded in `palimpsest.config.json`, codified into
a managed block in `AGENTS.md`, and summarized into the in-page Suggest prompt.
`repo`/`help`/`wiki` sources default to gitignored `sources/code/` and
`sources/docs/` directories to clone local material into.

Try `pal demo` to scaffold a complete example: a branded theme plus five mutually
consistent sources — three code repos (`platform` backend, `web` frontend, `infra`),
an engineering wiki, and a help center. The wiki demonstrates how to wrap a source
with no local checkout as small CLI scripts (`source-scripts/wiki-search`,
`wiki-get-article`) that an agent calls — copy the pattern for your own systems.

## Adopting your design system

A design system is **optional** — palimpsest ships a deliberately minimal, neutral
theme (one accent, strong system typography, generous spacing) that looks good out
of the box. When you do have a brand, point palimpsest at an existing stylesheet or
token file:

```bash
pal theme import ./brand/tokens.css       # maps --brand-primary → --accent, etc.
pal theme check                            # see which slots are set vs. derived
```

palimpsest maps recognizable brand variables onto its semantic token contract,
derives everything it can (hover states, surfaces, the Mermaid diagram theme), and
only leaves you to confirm the genuine primaries — so a whole guide gets restyled
without hand-editing tokens.

### Logo

`pal init` asks for an organization logo (or pass `--logo`). Three forms are
accepted:

```bash
pal init --logo https://acme.com/logo.svg     # an image URL — downloaded into the bundle
pal init --logo ./brand/logo.png              # a file path — copied into the bundle
pal init --logo '<svg …>…</svg>'              # raw SVG markup — inlined into the header
```

The logo lands in `assets/` (set as `brand.logo` in config). SVG is inlined into
the header; raster images (png/jpg/…) are copied into the published bundle and
referenced with `<img>`, and resolve correctly under any deploy path.

## The "Suggest a change" loop

Every paragraph, table, list, and diagram in the built guide carries a suggestion
trigger. It generates a ready-to-paste prompt for an agent running in the repo:
the agent checks the suggestion against your sources of truth, records it in the
changelog, edits the named `sections/*.html` fragment, and rebuilds — or, if the
change conflicts with a source, stops and tells you which source to update first.

## Development

```bash
npm install
npm run build       # bundle the CLI to dist/
npm test            # vitest
npm run typecheck
```

The package contains three trees: `src/` (CLI + build core), `engine/` (the shipped
page shell, CSS, JS, and vendored Mermaid), and `templates/` (project scaffolding).

## License

palimpsest is licensed under the [Common Public Attribution License 1.0](LICENSE)
(CPAL-1.0). You're free to use, modify, and distribute it. Because the engine is
embedded into every guide it generates, the license's attribution clause (Exhibit
B) requires that the **Built with palimpsest** link palimpsest renders at the
bottom of the table of contents stays in place. See the [LICENSE](LICENSE) for the
full terms.
