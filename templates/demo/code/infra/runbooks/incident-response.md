# Runbook: incident response

What to do when production is unhealthy. For the on-call rotation and escalation
contacts, see the engineering wiki ("On-call").

## Severity levels

| Sev | Meaning                                   | Response                          |
|-----|-------------------------------------------|-----------------------------------|
| 1   | Full outage or data loss risk             | Page immediately, all hands.      |
| 2   | Major feature down, no workaround         | Page on-call, start incident doc. |
| 3   | Degraded / partial, workaround exists     | Handle in business hours.         |

## First five minutes

1. **Acknowledge** the page so it stops escalating.
2. **Declare** in `#incidents` with a one-line summary and severity.
3. **Look** at the gateway first — it's the single ingress, so most symptoms show
   there:
   ```sh
   kubectl get pods -l tier=edge
   kubectl logs -l app=gateway --tail=100
   ```
4. **Check recent change.** Most incidents follow a deploy. If a deploy is in
   flight or just finished, roll it back (see `deploys.md`) before deeper
   debugging.

## Common causes

- **Bad deploy** → `kubectl rollout undo`. Resolves most Sev 1/2s.
- **Database saturation** → check `rds-prod` CPU/connections in CloudWatch; a slow
  query or connection leak in one service. Identify the service by schema in
  `pg_stat_activity`.
- **Expired/secret rotation** → a service crash-looping on startup usually means a
  missing or rotated secret (`kubectl describe pod`).

## After

Every Sev 1/2 gets a written postmortem within two business days — blameless,
focused on the systemic fix. Track action items in the wiki. See the wiki page
"Incident management" for the template and process.
