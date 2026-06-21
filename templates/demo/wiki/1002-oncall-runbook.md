# On-call runbook

> Wiki article 1002 · Operations · last reviewed 2026-06

## Paging
The primary on-call is paged when the gateway 5xx rate exceeds 2% for 5 minutes.

## First steps
1. Check the gateway dashboard for the failing route.
2. If a single service is down, restart it: `kubectl rollout restart deploy/<svc>`.
3. If Postgres is saturated, shed read load to the replica.

Escalate to the service owner if it is not resolved within 15 minutes.
