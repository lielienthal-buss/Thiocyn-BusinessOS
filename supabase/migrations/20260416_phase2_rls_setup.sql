-- =============================================================================
-- Migration: 20260416_phase2_rls_setup.sql
-- Purpose:   Phase 2 foundation — additive only. Adds agency_members junction
--            + current_user_agencies() helper. NO policy swap yet.
-- Plan:      docs/welle/phase2-rls-agency-route-plan.md
-- Author:    Jarvis
-- Date:      2026-04-16
-- Project:   Thiocyn-BusinessOS (dfzrkzvsdiiihoejfozn)
--
-- NOTES:
-- - team_members already exists (richer schema: id/auth_user_id/allowed_sections)
--   with seeded Hart Limes team + interns. We reuse the existing is_team_member()
--   helper as the internal-team predicate instead of creating a duplicate.
-- - Email-domain auto-grant (@hartlimesgmbh.de) is INTENTIONALLY not added:
--   explicit seed in team_members is more secure and already complete.
--
-- Rollback:  DROP TABLE public.agency_members CASCADE;
--            DROP FUNCTION public.current_user_agencies();
-- =============================================================================

-- ─── 1. Agency membership (M:N) ────────────────────────────────────────────
-- One user can advise multiple agencies; one agency has multiple members.
-- Role granularity: owner/member/viewer defined, v1 uses owner+member only.

CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id  UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member'
             CHECK (role IN ('owner','member','viewer')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_members_user
  ON public.agency_members(user_id);

COMMENT ON TABLE public.agency_members IS
  'External agency users scoped to one or more agencies. '
  'RLS policies (Phase 2.1 migration) use current_user_agencies() to scope visibility. '
  'Internal team members (team_members table) are handled via is_team_member() helper.';

-- ─── 2. RLS on agency_members ──────────────────────────────────────────────

ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- Internal team: full visibility (they manage invites)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agency_members'
      AND policyname = 'agency_members_internal_full'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "agency_members_internal_full"
        ON public.agency_members
        FOR ALL
        TO authenticated
        USING (public.is_team_member())
        WITH CHECK (public.is_team_member())
    $policy$;
  END IF;
END;
$$;

-- Agency users: see only their own membership rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agency_members'
      AND policyname = 'agency_members_self_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "agency_members_self_read"
        ON public.agency_members
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid())
    $policy$;
  END IF;
END;
$$;

-- ─── 3. Helper: current_user_agencies() ────────────────────────────────────
-- Returns agency UUIDs the current user belongs to.
-- Empty set for internal team (they use is_team_member() path instead).
-- SECURITY DEFINER + locked search_path (injection-safe).

CREATE OR REPLACE FUNCTION public.current_user_agencies()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id
  FROM public.agency_members
  WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_agencies() IS
  'RLS helper. Returns agency_ids the current user is member of. '
  'Used by Phase 2.1 campaign/brief/asset scoping policies.';

GRANT EXECUTE ON FUNCTION public.current_user_agencies() TO authenticated;

-- =============================================================================
-- NEXT MIGRATION (not in this file):
--   20260417_phase2_rls_policies.sql
--   - DROP phase1_all_authenticated policies on: campaigns, campaign_briefs,
--     agency_briefs, campaign_creative_sets, campaign_assets, campaign_comments,
--     campaign_kpis, agencies
--   - CREATE internal_full (is_team_member) + agency_scoped (current_user_agencies)
--   - Test matrix: internal / agency-member / anonymous visibility
-- =============================================================================
