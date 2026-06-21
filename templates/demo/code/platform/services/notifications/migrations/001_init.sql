-- notifications schema: outbound email + webhook delivery log.
CREATE SCHEMA IF NOT EXISTS notifications;

CREATE TABLE notifications.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL,
  channel    text NOT NULL CHECK (channel IN ('email', 'webhook')),
  template   text NOT NULL,
  status     text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The delivery worker polls for pending rows.
CREATE INDEX notifications_pending
  ON notifications.notifications (created_at)
  WHERE status = 'pending';
