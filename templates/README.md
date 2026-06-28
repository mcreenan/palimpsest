# {{TITLE}}

A living engineering guide for {{ORG_NAME}}, built with
[palimpsest](https://www.npmjs.com/package/@kelonetic/palimpsest). It renders as a
self-contained HTML page with a two-level table of contents, scrollspy
navigation, section filtering, pan/zoom Mermaid diagrams, linked repo & code
references, and an in-page **"Suggest a change"** flow.

## The guide is built from source

The generated `{{ARTIFACT}}` is **not edited by hand** — it's reassembled from:

- `sections/*.html` — one fragment per section (the content)
- `palimpsest.config.json` — `structure` (parts/sections/order) + project config
- `theme/tokens.css` — the design tokens the look is rendered from

```bash
pal source add … # register your sources of truth (code repos, wiki, help center)
pal outline      # → agent prompt: propose a section outline from your sources
pal draft        # → agent prompt: write the baseline content (research→generate→synthesize→audit)
pal build        # build the artifact bundle
pal dev          # build, serve, and live-reload on change
pal validate     # lint section sources against the house style
pal theme import <file.css>   # adopt your org's design system
pal publish      # deploy the bundle to the configured target
```

`pal outline` and `pal draft` don't call an LLM themselves — they generate a
thorough prompt, copy it to your clipboard, and tell you to paste it into an agent
running in this directory. Add your sources **first** so the agent grounds the
guide in your real stack.

To change a section, edit its `sections/<n>-<slug>.html` fragment and rebuild.
To add/move/rename sections, edit `structure` in `palimpsest.config.json`.

See **[AGENTS.md](AGENTS.md)** for the full authoring conventions and build
contract.
