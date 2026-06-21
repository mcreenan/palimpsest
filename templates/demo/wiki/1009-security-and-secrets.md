# Security & secrets

> Wiki article 1009 · Security · last reviewed 2026-06

How we handle authentication, authorization, and secrets. When in doubt, ask in
`#security`.

## Authentication & authorization
- The **gateway** is the only authenticated edge (ADR-001). It verifies the session
  and sets `x-user-id` / `x-org-id`; internal services trust those headers and must
  **never** accept an `orgId` from a request body.
- Every query is scoped to the caller's org. A missing org scope is a security bug,
  not a nice-to-have.
- Roles (owner / admin / member) are enforced server-side. The frontend hiding a
  button is convenience, not security.

## Secrets
- Secrets live in AWS Secrets Manager and reach pods as Kubernetes `Secret`
  env vars (see `infra/kubernetes/*.yaml`). Never commit a secret to git.
- Rotate on a schedule and immediately on suspected exposure. Customer-facing API
  keys can be revoked instantly (see the "API keys" help article).

## Reporting
Suspected vulnerability or leaked credential? Revoke first if you can, then report
in `#security`. We triage every report; Sev 1 security issues follow the incident
process (article 1006).
