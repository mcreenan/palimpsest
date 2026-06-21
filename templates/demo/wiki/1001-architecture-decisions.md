# Architecture Decision Records

> Wiki article 1001 · Engineering · last reviewed 2026-05

## ADR-001: API gateway as the single entrypoint
All external traffic is routed through one gateway service. Internal services are
not publicly reachable and never call each other directly — cross-service reads go
back through the gateway. Rationale: one place for authentication, rate limiting,
and audit logging.

## ADR-002: Schema-per-service in a shared Postgres
Each service owns its own tables in a single shared Postgres instance. We chose
shared Postgres over database-per-service to keep operations simple at our current
scale. Ownership: accounts → users/orgs, billing → plans/invoices.
