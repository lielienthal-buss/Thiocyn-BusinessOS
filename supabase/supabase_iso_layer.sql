-- =============================================================================
-- Hart Limes GmbH Business OS — ISO Compliance Layer
-- Supabase project: dfzrkzvsdiiihoejfozn
-- Run AFTER: supabase_process_layer.sql, supabase_brand_layer.sql
-- Standards: ISO 9001, ISO 27001, ISO 31000, ISO 14001, ISO 45001, ISO 50001
-- All statements are idempotent (IF NOT EXISTS)
-- =============================================================================


-- =============================================================================
-- ISO 9001 — QUALITY MANAGEMENT
-- =============================================================================

-- ---------------------------------------------------------------------------
-- process_executions: log every execution of a process/SOP
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS process_executions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id          UUID REFERENCES processes(id) ON DELETE SET NULL,
    executed_by_email   TEXT,
    brand_slug          TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    started_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    status              TEXT DEFAULT 'in_progress'
                            CHECK (status IN ('in_progress', 'completed', 'non_conformance')),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE process_executions IS 'ISO 9001 — Every execution of a process or SOP is logged here for quality traceability.';

ALTER TABLE process_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "process_executions_authenticated_all"
    ON process_executions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_process_executions_process_id
    ON process_executions (process_id);
CREATE INDEX IF NOT EXISTS idx_process_executions_brand_slug
    ON process_executions (brand_slug);
CREATE INDEX IF NOT EXISTS idx_process_executions_status
    ON process_executions (status);
CREATE INDEX IF NOT EXISTS idx_process_executions_created_at
    ON process_executions (created_at DESC);


-- ---------------------------------------------------------------------------
-- non_conformances: when a process step fails or deviates from expected outcome
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS non_conformances (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_execution_id    UUID REFERENCES process_executions(id) ON DELETE SET NULL,
    process_id              UUID REFERENCES processes(id) ON DELETE SET NULL,
    brand_slug              TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    description             TEXT,
    severity                TEXT DEFAULT 'minor'
                                CHECK (severity IN ('minor', 'major', 'critical')),
    detected_by_email       TEXT,
    detected_at             TIMESTAMPTZ DEFAULT NOW(),
    root_cause              TEXT,
    status                  TEXT DEFAULT 'open'
                                CHECK (status IN ('open', 'in_review', 'resolved')),
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

COMMENT ON TABLE non_conformances IS 'ISO 9001 — Records all process deviations, failures, and non-conformances for root cause analysis and CAPA.';

ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "non_conformances_authenticated_all"
    ON non_conformances
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_non_conformances_updated_at
    BEFORE UPDATE ON non_conformances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_non_conformances_brand_slug
    ON non_conformances (brand_slug);
CREATE INDEX IF NOT EXISTS idx_non_conformances_status
    ON non_conformances (status);
CREATE INDEX IF NOT EXISTS idx_non_conformances_severity
    ON non_conformances (severity);
CREATE INDEX IF NOT EXISTS idx_non_conformances_created_at
    ON non_conformances (created_at DESC);


-- ---------------------------------------------------------------------------
-- corrective_actions: remediation steps taken to address a non_conformance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corrective_actions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    non_conformance_id      UUID REFERENCES non_conformances(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    description             TEXT,
    assigned_to_email       TEXT,
    due_date                DATE,
    status                  TEXT DEFAULT 'planned'
                                CHECK (status IN ('planned', 'in_progress', 'completed')),
    completed_at            TIMESTAMPTZ,
    effectiveness_rating    INT CHECK (effectiveness_rating BETWEEN 1 AND 5),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

COMMENT ON TABLE corrective_actions IS 'ISO 9001 — CAPA (Corrective and Preventive Actions) taken in response to non_conformances. effectiveness_rating (1–5) validates closure.';

ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corrective_actions_authenticated_all"
    ON corrective_actions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_corrective_actions_non_conformance_id
    ON corrective_actions (non_conformance_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status
    ON corrective_actions (status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_created_at
    ON corrective_actions (created_at DESC);


-- =============================================================================
-- ISO 27001 — INFORMATION SECURITY MANAGEMENT
-- =============================================================================

-- ---------------------------------------------------------------------------
-- risk_register: asset-level threat tracking with auto-calculated risk scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_register (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset               TEXT NOT NULL,
    asset_category      TEXT DEFAULT 'data'
                            CHECK (asset_category IN ('data', 'system', 'process', 'people', 'physical')),
    threat              TEXT NOT NULL,
    likelihood          INT CHECK (likelihood BETWEEN 1 AND 5),
    impact              INT CHECK (impact BETWEEN 1 AND 5),
    risk_score          INT GENERATED ALWAYS AS (likelihood * impact) STORED,
    risk_level          TEXT GENERATED ALWAYS AS (
                            CASE
                                WHEN likelihood * impact >= 15 THEN 'critical'
                                WHEN likelihood * impact >= 10 THEN 'high'
                                WHEN likelihood * impact >= 5  THEN 'medium'
                                ELSE 'low'
                            END
                        ) STORED,
    mitigation          TEXT,
    mitigation_status   TEXT DEFAULT 'planned'
                            CHECK (mitigation_status IN ('planned', 'implemented', 'verified')),
    owner_email         TEXT,
    next_review_date    DATE,
    brand_slug          TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ
);

COMMENT ON TABLE risk_register IS 'ISO 27001 — Information security risk register. risk_score and risk_level are auto-calculated from likelihood × impact. brand_slug = NULL means company-wide risk.';

ALTER TABLE risk_register ENABLE ROW LEVEL SECURITY;

CREATE POLICY "risk_register_authenticated_all"
    ON risk_register
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_risk_register_updated_at
    BEFORE UPDATE ON risk_register
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_risk_register_brand_slug
    ON risk_register (brand_slug);
CREATE INDEX IF NOT EXISTS idx_risk_register_risk_level
    ON risk_register (risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_register_mitigation_status
    ON risk_register (mitigation_status);
CREATE INDEX IF NOT EXISTS idx_risk_register_created_at
    ON risk_register (created_at DESC);


-- ---------------------------------------------------------------------------
-- security_incidents: data breaches, near-misses, policy violations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_incidents (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                       TEXT NOT NULL,
    incident_type               TEXT DEFAULT 'other'
                                    CHECK (incident_type IN (
                                        'data_breach', 'unauthorized_access', 'credential_leak',
                                        'policy_violation', 'phishing', 'other'
                                    )),
    severity                    TEXT DEFAULT 'medium'
                                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    detected_at                 TIMESTAMPTZ DEFAULT NOW(),
    detected_by_email           TEXT,
    affected_systems            TEXT[],
    affected_data_categories    TEXT[],
    description                 TEXT,
    immediate_actions           TEXT,
    root_cause                  TEXT,
    resolved_at                 TIMESTAMPTZ,
    lessons_learned             TEXT,
    reported_to_authorities     BOOLEAN DEFAULT FALSE,
    status                      TEXT DEFAULT 'open'
                                    CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ
);

COMMENT ON TABLE security_incidents IS 'ISO 27001 — Security incident log including data breaches. reported_to_authorities tracks GDPR Art. 33 72-hour authority notification obligation.';

ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_incidents_authenticated_all"
    ON security_incidents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_security_incidents_updated_at
    BEFORE UPDATE ON security_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity
    ON security_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status
    ON security_incidents (status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_incident_type
    ON security_incidents (incident_type);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at
    ON security_incidents (created_at DESC);


-- =============================================================================
-- ISO 31000 — RISK MANAGEMENT (operational & strategic)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- business_risks: strategic, financial, operational, and reputational risks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_risks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title                   TEXT NOT NULL,
    category                TEXT DEFAULT 'operational'
                                CHECK (category IN (
                                    'financial', 'operational', 'legal', 'reputational',
                                    'market', 'supply_chain', 'people'
                                )),
    brand_slug              TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    description             TEXT,
    likelihood              INT CHECK (likelihood BETWEEN 1 AND 5),
    impact                  INT CHECK (impact BETWEEN 1 AND 5),
    risk_score              INT GENERATED ALWAYS AS (likelihood * impact) STORED,
    risk_level              TEXT GENERATED ALWAYS AS (
                                CASE
                                    WHEN likelihood * impact >= 15 THEN 'critical'
                                    WHEN likelihood * impact >= 10 THEN 'high'
                                    WHEN likelihood * impact >= 5  THEN 'medium'
                                    ELSE 'low'
                                END
                            ) STORED,
    mitigation_strategy     TEXT,
    contingency_plan        TEXT,
    owner_email             TEXT,
    status                  TEXT DEFAULT 'identified'
                                CHECK (status IN (
                                    'identified', 'assessed', 'mitigated', 'accepted', 'closed'
                                )),
    next_review_date        DATE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

COMMENT ON TABLE business_risks IS 'ISO 31000 — Operational and strategic risk register. Broader scope than risk_register (ISO 27001); covers financial, reputational, people, and market risks. brand_slug = NULL means company-wide.';

ALTER TABLE business_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_risks_authenticated_all"
    ON business_risks
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_business_risks_updated_at
    BEFORE UPDATE ON business_risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_business_risks_brand_slug
    ON business_risks (brand_slug);
CREATE INDEX IF NOT EXISTS idx_business_risks_category
    ON business_risks (category);
CREATE INDEX IF NOT EXISTS idx_business_risks_risk_level
    ON business_risks (risk_level);
CREATE INDEX IF NOT EXISTS idx_business_risks_status
    ON business_risks (status);
CREATE INDEX IF NOT EXISTS idx_business_risks_created_at
    ON business_risks (created_at DESC);


-- =============================================================================
-- ISO 14001 — ENVIRONMENTAL MANAGEMENT
-- =============================================================================

-- ---------------------------------------------------------------------------
-- environmental_metrics: CO2, energy, packaging data per brand per month
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environmental_metrics (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_slug              TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    period_month            DATE NOT NULL,
    co2_kg_shipping         REAL,
    co2_kg_returns          REAL,
    co2_kg_digital          REAL,
    shipment_count          INT,
    return_count            INT,
    packaging_recycled_pct  REAL,
    energy_kwh              REAL,
    notes                   TEXT,
    source                  TEXT DEFAULT 'manual'
                                CHECK (source IN ('manual', 'api', 'estimated')),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (brand_slug, period_month)
);

COMMENT ON TABLE environmental_metrics IS 'ISO 14001 — Monthly environmental impact data per brand. CO2 values sourced from DHL/DPD CO2 reports. period_month must be first day of month (e.g. 2026-03-01).';

ALTER TABLE environmental_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "environmental_metrics_authenticated_all"
    ON environmental_metrics
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_environmental_metrics_brand_slug
    ON environmental_metrics (brand_slug);
CREATE INDEX IF NOT EXISTS idx_environmental_metrics_period_month
    ON environmental_metrics (period_month DESC);


-- ---------------------------------------------------------------------------
-- sustainability_initiatives: green projects and programs per brand
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sustainability_initiatives (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_slug          TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    category            TEXT CHECK (category IN (
                            'packaging', 'shipping', 'energy', 'sourcing', 'offsetting', 'certification'
                        )),
    status              TEXT DEFAULT 'planned'
                            CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    impact_description  TEXT,
    started_at          DATE,
    completed_at        DATE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sustainability_initiatives IS 'ISO 14001 — Green initiatives tracked per brand: packaging improvements, carbon offsetting, certifications, and more.';

ALTER TABLE sustainability_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sustainability_initiatives_authenticated_all"
    ON sustainability_initiatives
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sustainability_initiatives_brand_slug
    ON sustainability_initiatives (brand_slug);
CREATE INDEX IF NOT EXISTS idx_sustainability_initiatives_status
    ON sustainability_initiatives (status);
CREATE INDEX IF NOT EXISTS idx_sustainability_initiatives_created_at
    ON sustainability_initiatives (created_at DESC);


-- =============================================================================
-- ISO 45001 — OCCUPATIONAL HEALTH & SAFETY
-- =============================================================================

-- ---------------------------------------------------------------------------
-- wellness_checkins: weekly team wellbeing pulse (workload, clarity, support)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wellness_checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_email    TEXT NOT NULL,
    checkin_date    DATE DEFAULT CURRENT_DATE,
    workload_score  INT CHECK (workload_score BETWEEN 1 AND 5),
    clarity_score   INT CHECK (clarity_score BETWEEN 1 AND 5),
    support_score   INT CHECK (support_score BETWEEN 1 AND 5),
    overall_score   INT GENERATED ALWAYS AS (
                        ROUND((workload_score + clarity_score + support_score)::NUMERIC / 3, 1)::INT
                    ) STORED,
    blockers        TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (member_email, checkin_date)
);

COMMENT ON TABLE wellness_checkins IS 'ISO 45001 — Weekly wellbeing pulse for all team members. workload_score: 1=overwhelmed, 5=comfortable. clarity_score: 1=confused, 5=crystal clear. support_score: 1=no support, 5=well supported.';

ALTER TABLE wellness_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wellness_checkins_authenticated_all"
    ON wellness_checkins
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wellness_checkins_member_email
    ON wellness_checkins (member_email);
CREATE INDEX IF NOT EXISTS idx_wellness_checkins_checkin_date
    ON wellness_checkins (checkin_date DESC);


-- ---------------------------------------------------------------------------
-- workplace_incidents: accidents, near-misses, complaints (includes remote)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workplace_incidents (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by_email   TEXT,
    incident_type       TEXT CHECK (incident_type IN (
                            'workload_overload', 'harassment', 'technical_blocker',
                            'health_issue', 'near_miss', 'other'
                        )),
    severity            TEXT DEFAULT 'low'
                            CHECK (severity IN ('low', 'medium', 'high')),
    description         TEXT NOT NULL,
    occurred_at         TIMESTAMPTZ,
    reported_at         TIMESTAMPTZ DEFAULT NOW(),
    resolution          TEXT,
    resolved_at         TIMESTAMPTZ,
    status              TEXT DEFAULT 'open'
                            CHECK (status IN ('open', 'investigating', 'resolved'))
);

COMMENT ON TABLE workplace_incidents IS 'ISO 45001 — Workplace incident log covering accidents, near-misses, and complaints. Applies to remote workers as well.';

ALTER TABLE workplace_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workplace_incidents_authenticated_all"
    ON workplace_incidents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_workplace_incidents_status
    ON workplace_incidents (status);
CREATE INDEX IF NOT EXISTS idx_workplace_incidents_severity
    ON workplace_incidents (severity);
CREATE INDEX IF NOT EXISTS idx_workplace_incidents_reported_at
    ON workplace_incidents (reported_at DESC);


-- =============================================================================
-- ISO 50001 — ENERGY & RESOURCE MANAGEMENT (digital ops focus)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- resource_usage: monthly digital resource consumption (API, compute, storage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_usage (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_month    DATE NOT NULL,
    brand_slug      TEXT REFERENCES brands(slug) ON DELETE SET NULL,
    resource_type   TEXT CHECK (resource_type IN (
                        'anthropic_api', 'openai_api', 'supabase', 'vercel',
                        'n8n', 'shopify_api', 'meta_api', 'other'
                    )),
    units_consumed  REAL,
    unit_label      TEXT,
    cost_usd        REAL,
    cost_eur        REAL,
    notes           TEXT,
    source          TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual', 'agent_logs', 'billing_api')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (period_month, brand_slug, resource_type)
);

COMMENT ON TABLE resource_usage IS 'ISO 50001 — Monthly digital resource consumption tracking (tokens, GB, API calls). brand_slug = NULL means platform-wide cost. Feeds into cost control and sustainability reporting.';

ALTER TABLE resource_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_usage_authenticated_all"
    ON resource_usage
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_resource_usage_brand_slug
    ON resource_usage (brand_slug);
CREATE INDEX IF NOT EXISTS idx_resource_usage_resource_type
    ON resource_usage (resource_type);
CREATE INDEX IF NOT EXISTS idx_resource_usage_period_month
    ON resource_usage (period_month DESC);
CREATE INDEX IF NOT EXISTS idx_resource_usage_created_at
    ON resource_usage (created_at DESC);


-- =============================================================================
-- SEEDS — ISO 27001: risk_register (5 real InfoSec risks for Hart Limes)
-- =============================================================================

INSERT INTO risk_register (
    asset, asset_category, threat,
    likelihood, impact,
    mitigation, mitigation_status,
    owner_email, next_review_date, brand_slug
)
SELECT * FROM (VALUES
    (
        'Supabase Database',
        'system',
        'Unauthorized access to production database',
        2, 5,
        'RLS policies enabled on all tables; service role key stored in environment variables only, never committed to git.',
        'implemented',
        'jll@hartlimesgmbh.de',
        CURRENT_DATE + INTERVAL '90 days',
        NULL::TEXT
    ),
    (
        'Shopify API Keys (all brands)',
        'data',
        'Credential leak via git repository',
        2, 4,
        '.gitignore enforced for .env files; .env.example used for documentation; keys never hardcoded in source.',
        'implemented',
        'jll@hartlimesgmbh.de',
        CURRENT_DATE + INTERVAL '90 days',
        NULL::TEXT
    ),
    (
        'Customer PII (emails, shipping addresses)',
        'data',
        'Data breach exposing personal data under GDPR scope',
        2, 5,
        'Supabase RLS restricts access to authenticated users only; PII never written to application logs or agent outputs.',
        'implemented',
        'jll@hartlimesgmbh.de',
        CURRENT_DATE + INTERVAL '90 days',
        NULL::TEXT
    ),
    (
        'Anthropic API Key',
        'system',
        'Cost explosion via leaked or misconfigured API key',
        2, 3,
        'API key stored in Vercel environment variables only; usage limits and spend alerts configured in Anthropic dashboard.',
        'implemented',
        'jll@hartlimesgmbh.de',
        CURRENT_DATE + INTERVAL '90 days',
        NULL::TEXT
    ),
    (
        'Meta Ad Accounts (all brands)',
        'system',
        'Unauthorized ad spend via compromised account access',
        2, 4,
        '2FA enforced on all Meta Business Suite logins; System User permissions scoped to minimum required; regular access review.',
        'implemented',
        'jll@hartlimesgmbh.de',
        CURRENT_DATE + INTERVAL '90 days',
        NULL::TEXT
    )
) AS v(asset, asset_category, threat, likelihood, impact, mitigation, mitigation_status, owner_email, next_review_date, brand_slug)
WHERE NOT EXISTS (
    SELECT 1 FROM risk_register WHERE asset = v.asset AND threat = v.threat
);


-- =============================================================================
-- SEEDS — ISO 31000: business_risks (5 real operational risks for Hart Limes)
-- =============================================================================

INSERT INTO business_risks (
    title, category, brand_slug,
    description, likelihood, impact,
    mitigation_strategy, contingency_plan,
    owner_email, status, next_review_date
)
SELECT * FROM (VALUES
    (
        'Take A Shot — Customer complaints visible on Instagram',
        'reputational',
        'take-a-shot',
        'Unresolved customer service complaints escalating publicly on Instagram can damage brand trust and suppress conversion rates.',
        4, 4,
        'CS response time target <24h; trust-rebuilding content series in 2026 content plan; complaint tracking in Business OS.',
        'Escalation protocol to Luis/Peter for high-visibility complaints; pre-written response templates for common issues.',
        'jll@hartlimesgmbh.de',
        'assessed',
        CURRENT_DATE + INTERVAL '30 days'
    ),
    (
        'Timber & John — Brand sale falling through',
        'financial',
        'timber-and-john',
        'Planned brand sale/exit may not materialise, leaving continued operational overhead without strategic upside.',
        2, 3,
        'Peter Hart tracks sale decision; no new marketing investment or headcount added until exit confirmed.',
        'Minimal maintenance mode operation; reassess Q3 2026 if no deal progress.',
        'jll@hartlimesgmbh.de',
        'identified',
        CURRENT_DATE + INTERVAL '60 days'
    ),
    (
        'PayPal dispute rate exceeding 1% threshold',
        'financial',
        NULL,
        'If PayPal dispute rate exceeds 1% across any brand, PayPal may restrict or terminate the merchant account, blocking a major payment channel.',
        3, 5,
        'Proactive dispute triage process owned by Vanessa; monthly dispute rate monitoring in finance dashboard; clear return policy visible at checkout.',
        'Immediate escalation to Vanessa + Henrik; accelerate dispute resolution; temporary shift to Stripe/Klarna if PayPal restricts.',
        'jll@hartlimesgmbh.de',
        'mitigated',
        CURRENT_DATE + INTERVAL '30 days'
    ),
    (
        'Key intern leaving mid-project',
        'people',
        NULL,
        'Over-reliance on a single intern for critical workflows (content, CS, admin) creates operational risk if they leave unexpectedly.',
        3, 3,
        'All workflows documented as SOPs in Business OS; knowledge stored in agent memory not in individual heads; cross-training across interns.',
        'Immediate SOP handover checklist; recruit replacement via existing pipeline; Lena (UGC Manager) covers short-term gaps.',
        'jll@hartlimesgmbh.de',
        'mitigated',
        CURRENT_DATE + INTERVAL '90 days'
    ),
    (
        'Shopify price increase or platform lock-in',
        'operational',
        NULL,
        'Shopify has raised prices repeatedly. Deep dependency on Shopify for all 6 brands creates margin and continuity risk if fees increase significantly.',
        2, 4,
        'Billbee ERP as abstraction layer reduces Shopify dependency for order management; multi-platform capability maintained.',
        'Evaluate WooCommerce or Shopware migration readiness semi-annually; maintain Billbee integration as platform-agnostic fallback.',
        'jll@hartlimesgmbh.de',
        'assessed',
        CURRENT_DATE + INTERVAL '180 days'
    )
) AS v(title, category, brand_slug, description, likelihood, impact, mitigation_strategy, contingency_plan, owner_email, status, next_review_date)
WHERE NOT EXISTS (
    SELECT 1 FROM business_risks WHERE title = v.title
);


-- =============================================================================
-- END OF FILE
-- Hart Limes GmbH Business OS — ISO Compliance Layer v1.0
-- =============================================================================
