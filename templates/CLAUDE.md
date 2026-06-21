# CLAUDE.md

This project's working conventions live in **[AGENTS.md](AGENTS.md)** — read it
before editing. In short:

- The guide is **built from source** — never hand-edit the generated `.html`.
- Content is in `sections/*.html`; structure in `palimpsest.config.json`; design
  in `theme/tokens.css`.
- Rebuild with `{{BUILD}}`; preview with `pal dev`; lint with `pal validate`.
- Check every factual change against the source of truth before applying it
  (AGENTS.md §5–6).
