-- =============================================================================
-- Migration: 20260416_audit_log_triggers.sql
-- Purpose:   Add INSERT/UPDATE/DELETE audit triggers on campaigns and
--            agency_briefs tables for Phase 2 accountability.
-- Author:    Jarvis / Sidekick
-- Date:      2026-04-16
-- Project:   Thiocyn-BusinessOS (dfzrkzvsdiiihoejfozn)
-- Rollback:  DROP TRIGGER audit_campaigns ON campaigns;
--            DROP TRIGGER audit_agency_briefs ON agency_briefs;
--            DROP FUNCTION log_table_change();
--            -- (audit_log table and its column additions are safe to keep)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Extend existing audit_log table
--
-- The table already exists with: id (uuid), actor_id (uuid), table_name (text),
-- row_id (uuid), action (text), diff (jsonb), created_at (timestamptz).
--
-- We ADD the missing columns needed for full diff visibility:
--   - actor_email  TEXT       (JWT snapshot)
--   - operation    TEXT       (mirrors spec; 'action' column kept for compat)
--   - old_data     JSONB      (full row snapshot before change)
--   - new_data     JSONB      (full row snapshot after change)
--
-- NOTE: existing 'action' column is retained for backward compatibility with
-- any existing queries. The new trigger writes to BOTH 'action' and 'operation'.
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS actor_email  TEXT,
  ADD COLUMN IF NOT EXISTS operation    TEXT CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  ADD COLUMN IF NOT EXISTS old_data     JSONB,
  ADD COLUMN IF NOT EXISTS new_data     JSONB;

-- ---------------------------------------------------------------------------
-- STEP 2: Indexes (idempotent)
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_audit_log_table_row
  ON public.audit_log (table_name, row_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

-- ---------------------------------------------------------------------------
-- STEP 3: Row Level Security
-- Existing table may not have RLS enabled.
-- Phase 1: authenticated users can read all audit entries.
-- Only the SECURITY DEFINER trigger function writes — no INSERT policy needed.
-- ---------------------------------------------------------------------------

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log'
      AND policyname = 'audit_log_authenticated_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "audit_log_authenticated_read"
        ON public.audit_log
        FOR SELECT
        TO authenticated
        USING (true)
    $policy$;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 4: Generic trigger function
--
-- Adaptations from spec template:
--   - row_id is UUID (not TEXT) — matches existing audit_log.row_id column type
--   - Writes to both 'action' (legacy column) and 'operation' (new column)
--   - old_data / new_data / diff captured in new columns
--   - actor_email captured from JWT
--   - SECURITY DEFINER so the function can write to audit_log regardless of
--     the calling user's RLS context
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_row_id      UUID;
  v_diff        JSONB;
BEGIN
  -- Capture actor from Supabase JWT if present (fails gracefully outside auth context)
  BEGIN
    v_actor_id    := auth.uid();
    v_actor_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    v_actor_id    := NULL;
    v_actor_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_row_id := OLD.id;
    INSERT INTO public.audit_log
      (table_name, row_id, action, operation, actor_id, actor_email, old_data)
    VALUES
      (TG_TABLE_NAME, v_row_id, 'DELETE', 'DELETE', v_actor_id, v_actor_email, to_jsonb(OLD));
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_row_id := NEW.id;
    -- Compute diff: only keys whose value actually changed
    SELECT jsonb_object_agg(n.key, n.value)
    INTO   v_diff
    FROM   jsonb_each(to_jsonb(NEW)) n
    WHERE  (to_jsonb(OLD) -> n.key) IS DISTINCT FROM n.value;

    INSERT INTO public.audit_log
      (table_name, row_id, action, operation, actor_id, actor_email, old_data, new_data, diff)
    VALUES
      (TG_TABLE_NAME, v_row_id, 'UPDATE', 'UPDATE', v_actor_id, v_actor_email,
       to_jsonb(OLD), to_jsonb(NEW), v_diff);
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_row_id := NEW.id;
    INSERT INTO public.audit_log
      (table_name, row_id, action, operation, actor_id, actor_email, new_data)
    VALUES
      (TG_TABLE_NAME, v_row_id, 'INSERT', 'INSERT', v_actor_id, v_actor_email, to_jsonb(NEW));
    RETURN NEW;

  END IF;

  RETURN NULL;
END;
$$;

-- ---------------------------------------------------------------------------
-- STEP 5: Attach triggers to campaigns and agency_briefs
--
-- Both tables already have 'trg_campaigns_updated' / 'trg_agency_briefs_updated'
-- triggers (updated_at stamp) — those are unaffected. Audit triggers fire AFTER,
-- so the updated_at value is already set when we snapshot NEW.
-- ---------------------------------------------------------------------------

-- Drop first if re-running migration (idempotent)
DROP TRIGGER IF EXISTS audit_campaigns ON public.campaigns;
DROP TRIGGER IF EXISTS audit_agency_briefs ON public.agency_briefs;
DROP TRIGGER IF EXISTS audit_campaign_briefs ON public.campaign_briefs;

CREATE TRIGGER audit_campaigns
  AFTER INSERT OR UPDATE OR DELETE
  ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER audit_agency_briefs
  AFTER INSERT OR UPDATE OR DELETE
  ON public.agency_briefs
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER audit_campaign_briefs
  AFTER INSERT OR UPDATE OR DELETE
  ON public.campaign_briefs
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
