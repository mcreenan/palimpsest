# source-scripts

Small CLI scripts that let an agent interface with an external **source of truth**
that has no local checkout — a wiki, an issue tracker, a search API, etc.

The pattern: each capability is one script with a simple, parseable contract, and
a source's instructions (in `AGENTS.md` / `palimpsest.config.json`) tell the agent
which scripts to call.

This demo ships two as an example for the **wiki** source:

| Script | Contract |
| --- | --- |
| `wiki-search "<query>"` | prints matching `"<id>\t<title>"` lines |
| `wiki-get-article <id>` | prints the full article content for an id |

They are filesystem-backed for the demo — they `rg`/`grep` the sample articles
under `sources/docs/wiki/`. **In a real project, replace each script's body with a
call to your wiki's real API** (search → ids, get-page → content). Keep the same
input/output contract and nothing else has to change: the agent already knows to
run `wiki-search` then `wiki-get-article`.

Copy this folder as a starting point for your own sources (`jira-search`,
`tickets-get`, …) and reference them in `pal source add … --instructions "…"`.
