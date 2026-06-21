-- billing schema: plans and the invoices issued against an org.
CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE billing.plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL CHECK (name IN ('free', 'team', 'enterprise')),
  monthly_price_cents integer NOT NULL,
  included_units      integer NOT NULL DEFAULT 0
);

CREATE TABLE billing.invoices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status       text NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'open', 'paid', 'void')),
  period_start timestamptz NOT NULL,
  period_end   timestamptz NOT NULL
);

CREATE INDEX invoices_by_org ON billing.invoices (org_id, period_start DESC);

-- The three plans every org chooses from.
INSERT INTO billing.plans (name, monthly_price_cents, included_units) VALUES
  ('free',          0,   1000),
  ('team',          4900, 25000),
  ('enterprise',    49900, 500000);
