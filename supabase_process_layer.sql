-- ============================================================================
-- Business OS — Process & Knowledge Layer
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- Tables: processes, process_steps, knowledge_entries
-- Run AFTER supabase_brand_layer.sql
-- Safe: IF NOT EXISTS / idempotent seeds
-- ============================================================================

-- ============================================================================
-- TABLE: processes
-- ============================================================================
-- SOPs as database records — codified, assignable, trackable.

CREATE TABLE IF NOT EXISTS processes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL
              CHECK (category IN ('hiring', 'hr', 'finance', 'marketing', 'cs', 'ops', 'dev')),
  brand_slug  TEXT REFERENCES brands(slug) ON DELETE SET NULL, -- NULL = cross-brand
  trigger     TEXT,          -- What starts this process: 'new_application' | 'manual' | etc.
  owner_role  TEXT,          -- Who is responsible: 'luis' | 'intern' | 'vanessa'
  est_minutes INTEGER,       -- Estimated total time in minutes
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE processes IS
'Standard Operating Procedures. NULL brand_slug = applies to all brands.';

DROP TRIGGER IF EXISTS trigger_processes_updated_at ON processes;
CREATE TRIGGER trigger_processes_updated_at
BEFORE UPDATE ON processes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processes_authenticated" ON processes
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: process_steps
-- ============================================================================

CREATE TABLE IF NOT EXISTS process_steps (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id      UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  step_number     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  assignee_role   TEXT,        -- 'luis' | 'intern' | 'vanessa' | 'valentin' | 'agent'
  est_minutes     INTEGER,
  required_access TEXT[],      -- e.g. ['shopify', 'supabase', 'paigh']
  is_automated    BOOLEAN DEFAULT FALSE,
  automation_ref  TEXT,        -- n8n workflow name if automated
  UNIQUE (process_id, step_number)
);

ALTER TABLE process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "process_steps_authenticated" ON process_steps
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: knowledge_entries
-- ============================================================================
-- Brand briefs, guidelines, SOPs as searchable text — accessible by agents and humans.

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug  TEXT REFERENCES brands(slug) ON DELETE SET NULL, -- NULL = company-wide
  category    TEXT NOT NULL
              CHECK (category IN ('brand_brief', 'sop', 'guideline', 'legal', 'finance', 'hr', 'product', 'market_intel')),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  tags        TEXT[] DEFAULT ARRAY[]::TEXT[],
  source      TEXT,            -- 'notion' | 'manual' | 'agent_generated'
  version     INTEGER DEFAULT 1,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE knowledge_entries IS
'Brand knowledge base — briefs, SOPs, guidelines. Read by agents for context. Searchable by humans.';

CREATE INDEX IF NOT EXISTS idx_knowledge_brand    ON knowledge_entries(brand_slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_active   ON knowledge_entries(active) WHERE active = TRUE;

DROP TRIGGER IF EXISTS trigger_knowledge_updated_at ON knowledge_entries;
CREATE TRIGGER trigger_knowledge_updated_at
BEFORE UPDATE ON knowledge_entries
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_authenticated" ON knowledge_entries
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SEEDS: processes
-- ============================================================================

INSERT INTO processes (slug, title, description, category, brand_slug, trigger, owner_role, est_minutes) VALUES

-- Hiring
('application-review',
 'New Application Review',
 'Full pipeline from application received to hire/reject decision.',
 'hiring', NULL, 'new_application', 'luis', 45),

-- HR
('intern-onboarding',
 'Intern Onboarding',
 'Full onboarding process for a new intern from invite to first standup.',
 'hr', NULL, 'manual', 'luis', 60),

-- Finance
('dispute-triage',
 'Payment Dispute Triage',
 'Categorize, investigate and respond to incoming PayPal/Stripe/Klarna disputes.',
 'finance', NULL, 'webhook_dispute', 'vanessa', 30),

('invoice-processing',
 'Incoming Invoice Processing',
 'Receive, categorize, and file incoming vendor invoices.',
 'finance', NULL, 'webhook_invoice', 'vanessa', 15),

-- Marketing
('ugc-freelancer-onboarding',
 'UGC Freelancer Onboarding',
 'Source, brief, contract and onboard a new UGC freelancer.',
 'marketing', 'thiocyn', 'manual', 'intern', 120),

('content-publishing',
 'Content Publishing SOP',
 'From brief to live post: creation, review, scheduling, monitoring.',
 'marketing', NULL, 'content_brief', 'intern', 90),

('influencer-outreach',
 'Influencer / Ambassador Outreach',
 'Identify, outreach, onboard and activate an influencer ambassador.',
 'marketing', NULL, 'manual', 'intern', 180),

-- CS
('cs-escalation',
 'Customer Support Escalation',
 'When and how interns escalate CS tickets to Luis.',
 'cs', NULL, 'cs_ticket', 'intern', 20)

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEEDS: process_steps
-- ============================================================================

-- 1. Application Review
DO $$
DECLARE p_id UUID;
BEGIN
  SELECT id INTO p_id FROM processes WHERE slug = 'application-review';
  INSERT INTO process_steps (process_id, step_number, title, description, assignee_role, est_minutes, is_automated, automation_ref) VALUES
  (p_id, 1, 'AI Score runs automatically',
   'On form submit, n8n workflow application-auto-score.json calls Anthropic and sets aiScore + stage.',
   'agent', 2, TRUE, 'application-auto-score'),
  (p_id, 2, 'Review application in dashboard',
   'Open Hiring → Applications. Check aiScore, project_highlight, LinkedIn, psychometrics.',
   'luis', 5, FALSE, NULL),
  (p_id, 3, 'Stage decision',
   'Move to Shortlist, Reject, or keep as Applied. Add note with reason.',
   'luis', 3, FALSE, NULL),
  (p_id, 4, 'Send status email',
   'Use Email Templates: Shortlist Invite or Rejection. Personalise before sending.',
   'luis', 5, FALSE, NULL),
  (p_id, 5, 'Schedule interview (if shortlisted)',
   'Calendly or manual scheduling. Send calendar invite with prep instructions.',
   'luis', 5, FALSE, NULL),
  (p_id, 6, 'Conduct interview',
   '30 min structured: motivation, skills demo, culture fit. Notes in application.',
   'luis', 30, FALSE, NULL),
  (p_id, 7, 'Send work sample task',
   'Dashboard: Hiring → Kanban → Send Task Link button. Task auto-emails via n8n.',
   'luis', 3, FALSE, NULL),
  (p_id, 8, 'Final decision and offer',
   'Review work sample. If hired: set stage=hired, trigger onboarding process.',
   'luis', 10, FALSE, NULL)
  ON CONFLICT (process_id, step_number) DO NOTHING;
END $$;

-- 2. Intern Onboarding
DO $$
DECLARE p_id UUID;
BEGIN
  SELECT id INTO p_id FROM processes WHERE slug = 'intern-onboarding';
  INSERT INTO process_steps (process_id, step_number, title, description, assignee_role, est_minutes, required_access) VALUES
  (p_id, 1, 'Create Hartlimes email account',
   'Format: firstname@mail.hartlimesgmbh.de. Google Workspace admin required.',
   'valentin', 5, ARRAY['google_workspace_admin']),
  (p_id, 2, 'Invite to Business OS',
   'Admin → Team → Invite. Set role (intern), allowed sections per role definition.',
   'luis', 3, ARRAY['business_os_admin']),
  (p_id, 3, 'Grant tool access',
   'See Tools & Access table in intern-management-system.md. Provision per role.',
   'valentin', 10, ARRAY['google_workspace_admin']),
  (p_id, 4, 'Share role documentation',
   'Send link to role definition in intern-management-system.md + relevant SOPs.',
   'luis', 5, NULL),
  (p_id, 5, 'Run 15-min kickoff call',
   'Expectations, tools, first task, questions. Do on their first day.',
   'luis', 15, NULL),
  (p_id, 6, 'Add to standup calendar invite',
   'Monday 11:00. Zoom or in-person. Send Google Calendar invite.',
   'luis', 2, ARRAY['google_calendar']),
  (p_id, 7, 'Assign first task in Business OS',
   'Simple L1 task. Sets expectations and tests tool access.',
   'luis', 5, NULL)
  ON CONFLICT (process_id, step_number) DO NOTHING;
END $$;

-- 3. Dispute Triage
DO $$
DECLARE p_id UUID;
BEGIN
  SELECT id INTO p_id FROM processes WHERE slug = 'dispute-triage';
  INSERT INTO process_steps (process_id, step_number, title, description, assignee_role, est_minutes, is_automated, automation_ref) VALUES
  (p_id, 1, 'Dispute received and logged',
   'n8n webhook from PayPal/Stripe/Klarna auto-inserts into disputes table and notifies Vanessa.',
   'agent', 1, TRUE, 'dispute-triage'),
  (p_id, 2, 'Categorize dispute',
   'Finance → Disputes. Category: Delivery | Refund Request | Fraud | Duplicate.',
   'vanessa', 5, FALSE, NULL),
  (p_id, 3, 'Find linked order',
   'Search order in Shopify or Billbee. Attach order ID to dispute record.',
   'vanessa', 5, ARRAY['shopify', 'billbee']),
  (p_id, 4, 'Check delivery proof',
   'DHL/DPD tracking. Screenshot proof and attach to dispute.',
   'vanessa', 5, NULL),
  (p_id, 5, 'Respond before deadline',
   'Reply in PayPal/Stripe/Klarna before deadline. Response template in Knowledge Base.',
   'vanessa', 10, NULL),
  (p_id, 6, 'Escalate if >150€ or complex',
   'Brief Luis with: amount, reason, delivery status, recommended action.',
   'vanessa', 5, NULL),
  (p_id, 7, 'Mark resolved in dashboard',
   'Finance → Disputes → set status = resolved. Add resolution notes.',
   'vanessa', 2, FALSE, NULL)
  ON CONFLICT (process_id, step_number) DO NOTHING;
END $$;

-- 4. UGC Freelancer Onboarding
DO $$
DECLARE p_id UUID;
BEGIN
  SELECT id INTO p_id FROM processes WHERE slug = 'ugc-freelancer-onboarding';
  INSERT INTO process_steps (process_id, step_number, title, description, assignee_role, est_minutes) VALUES
  (p_id, 1, 'Source candidate',
   'Platforms: Fiverr, Backstage, TikTok Creator Marketplace. Criteria: Engagement >3%, niche fit, ≤500 USD/video.',
   'intern', 30),
  (p_id, 2, 'Create shortlist profile',
   'Doc: Handle, platform, rate, availability, niche fit score (1–5), sample link.',
   'intern', 15),
  (p_id, 3, 'Send brief via template',
   'Use UGC Brief Template from Knowledge Base. Personalise hook angle and product.',
   'intern', 10),
  (p_id, 4, 'Review application video / portfolio',
   'Score on: hook quality, pacing, authenticity, product handling. Min score 3/5.',
   'luis', 10),
  (p_id, 5, 'Contract + payment setup',
   'Standard freelancer contract. Payment via PayPal or Wise. Net-30 on delivery.',
   'luis', 15),
  (p_id, 6, 'Onboarding call (15 min)',
   'Product overview, brand tone, content dos/don\'ts, delivery format (9:16 MP4 ≥1080p).',
   'intern', 15),
  (p_id, 7, 'First deliverable review',
   'Check against brief. Max 2 revision rounds. On approval: pay + archive.',
   'luis', 10)
  ON CONFLICT (process_id, step_number) DO NOTHING;
END $$;

-- 5. Content Publishing SOP
DO $$
DECLARE p_id UUID;
BEGIN
  SELECT id INTO p_id FROM processes WHERE slug = 'content-publishing';
  INSERT INTO process_steps (process_id, step_number, title, description, assignee_role, est_minutes) VALUES
  (p_id, 1, 'Brief created',
   'Format: Brand, Platform, Format (Reel/Story/Feed), Hook, Key Message, CTA, Deadline.',
   'luis', 10),
  (p_id, 2, 'Creative produced',
   'Ekaterina produces in Canva or edits video. ≤48h turnaround from brief.',
   'intern', 45),
  (p_id, 3, 'Luis review',
   'Check brand guidelines, legal compliance (esp. Dr. Severin claims), visual quality.',
   'luis', 5),
  (p_id, 4, 'Caption + hashtags',
   'Write caption per brand voice. 3–5 targeted hashtags. First comment pre-written.',
   'intern', 10),
  (p_id, 5, 'Schedule in Meta Business Suite',
   'Upload, add caption, set schedule. Confirm timezone (CET).',
   'intern', 5),
  (p_id, 6, 'Publish + first comment',
   'Post goes live. Intern posts first comment within 10 min.',
   'intern', 5),
  (p_id, 7, 'Monitor 48h engagement',
   'Check reach, saves, shares, comments. Reply to comments within 4h.',
   'intern', 15)
  ON CONFLICT (process_id, step_number) DO NOTHING;
END $$;

-- 6. Customer Support Escalation
DO $$
DECLARE p_id UUID;
BEGIN
  SELECT id INTO p_id FROM processes WHERE slug = 'cs-escalation';
  INSERT INTO process_steps (process_id, step_number, title, description, assignee_role, est_minutes) VALUES
  (p_id, 1, 'Ticket received in Paigh',
   'Intern picks up ticket. First response target: ≤24h.',
   'intern', 5),
  (p_id, 2, 'Check Knowledge Base + FAQ',
   'Search knowledge_entries for answer. Standard replies for: shipping, returns, product questions.',
   'intern', 5),
  (p_id, 3, 'Respond if solvable',
   'Use response template. Mark resolved in Paigh. Log in tracking sheet.',
   'intern', 10),
  (p_id, 4, 'Escalate if not solvable',
   'Escalate to Luis in Slack with: ticket link, customer email, summary, recommended action.',
   'intern', 5),
  (p_id, 5, 'Luis decides + responds',
   'Within 4h. Brief intern on decision for future similar cases.',
   'luis', 10),
  (p_id, 6, 'Document resolution',
   'If recurring issue: add to Knowledge Base. Mark in tracking sheet.',
   'intern', 3)
  ON CONFLICT (process_id, step_number) DO NOTHING;
END $$;

-- ============================================================================
-- SEEDS: knowledge_entries
-- ============================================================================

INSERT INTO knowledge_entries (brand_slug, category, title, content, tags, source) VALUES

-- ============================================================
-- COMPANY-WIDE
-- ============================================================
(
  NULL, 'guideline', 'Hart Limes GmbH — Company Overview',
  'Hart Limes GmbH is an e-commerce aggregator (holding) based in Leverkusen, Germany. Operating 6 direct-to-consumer brands: Thiocyn (hair care), Take A Shot (eyewear/outdoor), Dr. Severin (premium skincare), Paigh (fair fashion), Wristr (smartwatch bands), Timber & John (naturmode, paused). Managing Director: Peter Hart. Founders Associate: Luis Lielienthal. Dev: Valentin. CMO: Matic. Finance: Vanessa. Primary e-commerce platform: Shopify. ERP: Billbee. CS platform: Paigh.',
  ARRAY['company', 'overview', 'structure'],
  'manual'
),
(
  NULL, 'hr', 'Intern Code of Conduct',
  'All interns are expected to: respond to messages within 24h on workdays (Mon–Fri), attend weekly standup Monday 11:00, complete assigned tasks by agreed deadlines, escalate blockers immediately (never sit on a blocked task >4h), not share internal data externally, use Hartlimes email for all work communication. Probation: Weeks 1–4 onboarding, Weeks 5–8 ramp-up, Week 9+ full KPI accountability. Max 20% time for ad-hoc requests outside core role.',
  ARRAY['interns', 'conduct', 'expectations'],
  'manual'
),
(
  NULL, 'sop', 'Dispute Response Template — Delivery Proof',
  'Template for responding to disputes where delivery can be confirmed: "Thank you for contacting us. We have reviewed your order and confirmed delivery via [carrier] on [date] to the address provided. Tracking number: [tracking]. Please find the proof of delivery attached. We consider this matter resolved. If you have any further questions, please contact us directly at [cs_email]." — Always attach screenshot of tracking confirmation.',
  ARRAY['dispute', 'template', 'cs'],
  'manual'
),
(
  NULL, 'finance', 'Dispute Escalation Rules',
  'Escalate to Luis when: dispute amount >150€, customer claims fraud (not just non-delivery), dispute is in Klarna (different process), case requires refund decision beyond standard policy, customer threatens legal action. Do NOT escalate: standard non-delivery with proof available, standard refund requests within return policy, duplicate orders (auto-refund).',
  ARRAY['dispute', 'escalation', 'finance'],
  'manual'
),
(
  NULL, 'legal', 'Marketing Claims — Legal Guardrails',
  'Across all brands: NEVER use "heilt", "kuriert", "behandelt" (medical claims). NEVER guarantee specific outcomes (weight loss, hair regrowth as medical fact). NEVER make comparative claims without substantiation. Dr. Severin: ingredient concentrations OK to state factually. Thiocyn: "körpereigenes Molekül" OK, "stoppt Haarausfall" needs qualification ("kann helfen"). Claims reviewed by: Luis before publishing. Escalate to Peter for anything legally ambiguous.',
  ARRAY['legal', 'compliance', 'claims', 'all-brands'],
  'manual'
),

-- ============================================================
-- THIOCYN
-- ============================================================
(
  'thiocyn', 'brand_brief', 'Thiocyn — Brand Brief',
  'POSITIONING: The first hair serum based on a body-own molecule (thiocyanate) — developed by Prof. Dr. Axel Kramer after 30 years of research. For women and men who want to stop hair loss without side effects, chemicals, or pills. PRIMARY CLAIM: "The only hair serum built on a molecule your body already produces." KEY PROOF: 100-day money-back guarantee (strongest risk reversal — always prominent), 100,000+ satisfied customers, Made in Germany, vegan, no animal testing. PERSONAS: Sandra (48, peri-menopausal hair loss), Markus (34, hereditary, rejects Finasteride). HOOK TYPES ranked: Shock → Curiosity → Mechanism → Relatable → Authority. MARKETS: DE + US (separate Meta accounts, separate creative).',
  ARRAY['brand-brief', 'positioning', 'thiocyn'],
  'manual'
),
(
  'thiocyn', 'sop', 'Thiocyn — UGC Brief Template',
  'BRIEF FORMAT for UGC freelancers: Brand: Thiocyn. Product: [specific serum]. Hook (pick one): (1) "I was losing 200 hairs a day until I found this..." (2) "Doctors don't want you to know this molecule exists in your own body..." (3) "3 months ago I couldn't fill in my crown. Here's what changed." Key message: body-own molecule, no side effects, Prof. Dr. Axel Kramer research. Must include: product in hand by 3s, before/after reference, 100-day guarantee CTA. Format: 9:16, 30–60s, subtitles, no intro/outro. Deliver: MP4 ≥1080p + B-roll.',
  ARRAY['ugc', 'brief', 'template', 'thiocyn'],
  'manual'
),

-- ============================================================
-- TAKE A SHOT
-- ============================================================
(
  'take-a-shot', 'brand_brief', 'Take A Shot — Brand Brief',
  'POSITIONING: Sustainable, handcrafted sunglasses for the Conscious Explorer. Founded 2012, Leverkusen. "Klein, persönlich & echt." AVATAR: Outdoor-affin, 30–38, gedeckte Farben, reflektiert, nachhaltig ohne Moralismus. CORE USP: Sustainable materials (Bio-TR-90, premium acetate, wood arms), 2-year guarantee, 44,000+ customers, personal brand feel. PRICE: €99 core. CRITICAL ISSUE: Public trust problem — visible customer complaints (delayed delivery, no email response) in IG comments. Content strategy must lead with trust-rebuilding, not product push. CONTENT: Action-first Reels, lifestyle outdoor, avoid static posts (0.03% engagement). UGC: @weil_ich_mode_mag organic reference (strong social proof).',
  ARRAY['brand-brief', 'positioning', 'take-a-shot'],
  'manual'
),

-- ============================================================
-- DR. SEVERIN
-- ============================================================
(
  'dr-severin', 'brand_brief', 'Dr. Severin — Brand Brief',
  'POSITIONING: Premium skincare with guaranteed visible results. "Wirksame Kosmetik für schöne, gesunde Haut." Made in Germany, cruelty-free, Goethe-Universität Innovationspreis. PRODUCTS: Anti-aging serums (Vitamin C 12%, Collagen 2.5%, Bakuchiol 1%), skin bundles, day/night creams. €69.90 core serums. DISTRIBUTION: D2C + pharmacies + Amazon + Ankorstore (B2B). LEGAL RULE: NO medical claims. Use: "pflegt", "unterstützt", "hilft das Erscheinungsbild zu verbessern" — never "heilt"/"behandelt". CONTENT: BloggerBoxx seeding is strongest channel. Creator-led UGC, clean lighting, Dermatologist POV format, "Yuck Factor" hooks.',
  ARRAY['brand-brief', 'positioning', 'dr-severin'],
  'manual'
),

-- ============================================================
-- PAIGH
-- ============================================================
(
  'paigh', 'brand_brief', 'Paigh — Brand Brief',
  'POSITIONING: Fair & comfortable fashion. "Wear what carries you." WFTO-certified, CO2-neutral shipping. Primary: harem pants + pareos + fair basics. Audience: Women, emotionally driven, self-friendship, body-awareness. TONE: Warm, personal, honest. Feeling before argument. Never pressure, never optimization. PAIGH WORDS: intentional, crafted, deins, Leichtigkeit, bei mir ankommen. CONTENT FRAMEWORK: 3–5 feed posts/week, max 1 video/week. Monthly vibe-led themes. STRONGEST LEVER: Collaboration giveaways (597 likes with @elopeactive vs. avg 10–20). Plan: min. 1 collab/month. UGC-first, no studio shoots needed.',
  ARRAY['brand-brief', 'positioning', 'paigh'],
  'manual'
),

-- ============================================================
-- WRISTR
-- ============================================================
(
  'wristr', 'brand_brief', 'Wristr — Brand Brief',
  'POSITIONING: Premium smartwatch bands D2C + B2B corporate. "Dein Brand am Handgelenk." 58.1k Instagram followers (largely inactive base — reactivation priority). D2C: Apple Watch users who want premium, design-forward bands. B2B: Corporate gifting (custom branded bands for companies). CONTENT: ASMR unboxing, macro product shots, lifestyle POV (hands/wrists). Hook: Sensorik / Ästhetik. STRATEGIC PRIORITY: Reactivate 58k followers via Reels-first strategy — currently 0.06% engagement. B2B pricing not confirmed.',
  ARRAY['brand-brief', 'positioning', 'wristr'],
  'manual'
),

-- ============================================================
-- TIMBER & JOHN
-- ============================================================
(
  'timber-john', 'brand_brief', 'Timber & John — Status Note',
  'STATUS: Paused. Mantel-GmbH wird verkauft. Brand-Asset bleibt in Hart Limes. Kein aktiver Content-Betrieb. Keine Neuzuordnung von Ressourcen bis Peter-Entscheidung über Zukunft. CS: eingestellt. Disputes: Keine Erstattungen (Peter-Entscheidung). Note for agents: Do not generate content, campaigns, or tasks for Timber & John without explicit Luis instruction.',
  ARRAY['brand-brief', 'status', 'timber-john', 'paused'],
  'manual'
),

-- ============================================================
-- CS KNOWLEDGE
-- ============================================================
(
  NULL, 'sop', 'CS — Standard Return Response',
  'Template: "Vielen Dank für Ihre Nachricht. Gerne nehmen wir Ihren Artikel zurück. Bitte senden Sie das Paket innerhalb von [X] Tagen an folgende Adresse zurück: [Rücksendeadresse]. Sobald wir den Eingang bestätigt haben, erstatten wir den Kaufpreis innerhalb von 5–7 Werktagen. Bei Fragen stehen wir gerne zur Verfügung." — Check brand-specific return policy before sending. Take A Shot: 30 Tage. Thiocyn: 100 Tage (money-back guarantee). Others: check Shopify settings.',
  ARRAY['cs', 'template', 'returns'],
  'manual'
),
(
  NULL, 'sop', 'CS — Shipping Delay Response',
  'Template: "Vielen Dank für Ihre Geduld. Wir entschuldigen uns für die Verzögerung Ihrer Bestellung [Bestellnummer]. Ihre Sendung wurde am [Datum] übergeben und befindet sich derzeit bei unserem Versandpartner. Tracking: [Link]. Laut aktueller Prognose sollte Ihre Bestellung bis [Datum] bei Ihnen eintreffen. Sollte sich daran etwas ändern, informieren wir Sie sofort." — If order >7 days late with no tracking update: escalate to Luis.',
  ARRAY['cs', 'template', 'shipping'],
  'manual'
)

ON CONFLICT DO NOTHING;

-- ============================================================================
-- Done. Verify:
--   SELECT slug, title FROM processes ORDER BY category;
--   SELECT COUNT(*) FROM process_steps;
--   SELECT brand_slug, title FROM knowledge_entries ORDER BY brand_slug;
-- ============================================================================
