# Frontend architecture

```
apps/dashboard ─┐
apps/admin    ──┼─► packages/api-client ─► https://api.demo.co (platform gateway)
                │
                └─► packages/ui (shared components + tokens)
```

Two Next.js apps sit on top of two shared packages. The apps own routes and
page-level composition; the packages own everything reusable.

## Rules of the road

- **Apps never call `fetch` directly.** All backend access goes through
  `packages/api-client`, which is the single typed map of the gateway's
  endpoints. If an endpoint isn't in the client, add it there first.
- **Apps never hand-roll UI primitives.** Buttons, tables, inputs, and the design
  tokens live in `packages/ui`. An app that needs a new primitive contributes it
  upstream rather than forking one locally.
- **The gateway is the only backend.** The frontend has no direct database access
  and no knowledge of internal services — it sees one API surface at
  `https://api.demo.co`. Auth is a session cookie set during login.

## Data flow for a typical page

1. A page in `apps/dashboard` renders and calls a hook from `packages/api-client`,
   e.g. `useInvoices()`.
2. `api-client` issues `GET /billing/invoices` against the gateway with the
   session cookie.
3. The gateway authenticates and routes to the `billing` service (see the
   `platform` repo).
4. The page renders the result with components from `packages/ui`.

## Environments

| Variable              | Purpose                                   |
|-----------------------|-------------------------------------------|
| `NEXT_PUBLIC_API_URL` | Gateway base URL. Defaults to local dev.  |
| `NEXT_PUBLIC_ENV`     | `development` \| `staging` \| `production` |

Staging and production builds are deployed from the `infra` repo's pipeline.
