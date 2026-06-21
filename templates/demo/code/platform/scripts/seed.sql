-- Demo fixture: one org on the Team plan, three users, an open invoice.
-- Loaded by `make seed` for local development.

WITH org AS (
  INSERT INTO accounts.orgs (id, name)
  VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Robotics')
  RETURNING id
)
INSERT INTO accounts.users (org_id, email, role)
SELECT id, email, role FROM org, (VALUES
  ('ada@acme.test',   'owner'),
  ('grace@acme.test', 'admin'),
  ('alan@acme.test',  'member')
) AS seed(email, role);

INSERT INTO billing.invoices (org_id, amount_cents, status, period_start, period_end)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  4900,
  'open',
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month'
);
