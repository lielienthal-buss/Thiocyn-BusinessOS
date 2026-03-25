-- Dashboard Resources Table
-- Stores editable resource links for Support + Marketing sections

CREATE TABLE IF NOT EXISTS public.dashboard_resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section text NOT NULL CHECK (section IN ('support', 'marketing')),
  label text NOT NULL,
  description text DEFAULT '',
  url text DEFAULT '',
  icon text DEFAULT '🔗',
  badge text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.dashboard_resources ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read resources"
  ON public.dashboard_resources FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage resources"
  ON public.dashboard_resources FOR ALL
  USING (auth.role() = 'authenticated');

-- Seed: Customer Support
INSERT INTO public.dashboard_resources (section, label, description, url, icon, badge, sort_order) VALUES
('support', 'Custom GPT: Support T&J', 'AI-powered support assistant for Timber & John customer queries', '', '🤖', 'AI Tool', 1),
('support', 'Support SOPs', 'Standard operating procedures for all support scenarios', '', '📋', 'Google Doc', 2),
('support', 'Logins & Access', 'Credentials and access links for all support platforms', '', '🔐', 'Drive', 3),
('support', 'Solved Ticket Registration', 'Log and track resolved customer tickets here', '', '✅', 'Google Sheet', 4),
('support', 'Returns Tracker', 'Sheet for managing returns and refund requests', '', '↩️', 'Google Sheet', 5);

-- Seed: Marketing Resources
INSERT INTO public.dashboard_resources (section, label, description, url, icon, badge, sort_order) VALUES
('marketing', 'Creator Ambassador Program', 'Overview of the creator/ambassador pipeline and onboarding', '', '🤝', 'Drive', 1),
('marketing', 'Posts Tracker', 'Cross-brand content publishing log — track what went live', '', '📅', 'Google Sheet', 2),
('marketing', 'Monthly Theme Collection 2026', 'Thematic content directions per month across all brands', '', '🗓️', 'Drive', 3),
('marketing', 'Brand Management (Social Media)', 'Per-brand sub-pages — strategy, content, brand voice', '', '📣', 'Drive', 4),
('marketing', '12-Month Masterplan — Paigh', 'Full-year content and campaign plan for Paigh', '', '📈', 'Drive', 5),
('marketing', '12-Month Masterplan — Wristr', 'Full-year content and campaign plan for Wristr', '', '📈', 'Drive', 6);
