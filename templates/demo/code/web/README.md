# web

The Demo Co frontend. A pnpm monorepo of React/Next.js apps and the shared
packages they build on. Everything the customer sees in the browser is here; it
talks to the backend exclusively through the `platform` gateway at
`https://api.demo.co`.

This repo is authoritative for **what the product looks like and how the UI
behaves**. For business rules (what a plan includes, how an invoice is computed),
the `platform` repo wins.

## Apps

- **dashboard** (`apps/dashboard`) — the main customer app: billing, members,
  usage. What a signed-in user lands in.
- **admin** (`apps/admin`) — the internal Demo Co staff console for support and
  account operations. Not customer-facing.

## Packages

- **ui** (`packages/ui`) — the shared component library (Button, Table, …) and
  design tokens. Every app imports from here; nothing reimplements a button.
- **api-client** (`packages/api-client`) — a typed wrapper around the gateway API.
  One place that knows the endpoints, so apps don't hand-roll `fetch` calls.

## Layout

```
web/
  package.json           # pnpm workspaces: apps/*, packages/*
  docs/architecture.md   # how apps, packages, and the API fit together
  apps/
    dashboard/
    admin/
  packages/
    ui/
    api-client/
```

## Local development

```sh
pnpm install
pnpm dev            # run every app in parallel (dashboard :3000, admin :3001)
pnpm --filter dashboard dev   # just one app
pnpm test
```

Apps expect the backend at `NEXT_PUBLIC_API_URL` (defaults to the local gateway).
See `docs/architecture.md`.
