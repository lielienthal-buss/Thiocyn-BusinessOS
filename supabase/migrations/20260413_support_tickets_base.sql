-- Documentation migration: support_tickets base table (pre-existing in live DB, no prior migration)

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id text NOT NULL DEFAULT 'thiocyn',
  channel text NOT NULL DEFAULT 'email',
  subject text NOT NULL,
  customer_name text,
  customer_email text,
  status text NOT NULL DEFAULT 'open',
  priority integer NOT NULL DEFAULT 2,
  assigned_to text,
  notes text,
  tags text[] DEFAULT '{}',
  due_date date,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE IF EXISTS support_tickets ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and manage support tickets
CREATE POLICY IF NOT EXISTS "authenticated_read_support_tickets" ON support_tickets
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "authenticated_manage_support_tickets" ON support_tickets
  FOR UPDATE
  USING (auth.role() = 'authenticated');
