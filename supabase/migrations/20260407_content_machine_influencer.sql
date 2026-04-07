-- ============================================================================
-- Business OS — Content Machine + Influencer Pipeline
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- Extends: creators (ALTER TABLE), creative_factory (20260406)
-- New tables: creator_tasks, creator_performance, content_directions, hashtag_strategies
-- New views: creator_scoreboard, creator_operator_dashboard, content_pipeline_overview, weekly_content_status
-- New triggers: auto_update_creator_tier, auto_count_creator_content
-- Run AFTER 20260406_creative_factory.sql
-- ============================================================================

-- ============================================================================
-- 1. EXTEND: creators table
-- ============================================================================
-- The creators table already exists in Supabase (created via dashboard).
-- We add columns for the full Influencer Pipeline.

ALTER TABLE creators ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'starter';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS affiliate_code TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS affiliate_pct NUMERIC(4,2) DEFAULT 5.0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS total_revenue NUMERIC(10,2) DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS content_count INTEGER DEFAULT 0;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS last_content_date TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS assigned_operator TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS brand_slug TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add CHECK constraints via ALTER (safe for existing data)
DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_creators_tier
    CHECK (tier IN ('starter', 'silver', 'gold', 'ambassador'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_creators_onboarding
    CHECK (onboarding_status IN ('pending', 'product_sent', 'first_video', 'active', 'paused', 'churned'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add FK to brands (safe — allows NULL for existing rows without brand_slug)
DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT fk_creators_brand
    FOREIGN KEY (brand_slug) REFERENCES brands(slug) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add FK to team_members for operator assignment
DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT fk_creators_operator
    FOREIGN KEY (assigned_operator) REFERENCES team_members(email) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unique affiliate code
DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT uq_creators_affiliate_code UNIQUE (affiliate_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creators_tier ON creators(tier);
CREATE INDEX IF NOT EXISTS idx_creators_brand_slug ON creators(brand_slug);
CREATE INDEX IF NOT EXISTS idx_creators_operator ON creators(assigned_operator);
CREATE INDEX IF NOT EXISTS idx_creators_onboarding ON creators(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_creators_affiliate ON creators(affiliate_code) WHERE affiliate_code IS NOT NULL;

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_creators_updated_at ON creators;
CREATE TRIGGER trigger_creators_updated_at
BEFORE UPDATE ON creators
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. TABLE: creator_tasks
-- ============================================================================
-- Weekly task assignments. Links creators to the Creative Factory system
-- via angle_code and asset_id.

CREATE TABLE IF NOT EXISTS creator_tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_slug        TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  week_number       INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year              INTEGER NOT NULL CHECK (year BETWEEN 2025 AND 2100),
  content_direction TEXT NOT NULL
                    CHECK (content_direction IN ('problem_solution', 'storytelling', 'aesthetic', 'myth_buster')),
  angle_code        TEXT,                   -- e.g. 'PROB01', 'MECH03' — references creative_angles.code
  template_used     TEXT,                   -- which template was sent
  deadline          DATE,
  status            TEXT NOT NULL DEFAULT 'sent'
                    CHECK (status IN ('sent', 'acknowledged', 'submitted', 'feedback_given', 'approved', 'overdue', 'skipped')),
  submission_url    TEXT,                   -- link to submitted content
  submission_type   TEXT
                    CHECK (submission_type IN ('reel', 'tiktok', 'story', 'carousel', 'static')),
  feedback          TEXT,                   -- operator feedback (max 3 sentences)
  feedback_given_at TIMESTAMPTZ,
  quality_rating    INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  repost_worthy     BOOLEAN DEFAULT FALSE,
  asset_id          UUID REFERENCES creative_assets(id) ON DELETE SET NULL,  -- link to Creative Factory
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE creator_tasks IS
'Weekly task assignments for creators. Each row = one task per creator per week. Links to Creative Factory via angle_code and asset_id.';

DROP TRIGGER IF EXISTS trigger_creator_tasks_updated_at ON creator_tasks;
CREATE TRIGGER trigger_creator_tasks_updated_at
BEFORE UPDATE ON creator_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_ctasks_creator ON creator_tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_ctasks_brand ON creator_tasks(brand_slug);
CREATE INDEX IF NOT EXISTS idx_ctasks_week ON creator_tasks(year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_ctasks_status ON creator_tasks(status) WHERE status NOT IN ('approved', 'skipped');
CREATE INDEX IF NOT EXISTS idx_ctasks_repost ON creator_tasks(repost_worthy) WHERE repost_worthy = TRUE;

ALTER TABLE creator_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ctasks_select_auth" ON creator_tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ctasks_write_auth" ON creator_tasks FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 3. TABLE: creator_performance
-- ============================================================================
-- Weekly performance snapshots per creator. Used for A/B/C sorting.

CREATE TABLE IF NOT EXISTS creator_performance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id        UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  week_number       INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year              INTEGER NOT NULL CHECK (year BETWEEN 2025 AND 2100),
  tasks_sent        INTEGER DEFAULT 0,
  tasks_delivered   INTEGER DEFAULT 0,
  delivery_rate     NUMERIC(5,2) DEFAULT 0,   -- percent
  top_videos        INTEGER DEFAULT 0,
  sales             INTEGER DEFAULT 0,
  revenue           NUMERIC(10,2) DEFAULT 0,
  tier_at_snapshot  TEXT,
  operator_notes    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (creator_id, year, week_number)
);

COMMENT ON TABLE creator_performance IS
'Weekly performance snapshots per creator. Delivery rate, sales, and quality metrics for A/B/C sorting.';

CREATE INDEX IF NOT EXISTS idx_cperf_creator ON creator_performance(creator_id);
CREATE INDEX IF NOT EXISTS idx_cperf_week ON creator_performance(year DESC, week_number DESC);
CREATE INDEX IF NOT EXISTS idx_cperf_delivery ON creator_performance(delivery_rate DESC);

ALTER TABLE creator_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cperf_select_auth" ON creator_performance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cperf_write_auth" ON creator_performance FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 4. TABLE: content_directions
-- ============================================================================
-- The 4-week content direction cycle. Shared across all brands.
-- Week 1: Problem→Lösung, Week 2: Storytelling, Week 3: Ästhetik, Week 4: Mythos brechen

CREATE TABLE IF NOT EXISTS content_directions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug        TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  week_in_cycle     INTEGER NOT NULL CHECK (week_in_cycle BETWEEN 1 AND 4),
  direction_key     TEXT NOT NULL
                    CHECK (direction_key IN ('problem_solution', 'storytelling', 'aesthetic', 'myth_buster')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  angle_categories  TEXT[] NOT NULL,          -- e.g. ARRAY['problem'] or ARRAY['contrarian','mechanism']
  template_reference TEXT,                    -- path to template doc
  active            BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (brand_slug, week_in_cycle)
);

COMMENT ON TABLE content_directions IS
'4-week content direction cycle per brand. Defines which angle categories and templates are used each week.';

ALTER TABLE content_directions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cdir_select_auth" ON content_directions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cdir_write_auth" ON content_directions FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- Seed: Universal 4-week cycle for all active brands
INSERT INTO content_directions (brand_slug, week_in_cycle, direction_key, title, description, angle_categories, template_reference)
SELECT
  b.slug,
  d.week_in_cycle,
  d.direction_key,
  d.title,
  d.description,
  d.angle_categories,
  d.template_reference
FROM brands b
CROSS JOIN (VALUES
  (1, 'problem_solution', 'Problem → Lösung',
   'Zeig das Problem und wie das Produkt die Lösung ist. Emotionaler Einstieg, ehrlicher Moment.',
   ARRAY['problem'], 'data/docs/creator-video-task-templates.md#template-1'),
  (2, 'storytelling', 'Storytelling / Mein Erlebnis',
   'Erzähl deine persönliche Geschichte. Timeline-Format: Vorher → Prozess → Jetzt.',
   ARRAY['aspiration', 'social_proof'], 'data/docs/creator-video-task-templates.md#template-2'),
  (3, 'aesthetic', 'Ästhetik / Routine',
   'Zeig das Produkt als Teil deines Lifestyles. Kein Text nötig — Ästhetik first.',
   ARRAY['identity'], 'data/docs/creator-video-task-templates.md#template-3'),
  (4, 'myth_buster', 'Mythos brechen',
   'Räume mit einem verbreiteten Irrtum auf. Konträr denken, Mechanismus erklären.',
   ARRAY['contrarian', 'mechanism'], NULL)
) AS d(week_in_cycle, direction_key, title, description, angle_categories, template_reference)
WHERE b.status = 'active'
ON CONFLICT (brand_slug, week_in_cycle) DO NOTHING;

-- ============================================================================
-- 5. TABLE: hashtag_strategies
-- ============================================================================
-- Hashtag strategies per brand as DB records. Replaces markdown files.

CREATE TABLE IF NOT EXISTS hashtag_strategies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug        TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  branded_hashtag   TEXT NOT NULL,
  niche_hashtags_high TEXT[],                -- High volume (>500K posts)
  niche_hashtags_mid  TEXT[],                -- Mid volume (10K-500K)
  niche_hashtags_micro TEXT[],               -- Micro (<10K)
  banned_hashtags   TEXT[],
  rotation_rules    TEXT,
  max_tags_per_post INTEGER DEFAULT 7,
  tags_placement    TEXT DEFAULT 'first_comment'
                    CHECK (tags_placement IN ('caption', 'first_comment')),
  active            BOOLEAN DEFAULT TRUE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (brand_slug)
);

COMMENT ON TABLE hashtag_strategies IS
'Hashtag strategies per brand. Max 7 tags per post, placed in first comment. Rotated every 4-6 weeks.';

ALTER TABLE hashtag_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hs_select_auth" ON hashtag_strategies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "hs_write_auth" ON hashtag_strategies FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- Seed: Hashtag strategies from marketing deliverables
INSERT INTO hashtag_strategies (brand_slug, branded_hashtag, niche_hashtags_high, niche_hashtags_mid, niche_hashtags_micro, banned_hashtags, rotation_rules)
VALUES
(
  'thiocyn',
  '#meinthiocyn',
  ARRAY['#haarausfall', '#haarpflege', '#haarwachstum'],
  ARRAY['#haarserum', '#thiocyanat', '#körpereigenesmolekül', '#haarverlust'],
  ARRAY['#thiocyn', '#haarwuchs', '#stärkereshaar'],
  ARRAY['#wundermittel', '#haarwuchsmittel', '#finasteride', '#minoxidil'],
  'Rotate 2 mid-vol tags every 4-6 weeks. #körpereigenesmolekül and #thiocyanat are differentiators — keep always.'
),
(
  'take-a-shot',
  '#myshotmoment',
  ARRAY['#sunglasses', '#outdoorlifestyle', '#travelphotography'],
  ARRAY['#sustainablefashion', '#sonnenbrillen', '#woodensunglasses', '#adventurestyle'],
  ARRAY['#takeashot', '#bewusstkaufen', '#brillenliebe'],
  ARRAY['#cheap', '#discount', '#sale', '#shein', '#fashionnova', '#rayban', '#oakley'],
  'Rotate 2 mid-vol + 1 micro every 4-6 weeks. 60% EN / 40% DE ratio. Giveaway: add #gewinnspiel as 7th tag.'
),
(
  'dr-severin',
  '#meinpflegeritual',
  ARRAY['#skincare', '#skincareroutine', '#antiaging'],
  ARRAY['#madeskincare', '#männerpflege', '#hyaluron', '#ingredientnerds'],
  ARRAY['#drseverin', '#vitaminc12', '#hautpflegeroutine'],
  ARRAY['#intimhygiene', '#rasur', '#heilt', '#cerave', '#theordinary', '#beautyroutine', '#glowup'],
  'Rotate 2 mid-vol monthly. Ingredient tags (#hyaluron) cycle shadowban risk — verify monthly. No female-coded tags.'
),
(
  'paigh',
  '#mypaigh',
  ARRAY['#sustainablefashion', '#comfortfashion', '#bohostyle'],
  ARRAY['#fairefashion', '#haremshose', '#bewusstleben', '#slowfashion'],
  ARRAY['#paigh', '#wftomember', '#komfortmode'],
  ARRAY['#shein', '#fastfashion', '#billigmode', '#primark'],
  'Rotate 2 mid-vol every 4-6 weeks. Collab posts: include partner community tag, drop #komfortmode. Giveaway: add #gewinnspiel.'
),
(
  'wristr',
  '#mywristr',
  ARRAY['#applewatch', '#smartwatch', '#watchband'],
  ARRAY['#applewatchband', '#watchaccessories', '#premiumband', '#lederarmband'],
  ARRAY['#wristr', '#watchstyle', '#corporategifts'],
  ARRAY['#cheap', '#aliexpress', '#fakeleather'],
  'Reactivation phase: prioritize Reels with #applewatch + #watchband. B2B posts: add #corporategifts.'
)
ON CONFLICT (brand_slug) DO NOTHING;

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- 6.1 Creator Scoreboard — Ranking by delivery rate, sales, content quality
CREATE OR REPLACE VIEW creator_scoreboard AS
SELECT
  c.id,
  c.name,
  c.brand_slug,
  c.tier,
  c.onboarding_status,
  c.assigned_operator,
  c.total_sales,
  c.total_revenue,
  c.content_count,
  c.last_content_date,
  -- Last 4 weeks aggregated
  COALESCE(perf.avg_delivery_rate, 0) AS avg_delivery_rate_4w,
  COALESCE(perf.total_top_videos, 0) AS top_videos_4w,
  COALESCE(perf.recent_sales, 0) AS sales_4w,
  -- Classification
  CASE
    WHEN COALESCE(perf.avg_delivery_rate, 0) >= 80 AND c.total_sales >= 5 THEN 'A'
    WHEN COALESCE(perf.avg_delivery_rate, 0) >= 50 THEN 'B'
    ELSE 'C'
  END AS creator_grade,
  RANK() OVER (
    PARTITION BY c.brand_slug
    ORDER BY COALESCE(perf.avg_delivery_rate, 0) DESC, c.total_sales DESC
  ) AS rank
FROM creators c
LEFT JOIN LATERAL (
  SELECT
    ROUND(AVG(delivery_rate), 1) AS avg_delivery_rate,
    SUM(top_videos) AS total_top_videos,
    SUM(sales) AS recent_sales
  FROM creator_performance cp
  WHERE cp.creator_id = c.id
  ORDER BY cp.year DESC, cp.week_number DESC
  LIMIT 4
) perf ON TRUE
WHERE c.status = 'Active'
ORDER BY c.brand_slug, rank;

-- 6.2 Creator Operator Dashboard — Per operator overview
CREATE OR REPLACE VIEW creator_operator_dashboard AS
SELECT
  c.assigned_operator,
  tm.name AS operator_name,
  COUNT(c.id) AS total_creators,
  COUNT(c.id) FILTER (WHERE c.onboarding_status = 'active') AS active_creators,
  COUNT(c.id) FILTER (WHERE c.tier = 'ambassador') AS ambassadors,
  SUM(c.total_sales) AS total_sales,
  SUM(c.total_revenue) AS total_revenue,
  -- Open tasks this week
  COALESCE(tasks.open_tasks, 0) AS open_tasks_this_week,
  COALESCE(tasks.delivered_tasks, 0) AS delivered_this_week,
  CASE
    WHEN COALESCE(tasks.open_tasks, 0) + COALESCE(tasks.delivered_tasks, 0) > 0
    THEN ROUND(
      (COALESCE(tasks.delivered_tasks, 0)::NUMERIC /
       (COALESCE(tasks.open_tasks, 0) + COALESCE(tasks.delivered_tasks, 0))) * 100, 1
    )
    ELSE 0
  END AS delivery_rate_this_week
FROM creators c
LEFT JOIN team_members tm ON tm.email = c.assigned_operator
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE ct.status IN ('sent', 'acknowledged')) AS open_tasks,
    COUNT(*) FILTER (WHERE ct.status IN ('submitted', 'feedback_given', 'approved')) AS delivered_tasks
  FROM creator_tasks ct
  WHERE ct.creator_id = c.id
    AND ct.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND ct.week_number = EXTRACT(WEEK FROM CURRENT_DATE)
) tasks ON TRUE
WHERE c.assigned_operator IS NOT NULL
GROUP BY c.assigned_operator, tm.name, tasks.open_tasks, tasks.delivered_tasks;

-- 6.3 Content Pipeline Overview — AI Creatives vs Creator Content side by side
CREATE OR REPLACE VIEW content_pipeline_overview AS
SELECT
  'ai' AS source,
  ca.brand_slug,
  ca.asset_name AS content_name,
  ca.format,
  ca.platform,
  ca.status,
  ang.code AS angle_code,
  ang.category AS angle_category,
  ang.performance_tag,
  latest_perf.ctr,
  latest_perf.roas,
  latest_perf.classification,
  ca.created_at
FROM creative_assets ca
LEFT JOIN creative_angles ang ON ang.id = ca.angle_id
LEFT JOIN LATERAL (
  SELECT ctr, roas, classification
  FROM asset_performance
  WHERE asset_id = ca.id
  ORDER BY snapshot_date DESC
  LIMIT 1
) latest_perf ON TRUE
WHERE ca.produced_by IN ('ai_higgsfield', 'ai_kling')

UNION ALL

SELECT
  'creator' AS source,
  ct.brand_slug,
  c.name || ' — KW' || ct.week_number AS content_name,
  ct.submission_type AS format,
  'IG' AS platform,  -- default, can be extended
  ct.status,
  ct.angle_code,
  cd.direction_key AS angle_category,
  CASE
    WHEN ct.repost_worthy THEN 'winner'
    WHEN ct.quality_rating >= 4 THEN 'performer'
    WHEN ct.status = 'approved' THEN 'testing'
    ELSE 'untested'
  END AS performance_tag,
  NULL::NUMERIC AS ctr,
  NULL::NUMERIC AS roas,
  NULL::TEXT AS classification,
  ct.created_at
FROM creator_tasks ct
JOIN creators c ON c.id = ct.creator_id
LEFT JOIN content_directions cd ON cd.brand_slug = ct.brand_slug
  AND cd.direction_key = ct.content_direction
WHERE ct.status NOT IN ('skipped')
ORDER BY created_at DESC;

-- 6.4 Weekly Content Status — Who delivered this week?
CREATE OR REPLACE VIEW weekly_content_status AS
SELECT
  c.id AS creator_id,
  c.name AS creator_name,
  c.brand_slug,
  c.assigned_operator,
  ct.status AS task_status,
  ct.content_direction,
  ct.deadline,
  ct.submission_url,
  ct.quality_rating,
  ct.repost_worthy,
  ct.feedback_given_at,
  CASE
    WHEN ct.status IN ('submitted', 'feedback_given', 'approved') THEN 'delivered'
    WHEN ct.status = 'overdue' THEN 'overdue'
    WHEN ct.deadline < CURRENT_DATE AND ct.status IN ('sent', 'acknowledged') THEN 'overdue'
    ELSE 'pending'
  END AS delivery_status
FROM creators c
LEFT JOIN creator_tasks ct ON ct.creator_id = c.id
  AND ct.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND ct.week_number = EXTRACT(WEEK FROM CURRENT_DATE)
WHERE c.status = 'Active'
  AND c.onboarding_status = 'active'
ORDER BY delivery_status DESC, c.brand_slug, c.name;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

-- 7.1 Auto-update creator tier based on cumulative sales
CREATE OR REPLACE FUNCTION auto_update_creator_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_total_sales INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Get total sales for this creator
  SELECT total_sales INTO v_total_sales
  FROM creators WHERE id = NEW.creator_id;

  -- Add this week's sales
  v_total_sales := COALESCE(v_total_sales, 0) + COALESCE(NEW.sales, 0);

  -- Determine tier
  IF v_total_sales >= 300 THEN
    v_new_tier := 'ambassador';
  ELSIF v_total_sales >= 100 THEN
    v_new_tier := 'gold';
  ELSIF v_total_sales >= 20 THEN
    v_new_tier := 'silver';
  ELSE
    v_new_tier := 'starter';
  END IF;

  -- Update creator
  UPDATE creators SET
    total_sales = v_total_sales,
    total_revenue = COALESCE(total_revenue, 0) + COALESCE(NEW.revenue, 0),
    tier = v_new_tier,
    tier_updated_at = CASE WHEN tier != v_new_tier THEN NOW() ELSE tier_updated_at END
  WHERE id = NEW.creator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_tier ON creator_performance;
CREATE TRIGGER trigger_auto_tier
AFTER INSERT ON creator_performance
FOR EACH ROW EXECUTE FUNCTION auto_update_creator_tier();

-- 7.2 Auto-count creator content on task approval
CREATE OR REPLACE FUNCTION auto_count_creator_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    UPDATE creators SET
      content_count = COALESCE(content_count, 0) + 1,
      last_content_date = NOW()
    WHERE id = NEW.creator_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_count_content ON creator_tasks;
CREATE TRIGGER trigger_count_content
AFTER INSERT OR UPDATE ON creator_tasks
FOR EACH ROW EXECUTE FUNCTION auto_count_creator_content();

-- 7.3 Auto-mark overdue tasks
CREATE OR REPLACE FUNCTION auto_mark_overdue_tasks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deadline < CURRENT_DATE AND NEW.status IN ('sent', 'acknowledged') THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_overdue ON creator_tasks;
CREATE TRIGGER trigger_overdue
BEFORE UPDATE ON creator_tasks
FOR EACH ROW EXECUTE FUNCTION auto_mark_overdue_tasks();

-- ============================================================================
-- 8. SEED: Angle Library (all brands → creative_angles)
-- ============================================================================
-- Requires: 20260406_creative_factory.sql applied first (creates creative_angles table)

-- ── THIOCYN (18 Angles) ────────────────────────────────────────────────────

INSERT INTO creative_angles (brand_slug, code, category, name, hook_de, hook_en, persona, awareness_stage, format, performance_tag) VALUES
-- Problem Angles
('thiocyn', 'PROB01', 'problem', 'Kontrollverlust',
 'Du siehst die kahle Stelle im Spiegel und hoffst, dass sie niemand sonst bemerkt.',
 'You see the thin spot in the mirror and hope nobody else notices.',
 ARRAY['Sandra', 'Lena'], 'problem_aware', ARRAY['UGC Story', 'Talking Head'], 'untested'),
('thiocyn', 'PROB02', 'problem', 'Tabu Haarausfall Frauen',
 'Niemand redet über Haarausfall bei Frauen. Dabei betrifft es jede dritte Frau über 40.',
 'Nobody talks about women''s hair loss. Yet it affects one in three women over 40.',
 ARRAY['Sandra'], 'problem_aware', ARRAY['UGC', 'Carousel'], 'untested'),
('thiocyn', 'PROB03', 'problem', 'Nebenwirkungen anderer Produkte',
 'Finasteride hat Nebenwirkungen auf die Sexualfunktion. Minoxidil muss lebenslang genommen werden.',
 'Finasteride comes with sexual side effects. Minoxidil needs lifelong use.',
 ARRAY['Markus'], 'solution_aware', ARRAY['Comparison Split-Screen'], 'untested'),
('thiocyn', 'PROB04', 'problem', 'Menopause-Scham',
 'Haarausfall in der Menopause ist real — und niemand redet darüber.',
 'Menopausal hair loss is real — and nobody talks about it.',
 ARRAY['Sandra'], 'problem_aware', ARRAY['Erfahrungsbericht 60s'], 'untested'),
('thiocyn', 'PROB05', 'problem', 'Stress-bedingter Ausfall',
 'Dein Stress zeigt sich nicht nur an deiner Haut — sondern auch an deinen Haaren.',
 'Your stress doesn''t just show on your skin — it shows in your hair.',
 ARRAY['Lena'], 'problem_aware', ARRAY['Reel', 'Hook-first'], 'untested'),
-- Mechanism Angles
('thiocyn', 'MECH01', 'mechanism', 'Körpereigenes Molekül',
 'Das Molekül in diesem Serum produziert dein Körper selbst — deshalb gibt es keine Nebenwirkungen.',
 'The molecule in this serum? Your body already makes it. Zero side effects.',
 ARRAY['Alle'], 'solution_aware', ARRAY['Talking Head', 'Doku-Stil'], 'untested'),
('thiocyn', 'MECH02', 'mechanism', '30 Jahre Forschung',
 'Prof. Dr. Axel Kramer hat 30 Jahre geforscht, um das Molekül zu isolieren, das deinen Haarfollikeln fehlt.',
 'After 30 years of research, Prof. Dr. Axel Kramer isolated the molecule your hair follicles are missing.',
 ARRAY['Sandra', 'Lena'], 'solution_aware', ARRAY['60-90s Doku-Stil'], 'untested'),
('thiocyn', 'MECH03', 'mechanism', 'Topisch statt systemisch',
 'Die meisten Haarausfall-Produkte greifen in dein Hormonsystem ein. Thiocyn nicht.',
 'Most hair loss products mess with your hormones. Thiocyn doesn''t.',
 ARRAY['Sandra', 'Markus'], 'solution_aware', ARRAY['Talking Head'], 'untested'),
('thiocyn', 'MECH04', 'mechanism', 'Thiocyanat-Erklärung',
 'Dein Körper produziert Thiocyanat natürlich — nur nicht immer genug. Genau hier setzt dieses Serum an.',
 'Your body naturally produces thiocyanate — just not always enough.',
 ARRAY['Lena'], 'solution_aware', ARRAY['Ingredient Breakdown'], 'untested'),
-- Aspiration Angles
('thiocyn', 'ASPI01', 'aspiration', 'Confidence that grows',
 'Stell dir vor, du greifst dir in die Haare und fühlst — mehr als gestern.',
 'Imagine running your fingers through your hair and feeling — more than yesterday.',
 ARRAY['Alle'], 'solution_aware', ARRAY['Cinematic', 'Lifestyle'], 'untested'),
('thiocyn', 'ASPI02', 'aspiration', 'Spiegel-Moment',
 'Der Moment, wenn du in den Spiegel schaust und zum ersten Mal seit Monaten lächelst.',
 'The moment you look in the mirror and smile for the first time in months.',
 ARRAY['Sandra'], 'most_aware', ARRAY['UGC Story'], 'untested'),
('thiocyn', 'ASPI03', 'aspiration', 'Kontrolle zurück',
 'Haarausfall hat mir das Gefühl gegeben, meinen Körper nicht mehr zu kennen. Jetzt kenne ich ihn wieder.',
 'Hair loss made me feel like I didn''t know my own body anymore. Now I do again.',
 ARRAY['Sandra', 'Lena'], 'most_aware', ARRAY['Testimonial UGC'], 'untested'),
-- Social Proof Angles
('thiocyn', 'SOCI01', 'social_proof', 'Kahle Stelle zugewachsen',
 'Meine kahle Stelle ist wieder komplett zugewachsen. Nach 6 Monaten Thiocyn.',
 'My bald spot grew back. Completely. After 6 months.',
 ARRAY['Alle'], 'most_aware', ARRAY['Vorher/Nachher UGC'], 'untested'),
('thiocyn', 'SOCI02', 'social_proof', 'Weniger Ausfall nach 8 Wochen',
 'Nach 8 Wochen: weniger Haare auf dem Kissen. Nach 4 Monaten: neue Haare an der Stirn.',
 'After 8 weeks: fewer hairs on my pillow. After 4 months: new growth at my hairline.',
 ARRAY['Markus'], 'solution_aware', ARRAY['Timeline UGC'], 'untested'),
('thiocyn', 'SOCI03', 'social_proof', '100-Tage-Garantie',
 '100 Tage testen. Wenn du keinen Unterschied siehst — Geld zurück. Ohne Diskussion.',
 '100 days to try. No difference? Money back. No questions.',
 ARRAY['Alle'], 'most_aware', ARRAY['CTA-driven Static/Reel'], 'untested'),
-- Contrarian Angles
('thiocyn', 'CONT01', 'contrarian', 'Anti-Supplement',
 'Vergiss Biotin-Tabletten. Sie wirken nicht dort, wo dein Haar tatsächlich wächst.',
 'Forget biotin supplements. They don''t work where your hair actually grows.',
 ARRAY['Lena'], 'solution_aware', ARRAY['Myth-Buster Reel'], 'untested'),
('thiocyn', 'CONT02', 'contrarian', 'Anti-Finasteride',
 'Finasteride wurde als Prostata-Medikament entwickelt. Haarwuchs war ein Nebeneffekt.',
 'Finasteride was designed for prostate issues. Hair growth was a side effect.',
 ARRAY['Markus'], 'solution_aware', ARRAY['Comparison', 'Talking Head'], 'untested'),
-- Identity Angles
('thiocyn', 'IDEN01', 'identity', 'Informed Skeptic',
 'Ich habe alles probiert. Biotin. Koffein-Shampoo. Minoxidil. Nichts hat funktioniert — bis ich verstanden habe, warum.',
 'I tried everything. Biotin. Caffeine shampoo. Minoxidil. Nothing worked — until I understood why.',
 ARRAY['Lena', 'Markus'], 'solution_aware', ARRAY['Story-driven UGC'], 'untested')
ON CONFLICT (brand_slug, code) DO NOTHING;

-- ── TAKE A SHOT (16 Angles) ────────────────────────────────────────────────

INSERT INTO creative_angles (brand_slug, code, category, name, hook_de, persona, awareness_stage, format, performance_tag) VALUES
('take-a-shot', 'PROB01', 'problem', 'Billig vs. Teuer Dilemma', 'Sonnenbrillen sind entweder Plastik für 15€ oder Logo für 250€. Wo ist die Mitte?', ARRAY['Conscious Explorer'], 'problem_aware', ARRAY['Comparison Reel'], 'untested'),
('take-a-shot', 'PROB02', 'problem', 'Wegwerfkultur', 'Drei Sonnenbrillen pro Sommer. Alle kaputt. Vielleicht liegt''s nicht an dir.', ARRAY['Conscious Explorer'], 'problem_aware', ARRAY['UGC Story'], 'untested'),
('take-a-shot', 'ASPI01', 'aspiration', 'Moment-First', 'Der perfekte Sonnenuntergang. Keine Kamera. Nur du und der Moment.', ARRAY['Conscious Explorer'], 'solution_aware', ARRAY['Cinematic Lifestyle'], 'untested'),
('take-a-shot', 'ASPI02', 'aspiration', 'Adventure Identity', 'Du brauchst keine Bucket List. Du brauchst den Mut, einfach loszugehen.', ARRAY['Conscious Explorer'], 'unaware', ARRAY['Lifestyle Reel'], 'untested'),
('take-a-shot', 'ASPI03', 'aspiration', 'Slow Living', 'Weniger planen. Mehr sehen. Das ist der Plan.', ARRAY['Conscious Explorer'], 'unaware', ARRAY['Silent Lifestyle'], 'untested'),
('take-a-shot', 'IDEN01', 'identity', 'Anti-Mainstream', 'Ich trage keine Marke. Ich trage eine Haltung.', ARRAY['Conscious Explorer'], 'solution_aware', ARRAY['POV Reel'], 'untested'),
('take-a-shot', 'IDEN02', 'identity', 'Handwerk-Wert', 'Jede Brille hat einen Holzarm, der von Hand geschliffen wurde. Fällt nicht auf. Fühlt sich aber anders an.', ARRAY['Conscious Explorer'], 'solution_aware', ARRAY['Product Close-up'], 'untested'),
('take-a-shot', 'SOCI01', 'social_proof', 'Langlebigkeit', 'Meine Take A Shot ist jetzt 5 Jahre alt. Sieht immer noch aus wie neu.', ARRAY['Conscious Explorer'], 'most_aware', ARRAY['UGC Testimonial'], 'untested'),
('take-a-shot', 'SOCI02', 'social_proof', 'Material Story', 'Nussbaum, Kirsche oder Ebenholz — welches Holz passt zu dir?', ARRAY['Conscious Explorer'], 'solution_aware', ARRAY['Product Carousel'], 'untested'),
('take-a-shot', 'CONT01', 'contrarian', 'Anti-Luxus', 'Du zahlst bei Ray-Ban 200€ für ein Logo. Nicht für die Brille.', ARRAY['Conscious Explorer'], 'solution_aware', ARRAY['Comparison'], 'untested'),
('take-a-shot', 'CONT02', 'contrarian', 'Anti-Trend', 'Trends kommen und gehen. Holz bleibt.', ARRAY['Conscious Explorer'], 'problem_aware', ARRAY['Lifestyle Reel'], 'untested'),
('take-a-shot', 'MECH01', 'mechanism', 'Materialqualität', 'Bio-TR-90 + polarisierte Gläser + 100% UV-Schutz. Für unter 100€.', ARRAY['Conscious Explorer'], 'solution_aware', ARRAY['Ingredient Breakdown'], 'untested'),
('take-a-shot', 'TRUST01', 'trust', 'Transparenz', 'Wir haben Fehler gemacht. So haben wir es geändert.', ARRAY['Alle'], 'problem_aware', ARRAY['Brand Statement'], 'untested'),
('take-a-shot', 'TRUST02', 'trust', 'Lieferversprechen', 'Bestellt. Verpackt. Bei dir in 1-2 Tagen. Versprochen.', ARRAY['Alle'], 'most_aware', ARRAY['Process Reel'], 'untested')
ON CONFLICT (brand_slug, code) DO NOTHING;

-- ── PAIGH (16 Angles) ──────────────────────────────────────────────────────

INSERT INTO creative_angles (brand_slug, code, category, name, hook_de, persona, awareness_stage, format, performance_tag) VALUES
('paigh', 'PROB01', 'problem', 'Fast Fashion Reue', 'Du hast 47 Teile im Schrank und nichts, worin du dich wirklich wohlfühlst.', ARRAY['Bewusste Frauen 30-50'], 'problem_aware', ARRAY['UGC Story'], 'untested'),
('paigh', 'PROB02', 'problem', 'Unbequem = Standard', 'Die meisten Hosen sind für Meetings gemacht. Nicht für dein Leben.', ARRAY['Bewusste Frauen 30-50'], 'problem_aware', ARRAY['Try-On Reel'], 'untested'),
('paigh', 'ASPI01', 'aspiration', 'Leichtigkeit', 'Es darf leicht sein. Nicht perfekt.', ARRAY['Bewusste Frauen 30-50'], 'unaware', ARRAY['Alo-Style Silent'], 'untested'),
('paigh', 'ASPI02', 'aspiration', 'Selbstfreundschaft', 'Kleidung, die dich nicht verkleidet. Sondern zeigt.', ARRAY['Bewusste Frauen 30-50'], 'solution_aware', ARRAY['Lifestyle Reel'], 'untested'),
('paigh', 'ASPI03', 'aspiration', 'Freedom Feeling', 'Barfuß, Kaffee, Paigh. Mehr brauchst du nicht für einen guten Morgen.', ARRAY['Bewusste Frauen 30-50'], 'unaware', ARRAY['Morning Routine Reel'], 'untested'),
('paigh', 'ASPI04', 'aspiration', 'Körperakzeptanz', 'Keine Größentabelle sagt dir, wer du bist.', ARRAY['Bewusste Frauen 30-50'], 'problem_aware', ARRAY['Identity Reel'], 'untested'),
('paigh', 'IDEN01', 'identity', 'Anti-Konsum', 'Ich bin nicht Fast Fashion. Ich kaufe weniger — aber richtig.', ARRAY['Bewusste Frauen 30-50'], 'solution_aware', ARRAY['POV Reel'], 'untested'),
('paigh', 'IDEN02', 'identity', 'Fair Trade Statement', 'WFTO-zertifiziert. Nicht weil es trendy ist. Sondern weil es richtig ist.', ARRAY['Bewusste Frauen 30-50'], 'solution_aware', ARRAY['Brand Value'], 'untested'),
('paigh', 'SOCI01', 'social_proof', 'Vielseitigkeit', 'Büro, Strand, Sofa — eine Hose für alles.', ARRAY['Bewusste Frauen 30-50'], 'solution_aware', ARRAY['Style-it-with-me'], 'untested'),
('paigh', 'SOCI02', 'social_proof', 'Community Love', 'Warum unsere Kundinnen ihre Paigh-Hose Lieblingshose nennen.', ARRAY['Bewusste Frauen 30-50'], 'most_aware', ARRAY['Review UGC'], 'untested'),
('paigh', 'CONT01', 'contrarian', 'Anti-Aktivismus', 'Wir posten keine Sprüche über Nachhaltigkeit. Wir machen einfach.', ARRAY['Bewusste Frauen 30-50'], 'solution_aware', ARRAY['Brand Statement'], 'untested'),
('paigh', 'MECH01', 'mechanism', 'Comfort Test', 'Yoga, Fahrrad, Sofa — der Squat-Test besteht sie alle.', ARRAY['Bewusste Frauen 30-50'], 'solution_aware', ARRAY['Squat/Comfort Test UGC'], 'untested')
ON CONFLICT (brand_slug, code) DO NOTHING;

-- ── DR. SEVERIN (14 Angles) ────────────────────────────────────────────────

INSERT INTO creative_angles (brand_slug, code, category, name, hook_de, persona, awareness_stage, format, performance_tag) VALUES
('dr-severin', 'PROB01', 'problem', 'Produktskepsis', '90% der Hautpflege-Produkte im Regal? Marketing. Keine Wirkung.', ARRAY['Frauen 25-50'], 'problem_aware', ARRAY['Educational Reel'], 'untested'),
('dr-severin', 'PROB02', 'problem', 'Konzentrations-Lüge', '5% Vitamin C klingt gut. Aber es reicht nicht. Hier ist warum.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Ingredient Breakdown'], 'untested'),
('dr-severin', 'PROB03', 'problem', 'Routine-Overload', '12 Schritte Skincare-Routine? Du brauchst 3 Produkte. Die richtigen.', ARRAY['Frauen 25-50'], 'problem_aware', ARRAY['Myth-Buster'], 'untested'),
('dr-severin', 'MECH01', 'mechanism', 'Wirkstoff-Konzentration', '12% Vitamin C. Nicht 5%. Nicht mit Vitamin C. Sondern 12%.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Ingredient Breakdown'], 'untested'),
('dr-severin', 'MECH02', 'mechanism', 'Bakuchiol-Alternative', 'Retinol ohne Irritation? 1% Bakuchiol — die vegane Alternative.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Comparison Reel'], 'untested'),
('dr-severin', 'MECH03', 'mechanism', 'Made in Germany Standard', 'Hergestellt in Deutschland unter pharmazeutischen Standards.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Authority Reel'], 'untested'),
('dr-severin', 'ASPI01', 'aspiration', 'Real Results', 'Sichtbare Ergebnisse. Nicht sichtbare Versprechungen.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Before/After UGC'], 'untested'),
('dr-severin', 'SOCI01', 'social_proof', 'Innovationspreis', 'Goethe-Universität Innovationspreis. Amazon Bestseller. Apotheken-gelistet.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Authority Stack'], 'untested'),
('dr-severin', 'SOCI02', 'social_proof', 'Creator Validation', 'BloggerBoxx-Creators testen Dr. Severin — ungefiltert.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Creator Repost'], 'untested'),
('dr-severin', 'CONT01', 'contrarian', 'Anti-K-Beauty', '10-Step Routines sind Marketing. Nicht Wissenschaft.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['Myth-Buster'], 'untested'),
('dr-severin', 'CONT02', 'contrarian', 'Anti-Hype', 'Kein Influencer-Hype. Kein TikTok-Trend. Nur Wirkstoff-Konzentration.', ARRAY['Frauen 25-50'], 'problem_aware', ARRAY['Brand Statement'], 'untested'),
('dr-severin', 'IDEN01', 'identity', 'Smart Skincare', 'Ich lese Inhaltsstoffe. Nicht Influencer-Captions.', ARRAY['Frauen 25-50'], 'solution_aware', ARRAY['POV Reel'], 'untested')
ON CONFLICT (brand_slug, code) DO NOTHING;

-- ── WRISTR (10 Angles) ─────────────────────────────────────────────────────

INSERT INTO creative_angles (brand_slug, code, category, name, hook_de, persona, awareness_stage, format, performance_tag) VALUES
('wristr', 'PROB01', 'problem', 'Standard-Band Langeweile', 'Jede Apple Watch sieht gleich aus. Deswegen trägst du ein Accessoire, kein Gadget.', ARRAY['Apple Watch User'], 'problem_aware', ARRAY['ASMR Unboxing'], 'untested'),
('wristr', 'PROB02', 'problem', 'Billig-Bänder', 'Dein drittes Amazon-Band in 6 Monaten? Vielleicht liegt''s am Material.', ARRAY['Apple Watch User'], 'problem_aware', ARRAY['Comparison Macro'], 'untested'),
('wristr', 'ASPI01', 'aspiration', 'Wrist as Canvas', 'Dein Handgelenk. Deine Identität. Nicht Apples.', ARRAY['Apple Watch User'], 'solution_aware', ARRAY['Lifestyle POV'], 'untested'),
('wristr', 'ASPI02', 'aspiration', 'Premium Feel', 'Das Gefühl, wenn du ein Band trägst, das sich anfühlt wie 500€ — aber keins kostet.', ARRAY['Apple Watch User'], 'solution_aware', ARRAY['ASMR Close-up'], 'untested'),
('wristr', 'IDEN01', 'identity', 'Subtle Flex', 'Kein Logo. Kein Statement. Nur Qualität, die man fühlt.', ARRAY['Apple Watch User'], 'solution_aware', ARRAY['Macro Reel'], 'untested'),
('wristr', 'IDEN02', 'identity', 'Corporate Chic', 'Dein Team. Dein Brand. Am Handgelenk.', ARRAY['B2B Decision Maker'], 'solution_aware', ARRAY['B2B Showcase'], 'untested'),
('wristr', 'SOCI01', 'social_proof', 'Unboxing Moment', 'Der Moment, wenn du es zum ersten Mal anlegst.', ARRAY['Apple Watch User'], 'most_aware', ARRAY['ASMR Unboxing'], 'untested'),
('wristr', 'MECH01', 'mechanism', 'Material-Detail', 'Italienisches Leder. Chirurgenstahl-Adapter. Millimeter-genaue Passform.', ARRAY['Apple Watch User'], 'solution_aware', ARRAY['Macro Detail'], 'untested'),
('wristr', 'CONT01', 'contrarian', 'Anti-Silikon', 'Silikon-Bänder sind für Sport. Nicht für dein Leben.', ARRAY['Apple Watch User'], 'problem_aware', ARRAY['Split-Screen'], 'untested')
ON CONFLICT (brand_slug, code) DO NOTHING;

-- ── TIMBER & JOHN (4 Skeleton Angles) ──────────────────────────────────────

INSERT INTO creative_angles (brand_slug, code, category, name, hook_de, persona, awareness_stage, format, performance_tag) VALUES
('timber-john', 'PROB01', 'problem', 'Digital Overload', 'Du starrst 8 Stunden auf einen Bildschirm. Deine Kleidung sollte sich anfühlen wie das Gegenteil.', ARRAY['Naturverbundene 35-55'], 'problem_aware', ARRAY['Cinema of Quietness'], 'untested'),
('timber-john', 'ASPI01', 'aspiration', 'Geerdet sein', 'Wenn der Stoff sich anfühlt wie ein Sonntag im Wald.', ARRAY['Naturverbundene 35-55'], 'unaware', ARRAY['Silent Lifestyle'], 'untested'),
('timber-john', 'IDEN01', 'identity', 'Dual Use', 'Im Wald genauso richtig wie in der Stadt.', ARRAY['Naturverbundene 35-55'], 'solution_aware', ARRAY['Lifestyle Split'], 'untested'),
('timber-john', 'MECH01', 'mechanism', 'Handwerksqualität', 'Von Hand. Mit Zeit. Für Jahre.', ARRAY['Naturverbundene 35-55'], 'solution_aware', ARRAY['Making-of'], 'untested')
ON CONFLICT (brand_slug, code) DO NOTHING;

-- ============================================================================
-- Done. Verify:
--   SELECT brand_slug, code, category FROM creative_angles ORDER BY brand_slug, code;
--   SELECT brand_slug, branded_hashtag FROM hashtag_strategies;
--   SELECT brand_slug, week_in_cycle, direction_key FROM content_directions ORDER BY brand_slug, week_in_cycle;
--   SELECT * FROM creator_scoreboard LIMIT 10;
--   SELECT * FROM creator_operator_dashboard;
--   SELECT * FROM weekly_content_status;
-- ============================================================================
