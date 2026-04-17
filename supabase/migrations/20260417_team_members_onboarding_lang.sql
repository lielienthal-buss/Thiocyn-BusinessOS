-- =============================================================================
-- Migration: 20260417_team_members_onboarding_lang.sql
-- Purpose:   Add onboarding_state + preferred_language columns to team_members
--            for first-login guided tour + per-user language persistence.
-- Author:    Jarvis
-- Date:      2026-04-17
-- =============================================================================

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS onboarding_state JSONB
    DEFAULT jsonb_build_object(
      'completed', false,
      'last_step', 0,
      'completed_sections', '[]'::jsonb,
      'completed_at', null
    );

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'de'
    CHECK (preferred_language IN ('de','en'));

CREATE INDEX IF NOT EXISTS idx_team_members_onboarding_not_completed
  ON public.team_members ((onboarding_state->>'completed'))
  WHERE (onboarding_state->>'completed')::boolean IS NOT TRUE;

COMMENT ON COLUMN public.team_members.onboarding_state IS
  'First-login product tour state. Schema: {completed:bool, last_step:int, completed_sections:string[], completed_at:ts}';

COMMENT ON COLUMN public.team_members.preferred_language IS
  'User UI language preference (de/en), persisted across sessions.';
