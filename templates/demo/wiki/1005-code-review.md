# Code review

> Wiki article 1005 · Engineering · last reviewed 2026-06

Review keeps `main` releasable and spreads knowledge. It's a conversation, not a
gate to grind through.

## For authors
- Keep PRs small — one idea per PR. Split big changes.
- Write the *why* in the description, and how you verified it.
- Self-review your own diff first; tests come with the change.

## For reviewers
- Respond within a business day — a stuck PR blocks a teammate.
- Review for correctness, clarity, tests, and fit with the surrounding code. Let
  the linter handle style.
- Be specific and kind. Mark comments as "must fix" vs "nit".

## Bar to merge
Tests pass and are covered · one approval · no unresolved "must fix" · schema
changes follow the migration runbook (article 1007). Because merges deploy to
staging immediately, the bar is "good enough to be live for customers tomorrow".
