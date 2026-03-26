-- ============================================================================
-- Finance Inbox — Supabase Schema
-- ============================================================================
-- Project: Thiocyn Business OS
-- Supabase Project: dfzrkzvsdiiihoejfozn
-- Purpose: Mirror of invoices.holding@mail.hartlimesgmbh.de — all inbound
--          and outbound finance emails, AI-classified, actionable from Dashboard.
--
-- Tables:
--   finance_inbox          — every email (in + out), deduplicated
--   finance_inbox_actions  — audit log of all user actions on emails
--   finance_inbox_drafts   — reply drafts pending human confirmation before send
-- ============================================================================

-- ============================================================================
-- TABLE: finance_inbox
-- ============================================================================
-- Purpose: Mirrored finance mailbox. Every inbound mail is auto-classified
--          by AI (claude-haiku). Outbound mails are logged after user confirms.
-- Source:  n8n IMAP poller (every 15 min) + outgoing webhook.

CREATE TABLE IF NOT EXISTS finance_inbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deduplication
  message_id      TEXT UNIQUE NOT NULL,         -- IMAP Message-ID header
  imap_uid        BIGINT,                        -- IMAP UID (for backfill tracking)

  -- Direction
  direction       TEXT NOT NULL DEFAULT 'inbound'
                    CHECK (direction IN ('inbound', 'outbound')),

  -- Parties
  from_address    TEXT NOT NULL,
  to_address      TEXT NOT NULL,
  cc_address      TEXT,
  reply_to        TEXT,

  -- Content
  subject         TEXT,
  body_text       TEXT,
  body_html       TEXT,
  has_attachments BOOLEAN DEFAULT FALSE,

  -- Timing
  received_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- AI Classification
  classification  TEXT CHECK (classification IN ('SOFORT', 'VANESSA', 'BRAND', 'SPAM', 'INFO')),
  brand           TEXT CHECK (brand IN (
                    'thiocyn', 'take-a-shot', 'dr-severin',
                    'paigh', 'wristr', 'timber-john', 'hart-limes'
                  )),
  ai_reasoning    TEXT,                          -- Haiku output for audit
  classified_at   TIMESTAMPTZ,

  -- Status
  status          TEXT NOT NULL DEFAULT 'unread'
                    CHECK (status IN ('unread', 'read', 'done', 'archived', 'delegated')),
  delegated_to    TEXT,                          -- team member email if delegated

  -- Notifications
  telegram_sent   BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE finance_inbox IS
'Mirrored finance mailbox for Hart Limes GmbH. All inbound/outbound emails '
'from invoices.holding@mail.hartlimesgmbh.de, AI-classified and actionable '
'from the Business OS Dashboard. No email is sent without explicit user confirmation.';

COMMENT ON COLUMN finance_inbox.message_id IS
'RFC 2822 Message-ID header — primary deduplication key for IMAP polling.';

COMMENT ON COLUMN finance_inbox.classification IS
'AI-assigned category: SOFORT=urgent action required, VANESSA=finance team, '
'BRAND=brand-specific, SPAM=no action, INFO=informational only.';

COMMENT ON COLUMN finance_inbox.ai_reasoning IS
'Short reasoning from Haiku classification for audit and manual override.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_inbox_classification
  ON finance_inbox(classification) WHERE classification IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_inbox_status
  ON finance_inbox(status);

CREATE INDEX IF NOT EXISTS idx_finance_inbox_brand
  ON finance_inbox(brand) WHERE brand IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_inbox_received_at
  ON finance_inbox(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_inbox_direction
  ON finance_inbox(direction);

-- updated_at trigger
DROP TRIGGER IF EXISTS trigger_finance_inbox_updated_at ON finance_inbox;
CREATE TRIGGER trigger_finance_inbox_updated_at
  BEFORE UPDATE ON finance_inbox
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE finance_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_inbox_read_authenticated" ON finance_inbox
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "finance_inbox_write_service_role" ON finance_inbox
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "finance_inbox_update_authenticated" ON finance_inbox
  FOR UPDATE USING (auth.role() = 'authenticated');


-- ============================================================================
-- TABLE: finance_inbox_actions
-- ============================================================================
-- Purpose: Immutable audit log of every action taken on a finance email.
--          Tracks who did what and when — for accountability and review.

CREATE TABLE IF NOT EXISTS finance_inbox_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id         UUID NOT NULL REFERENCES finance_inbox(id) ON DELETE CASCADE,

  -- Action
  action_type     TEXT NOT NULL CHECK (action_type IN (
                    'mark_done',
                    'mark_read',
                    'delegate',
                    'archive',
                    'draft_created',
                    'draft_sent',
                    'manual_classify',
                    'spam_confirmed'
                  )),

  -- Actor (auth user)
  performed_by    UUID REFERENCES auth.users(id),
  performed_by_email TEXT,                       -- denormalized for readability

  -- Payload (flexible)
  payload         JSONB DEFAULT '{}',            -- e.g. { new_classification, delegate_to, draft_id }

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_inbox_actions IS
'Immutable audit log of all user actions on finance inbox emails. '
'Every status change, delegation, draft creation, and send is recorded here.';

COMMENT ON COLUMN finance_inbox_actions.payload IS
'Flexible JSONB for action-specific data: new classification on override, '
'delegate_to email, draft_id on send, etc.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_inbox_actions_mail_id
  ON finance_inbox_actions(mail_id);

CREATE INDEX IF NOT EXISTS idx_finance_inbox_actions_type
  ON finance_inbox_actions(action_type);

CREATE INDEX IF NOT EXISTS idx_finance_inbox_actions_performed_by
  ON finance_inbox_actions(performed_by) WHERE performed_by IS NOT NULL;

-- RLS
ALTER TABLE finance_inbox_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_inbox_actions_read_authenticated" ON finance_inbox_actions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "finance_inbox_actions_insert_authenticated" ON finance_inbox_actions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- No UPDATE/DELETE — audit log is immutable


-- ============================================================================
-- TABLE: finance_inbox_drafts
-- ============================================================================
-- Purpose: Reply drafts generated by AI or composed by users.
--          MUST be explicitly confirmed by an authenticated user before sending.
--          No draft is ever auto-sent.

CREATE TABLE IF NOT EXISTS finance_inbox_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id         UUID NOT NULL REFERENCES finance_inbox(id) ON DELETE CASCADE,

  -- Compose
  to_address      TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body_text       TEXT NOT NULL,
  body_html       TEXT,

  -- Authorship
  created_by      UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  ai_generated    BOOLEAN DEFAULT FALSE,         -- true if AI drafted this

  -- Confirmation gate — MANDATORY before send
  confirmed_by    UUID REFERENCES auth.users(id),
  confirmed_by_email TEXT,
  confirmed_at    TIMESTAMPTZ,

  -- Send status
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'confirmed', 'sending', 'sent', 'failed')),
  resend_id       TEXT,                          -- Resend API response ID
  sent_at         TIMESTAMPTZ,
  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_inbox_drafts IS
'Reply drafts for finance inbox emails. AI may generate drafts but cannot send. '
'Every draft requires explicit confirmation by an authenticated user before dispatch. '
'This is a hard system rule — no exceptions.';

COMMENT ON COLUMN finance_inbox_drafts.confirmed_by IS
'The authenticated user who explicitly approved sending. NULL = not yet confirmed. '
'System enforces: status cannot move to confirmed/sending without this being set.';

COMMENT ON COLUMN finance_inbox_drafts.ai_generated IS
'Marks AI-generated drafts for additional scrutiny. Confirmed by a human regardless.';

-- Guard: prevent sending without confirmation
CREATE OR REPLACE FUNCTION enforce_draft_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('sending', 'sent') AND NEW.confirmed_by IS NULL THEN
    RAISE EXCEPTION
      'finance_inbox_drafts: cannot send without confirmed_by. Human confirmation required.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_draft_confirmation ON finance_inbox_drafts;
CREATE TRIGGER trigger_enforce_draft_confirmation
  BEFORE UPDATE ON finance_inbox_drafts
  FOR EACH ROW EXECUTE FUNCTION enforce_draft_confirmation();

-- updated_at trigger
DROP TRIGGER IF EXISTS trigger_finance_inbox_drafts_updated_at ON finance_inbox_drafts;
CREATE TRIGGER trigger_finance_inbox_drafts_updated_at
  BEFORE UPDATE ON finance_inbox_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_inbox_drafts_mail_id
  ON finance_inbox_drafts(mail_id);

CREATE INDEX IF NOT EXISTS idx_finance_inbox_drafts_status
  ON finance_inbox_drafts(status);

-- RLS
ALTER TABLE finance_inbox_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_inbox_drafts_read_authenticated" ON finance_inbox_drafts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "finance_inbox_drafts_write_authenticated" ON finance_inbox_drafts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "finance_inbox_drafts_update_authenticated" ON finance_inbox_drafts
  FOR UPDATE USING (auth.role() = 'authenticated');


-- ============================================================================
-- REALTIME
-- ============================================================================
-- Enable realtime for live dashboard updates

ALTER PUBLICATION supabase_realtime ADD TABLE finance_inbox;
ALTER PUBLICATION supabase_realtime ADD TABLE finance_inbox_drafts;
