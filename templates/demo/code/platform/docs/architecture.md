# Architecture

```
                 ┌─────────► accounts ──────► Postgres (accounts schema)
                 │
web ──► gateway ─┼─────────► billing ───────► Postgres (billing schema)
                 │              │
                 │              └─ reads usage counters (via gateway)
                 ├─────────► usage ─────────► Postgres (usage schema)
                 │
                 └─────────► notifications ─► Postgres (notifications schema)
                                  │
                                  └─ sends email / webhooks
```

The **gateway** is the only service exposed publicly. It verifies a session
token, attaches the resolved `userId`/`orgId` to the request, then proxies to an
internal service over HTTP. Internal services are not reachable from outside the
cluster and **never call each other directly** — a cross-service read goes back
out through the gateway so that auth and routing stay in one place.

## Request flow

1. The `web` frontend calls `https://api.demo.co/<service>/...` with a session cookie.
2. The gateway runs `verifySession` (`services/gateway/auth.ts`), rejecting
   anything without a valid, unexpired session.
3. The gateway's `proxy` (`services/gateway/proxy.ts`) forwards the request to the
   internal service, adding `x-user-id` and `x-org-id` headers.
4. The service does its work, scoped to that org, and returns JSON.

Because the gateway is the only authenticated edge, internal services trust the
`x-org-id` header and **must not** accept an `orgId` from the request body.

## Data ownership

| Service       | Schema          | Tables                          | Notes                                            |
|---------------|-----------------|---------------------------------|--------------------------------------------------|
| accounts      | `accounts`      | `orgs`, `users`                 | An org owns its users via `org_id`.              |
| billing       | `billing`       | `plans`, `invoices`             | An invoice belongs to an org.                    |
| usage         | `usage`         | `usage_events`                  | Append-only; aggregated at invoice time.         |
| notifications | `notifications` | `notifications`                 | Outbound email + webhook delivery log.           |

Schemas are isolated per service inside a single Postgres instance. Migrations
live next to each service under `services/<name>/migrations` and are applied with
`make migrate`. See `docs/data-model.md` for column-level detail.

## Why this shape

- **One public edge.** Authentication, rate limiting, and audit logging happen in
  exactly one place. See ADR-002 in the engineering wiki ("Gateway as the single
  ingress").
- **Schema-per-service.** Services can evolve their tables independently while
  sharing operational overhead (one database to back up, patch, and monitor). See
  ADR-001 ("One monorepo, schema-per-service").
- **No direct service-to-service DB access.** Ownership stays clear and a service
  can be extracted later without untangling foreign keys across schemas.
