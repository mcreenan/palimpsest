# Incident management

> Wiki article 1006 · Operations · last reviewed 2026-06

An incident is anything customer-affecting in production. This is the process; the
hands-on first steps are in the on-call runbook (article 1002).

## Severity
| Sev | Meaning                               | Response                       |
| --- | ------------------------------------- | ------------------------------ |
| 1   | Full outage or data-loss risk         | Page immediately, all hands.   |
| 2   | Major feature down, no workaround     | Page on-call, open incident.   |
| 3   | Degraded / partial, workaround exists | Handle in business hours.      |

## Roles
- **Incident Commander** — runs the incident, makes calls, keeps the timeline.
- **Responders** — do the hands-on work the IC coordinates.
- **Comms** — update `#incidents` and, for Sev 1/2, the status page.

For a small incident one person wears all hats; for Sev 1, split them.

## Flow
Declare → **mitigate first** (often a rollback) → communicate on a cadence →
resolve → postmortem. Every Sev 1/2 gets a **blameless** postmortem within two
business days, with action items tracked to done.
