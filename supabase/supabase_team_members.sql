CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  -- role: 'owner' | 'admin' | 'marketing' | 'hiring' | 'support' | 'viewer'
  allowed_sections TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- sections: 'hiring' | 'marketing' | 'support' | 'ecommerce' | 'finance' | 'analytics' | 'admin'
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: 'pending' | 'active' | 'deactivated'
  invited_by TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Owners and admins can see all team members
CREATE POLICY "Team members are visible to authenticated users" ON team_members
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only owners can insert/update/delete
CREATE POLICY "Only owners can manage team" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.auth_user_id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- Seed: Luis as owner
INSERT INTO team_members (email, full_name, role, allowed_sections, status, invited_by)
VALUES (
  'luis@mail.hartlimesgmbh.de',
  'Luis Lielienthal',
  'owner',
  ARRAY['hiring','marketing','support','ecommerce','finance','analytics','admin'],
  'active',
  'system'
) ON CONFLICT (email) DO NOTHING;

-- Seed: Peter Hart as admin (MD)
INSERT INTO team_members (email, full_name, role, allowed_sections, status, invited_by)
VALUES (
  'peter@mail.hartlimesgmbh.de',
  'Peter Hart',
  'admin',
  ARRAY['hiring','marketing','support','ecommerce','finance','analytics','admin'],
  'active',
  'system'
) ON CONFLICT (email) DO NOTHING;

-- Seed: Valentin as admin (Dev)
INSERT INTO team_members (email, full_name, role, allowed_sections, status, invited_by)
VALUES (
  'valentin@mail.hartlimesgmbh.de',
  'Valentin',
  'admin',
  ARRAY['hiring','marketing','support','ecommerce','finance','analytics','admin'],
  'active',
  'system'
) ON CONFLICT (email) DO NOTHING;
