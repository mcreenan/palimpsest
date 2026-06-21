-- usage schema: append-only metering events.
CREATE SCHEMA IF NOT EXISTS usage;

CREATE TABLE usage.usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL,
  units       integer NOT NULL CHECK (units >= 0),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Billing aggregates by org over a time window; index for that access pattern.
CREATE INDEX usage_events_by_org_time
  ON usage.usage_events (org_id, occurred_at);
