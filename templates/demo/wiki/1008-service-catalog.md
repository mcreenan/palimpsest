# Service catalog

> Wiki article 1008 · Engineering · last reviewed 2026-06

The services that make up the **platform** backend, what they own, and who to ask.
The code is the source of truth (`platform/services/<name>`); this is the map.

| Service       | Owns (schema.tables)              | Responsibility                          |
| ------------- | --------------------------------- | --------------------------------------- |
| gateway       | —                                 | Public edge: auth + routing.            |
| accounts      | `accounts.orgs`, `accounts.users` | Identity, orgs, membership, roles.      |
| billing       | `billing.plans`, `billing.invoices` | Plans, invoices, payment.             |
| usage         | `usage.usage_events`              | Metering; aggregated at invoice time.   |
| notifications | `notifications.notifications`     | Transactional email + webhooks.         |

## Rules
- Only **gateway** is publicly reachable (ADR-001). Internal services trust the
  `x-org-id` header it sets and scope every query to it.
- No service reads another's tables. A cross-service read goes back out through the
  gateway (e.g. billing asks usage for a period total when finalizing an invoice).

## Plans
Three plans, owned by billing: **free** (1,000 units), **team** ($49 / 25,000
units), **enterprise** ($499 / 500,000 units). Usage above the included units is
billed as overage.
