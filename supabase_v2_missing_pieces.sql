-- ============================================================
-- Take A Shot ATS — V2 Missing Pieces
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor)
-- Safe to run on existing data — uses IF NOT EXISTS / OR REPLACE
-- ============================================================

-- 1. Add missing columns to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS project_highlight TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS psychometrics JSONB,
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS work_sample_text TEXT,
  ADD COLUMN IF NOT EXISTS captcha_token TEXT,
  ADD COLUMN IF NOT EXISTS captcha_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "aiScore" REAL;

-- 2. Create project_areas table (used by Project Area Manager in Admin)
CREATE TABLE IF NOT EXISTS "public"."project_areas" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "name" text NOT NULL,
    "description" text,
    CONSTRAINT "project_areas_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."project_areas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage project areas"
  ON "public"."project_areas"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Index on access_token for fast task-link lookups
CREATE INDEX IF NOT EXISTS idx_applications_access_token
  ON public.applications(access_token);

-- 4. The missing submit_application RPC function
-- Called by the public application form (lib/actions.ts → submitApplicationAction)
CREATE OR REPLACE FUNCTION public.submit_application(
  p_full_name TEXT,
  p_email TEXT,
  p_linkedin_url TEXT,
  p_project_highlight TEXT,
  p_psychometrics JSONB,
  p_preferred_project_areas TEXT[],
  p_stage TEXT DEFAULT 'applied',
  p_captcha_token TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.applications (
    full_name,
    email,
    linkedin_url,
    project_highlight,
    psychometrics,
    project_interest,
    stage,
    captcha_token,
    captcha_verified
  ) VALUES (
    p_full_name,
    p_email,
    p_linkedin_url,
    p_project_highlight,
    p_psychometrics,
    p_preferred_project_areas,
    p_stage,
    p_captcha_token,
    true
  );
END;
$$;

-- Grant to anon so the public form can submit without login
GRANT EXECUTE ON FUNCTION public.submit_application(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_application(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) TO authenticated;

-- 5. RLS: allow anon to call submit_task_response (work sample)
-- (Already in V2_MIGRATION.sql but safe to re-run with OR REPLACE)
CREATE OR REPLACE FUNCTION public.submit_task_response(p_token UUID, p_answer TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.applications
  SET
    work_sample_text = p_answer,
    stage = 'task_submitted',
    task_submitted_at = now()
  WHERE access_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_task_response(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_task_response(UUID, TEXT) TO authenticated;

-- 6. Ensure application_notes RLS is correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'application_notes'
    AND policyname = 'Allow authenticated users to manage notes'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage notes"
      ON "public"."application_notes"
      FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- ============================================================
-- Done. Verify by running:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'applications';
-- ============================================================
