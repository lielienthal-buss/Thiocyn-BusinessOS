-- =============================================================================
-- Migration: 20260417_phase2_rls_policies.sql
-- Purpose:   Phase 2.1 — SWAP permissive policies for role-scoped policies.
-- Plan:      docs/welle/phase2-rls-agency-route-plan.md
-- Author:    Jarvis
-- Date:      2026-04-17
-- Project:   Thiocyn-BusinessOS (dfzrkzvsdiiihoejfozn)
--
-- ⚠️  HIGH-RISK: This drops the permissive phase1_all_authenticated policies
--    on 9 tables. Internal users MUST be in team_members (they are — verified
--    8 seeded rows) OR this will lock them out. Run smoke test AFTER:
--
--      -- Should return true for any team_members row with auth_user_id:
--      SELECT is_team_member();
--      -- Should return all rows (not zero) when logged in as team member:
--      SELECT count(*) FROM campaigns;
--
-- Rollback (copy-paste ready):
--   BEGIN;
--     DROP POLICY IF EXISTS "agencies_internal_full" ON public.agencies;
--     DROP POLICY IF EXISTS "agencies_agency_self_read" ON public.agencies;
--     -- (repeat for all policies below)
--     CREATE POLICY "phase1_all_authenticated" ON public.agencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
--     -- (repeat for each table)
--   COMMIT;
-- =============================================================================

BEGIN;

-- ─── Drop all phase1_all_authenticated policies ────────────────────────────

DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.agencies;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.campaigns;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.campaign_briefs;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.agency_briefs;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.campaign_creative_sets;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.campaign_assets;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.campaign_comments;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.campaign_kpis;
DROP POLICY IF EXISTS "phase1_all_authenticated" ON public.audit_log;
-- Dedupe: audit_log_authenticated_read is redundant with the new internal_full
DROP POLICY IF EXISTS "audit_log_authenticated_read" ON public.audit_log;

-- ─── agencies ──────────────────────────────────────────────────────────────

CREATE POLICY "agencies_internal_full" ON public.agencies
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "agencies_self_read" ON public.agencies
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.current_user_agencies()));

-- ─── campaigns ─────────────────────────────────────────────────────────────

CREATE POLICY "campaigns_internal_full" ON public.campaigns
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "campaigns_agency_read" ON public.campaigns
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT public.current_user_agencies()));

CREATE POLICY "campaigns_agency_update" ON public.campaigns
  FOR UPDATE TO authenticated
  USING (agency_id IN (SELECT public.current_user_agencies()))
  WITH CHECK (agency_id IN (SELECT public.current_user_agencies()));

-- ─── campaign_briefs (scoped via parent campaign) ─────────────────────────

CREATE POLICY "campaign_briefs_internal_full" ON public.campaign_briefs
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "campaign_briefs_agency_read" ON public.campaign_briefs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_briefs.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ));

CREATE POLICY "campaign_briefs_agency_update" ON public.campaign_briefs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_briefs.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_briefs.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ));

-- ─── agency_briefs (direct agency_id column, no campaign link) ─────────────
-- Schema: id, type, title, brand_id, agency_id, body, prompt_input, assignee,
-- deadline, status, created_by, created_at, updated_at

CREATE POLICY "agency_briefs_internal_full" ON public.agency_briefs
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "agency_briefs_agency_rw" ON public.agency_briefs
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.current_user_agencies()))
  WITH CHECK (agency_id IN (SELECT public.current_user_agencies()));

-- ─── campaign_creative_sets (via parent campaign) ─────────────────────────

CREATE POLICY "creative_sets_internal_full" ON public.campaign_creative_sets
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "creative_sets_agency_rw" ON public.campaign_creative_sets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_creative_sets.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_creative_sets.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ));

-- ─── campaign_assets (via creative_set → campaign) ────────────────────────

CREATE POLICY "assets_internal_full" ON public.campaign_assets
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "assets_agency_rw" ON public.campaign_assets
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaign_creative_sets cs
    JOIN public.campaigns c ON c.id = cs.campaign_id
    WHERE cs.id = campaign_assets.creative_set_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaign_creative_sets cs
    JOIN public.campaigns c ON c.id = cs.campaign_id
    WHERE cs.id = campaign_assets.creative_set_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ));

-- ─── campaign_comments (agency can add comments to own campaigns) ─────────

CREATE POLICY "comments_internal_full" ON public.campaign_comments
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "comments_agency_read" ON public.campaign_comments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_comments.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ));

CREATE POLICY "comments_agency_insert_own" ON public.campaign_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_comments.campaign_id
        AND c.agency_id IN (SELECT public.current_user_agencies())
    )
  );

CREATE POLICY "comments_agency_update_own" ON public.campaign_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ─── campaign_kpis (read-only for agencies; internal jobs write) ───────────

CREATE POLICY "kpis_internal_full" ON public.campaign_kpis
  FOR ALL TO authenticated
  USING (public.is_team_member())
  WITH CHECK (public.is_team_member());

CREATE POLICY "kpis_agency_read" ON public.campaign_kpis
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_kpis.campaign_id
      AND c.agency_id IN (SELECT public.current_user_agencies())
  ));

-- ─── audit_log (internal only for v1) ──────────────────────────────────────
-- Agencies don't need audit visibility in v1; defer scoped read to v2 if needed.

CREATE POLICY "audit_log_internal_full" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_team_member());

COMMIT;

-- =============================================================================
-- POST-APPLY SMOKE TEST (run manually as a logged-in team member):
--   SELECT public.is_team_member();             -- must return true
--   SELECT count(*) FROM public.campaigns;      -- must return >0
--   SELECT count(*) FROM public.agencies;       -- must return >0
--
-- If is_team_member() returns false for a team email, add this as emergency unlock:
--   INSERT INTO public.team_members (email, role, status, auth_user_id)
--   VALUES ('YOUR_EMAIL', 'admin', 'active', auth.uid())
--   ON CONFLICT DO NOTHING;
-- =============================================================================
