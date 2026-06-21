-- accounts schema: orgs and the users that belong to them.
CREATE SCHEMA IF NOT EXISTS accounts;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE accounts.orgs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accounts.users (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id  uuid NOT NULL REFERENCES accounts.orgs(id) ON DELETE CASCADE,
  email   citext NOT NULL,
  role    text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  UNIQUE (org_id, email)
);

-- One owner per org.
CREATE UNIQUE INDEX one_owner_per_org
  ON accounts.users (org_id)
  WHERE role = 'owner';
