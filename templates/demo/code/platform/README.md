# platform

The Demo Co backend API. A Node + TypeScript monorepo, Postgres for storage,
deployed to Kubernetes on EKS (see the `infra` repo). This repo is authoritative
for **how the system actually behaves** — when the guide and the code disagree,
the code wins.

## Services

- **gateway** — the single public entrypoint. Authenticates every request and
  routes it to an internal service. See `services/gateway/app.ts`.
- **accounts** — identity, organizations, and membership. Owns the `users` and
  `orgs` tables. See `services/accounts/index.ts`.
- **billing** — plans, invoices, and payment. Owns `plans` and `invoices`.
  See `services/billing/index.ts`.
- **usage** — metering. Ingests usage events and aggregates them into the
  counters billing reads at invoice time. Owns `usage_events`. See
  `services/usage/index.ts`.
- **notifications** — transactional email and webhooks (invoice receipts, invite
  emails, usage alerts). Owns `notifications`. See `services/notifications/index.ts`.

All services share one Postgres instance with an isolated **schema per service**.
No service reads another service's tables directly — cross-service reads go back
out through the gateway over HTTP.

## Layout

```
platform/
  Makefile               # `make dev`, `make test`, `make migrate`
  package.json           # npm workspaces: services/*
  docs/
    architecture.md      # request flow + data ownership
    data-model.md        # tables, keys, and relationships
  services/
    gateway/             # public API edge
    accounts/            # users + orgs
    billing/             # plans + invoices
    usage/               # metering
    notifications/       # email + webhooks
```

## Local development

```sh
make dev        # start every service against a seeded local Postgres
make test       # vitest across all workspaces
make migrate    # apply pending migrations to the local database
```

`make dev` boots each service with hot reload and a database seeded with one demo
org, a few users, and the three plans. See `docs/architecture.md` for the request
flow and `docs/data-model.md` for the schema.
