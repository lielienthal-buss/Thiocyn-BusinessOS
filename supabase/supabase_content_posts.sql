CREATE TABLE IF NOT EXISTS content_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT NOT NULL, -- 'thiocyn' | 'paigh' | 'take-a-shot' | 'dr-severin' | 'wristr' | 'tj'
  platform TEXT NOT NULL, -- 'instagram' | 'tiktok' | 'youtube' | 'facebook'
  format TEXT NOT NULL, -- 'reel' | 'story' | 'post' | 'ugc' | 'vsl'
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning', -- 'planning' | 'in_production' | 'review' | 'scheduled' | 'published'
  hook TEXT,
  notes TEXT,
  assigned_to_email TEXT REFERENCES team_members(email) ON DELETE SET NULL,
  due_date DATE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage posts" ON content_posts FOR ALL USING (auth.role() = 'authenticated');

-- Seed example data — no hardcoded names, assignment happens via team accounts
INSERT INTO content_posts (brand_id, platform, format, title, status, hook) VALUES
  ('thiocyn', 'instagram', 'reel', 'Before/After Hair Density Reel', 'in_production', 'Was passiert, wenn du 90 Tage Thiocyn nutzt?'),
  ('thiocyn', 'tiktok', 'ugc', 'UGC Creator Testimonial', 'review', 'Mein Haar fällt seit Jahren aus — bis ich das entdeckt habe'),
  ('paigh', 'instagram', 'reel', 'Wristr x Paigh Collab Tease', 'planning', 'Das Handgelenk-Duo, das alles verändert'),
  ('take-a-shot', 'instagram', 'story', 'Product Highlight Stories', 'scheduled', NULL),
  ('dr-severin', 'instagram', 'post', 'Science Fact Post', 'planning', NULL);
