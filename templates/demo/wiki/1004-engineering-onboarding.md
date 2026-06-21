# Engineering onboarding

> Wiki article 1004 · Engineering · last reviewed 2026-06

Welcome. This page gets a new engineer from a fresh laptop to a shipped change.

## The system in one paragraph
Three repos: **platform** (the backend API — Node + TypeScript services behind a
single gateway, one Postgres with a schema per service), **web** (the frontend —
Next.js apps on shared `ui` and `api-client` packages), and **infra** (Terraform,
Kubernetes, and the deploy pipeline). The browser talks only to the gateway; the
gateway authenticates every request and routes it to an internal service.

## Set up
1. Clone all three repos.
2. In `platform`, run `make dev` — migrates and seeds a local Postgres, then starts
   every service.
3. In `web`, run `pnpm install && pnpm dev` — the dashboard comes up on `:3000`.
4. Join `#engineering` and `#incidents`.

## Ship your first change
We do trunk-based development (see ADR-003): branch off `main`, keep the PR small,
get one review, merge. A merge to `main` deploys to staging automatically (article
1003). Find a "good first issue" and pair with your onboarding buddy.
