-- Additive migration. Does not import or reassign legacy anonymous data.
CREATE TABLE IF NOT EXISTS psysim_accounts (
  auth_id text PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','supervisor','administrator')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS psysim_sessions (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES psysim_accounts(auth_id),
  session jsonb NOT NULL,
  clinical_profile jsonb NOT NULL,
  evaluation jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS psysim_sessions_owner_idx ON psysim_sessions(owner_id);
CREATE TABLE IF NOT EXISTS psysim_catalog (
  id integer PRIMARY KEY CHECK (id=1),
  data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS psysim_receipts (
  key text PRIMARY KEY,
  session_id text NOT NULL REFERENCES psysim_sessions(id),
  data jsonb NOT NULL
);
-- These tables are accessible only to the server database role, never the browser/Data API.
REVOKE ALL ON psysim_accounts, psysim_sessions, psysim_catalog, psysim_receipts FROM PUBLIC;
