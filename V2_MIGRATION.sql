-- Take-a-Shot ATS V2 Migration Script
-- This script updates the database schema for the new lean, evidence-based hiring process.

-- 1. Add new columns to the 'applications' table
-- This alters the table to support the 3-stage workflow, psychometrics, and work samples.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS psychometrics JSONB,
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'applied',
  ADD COLUMN IF NOT EXISTS access_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS work_sample_text TEXT;

-- Add a comment to the new 'stage' column for clarity
COMMENT ON COLUMN public.applications.stage IS 'Manages the candidate''s progress. Expected values: ''applied'', ''task_requested'', ''task_submitted'', ''rejected''.';

-- Note: Old columns like 'disc_answers', 'project_example_text', etc., are not removed by this script
-- to prevent data loss on existing records. They are now considered deprecated.

-- 2. Create the RPC function for secure work sample submission
-- This function allows an unauthenticated user to submit their work sample
-- using a secure, unique token.

CREATE OR REPLACE FUNCTION submit_task_response(p_token UUID, p_answer TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.applications
  SET
    work_sample_text = p_answer,
    stage = 'task_submitted'
  WHERE
    access_token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution rights to the 'anon' role (public, unauthenticated users)
GRANT EXECUTE ON FUNCTION public.submit_task_response(UUID, TEXT) TO anon;

-- Grant execution rights to the 'authenticated' role as well
GRANT EXECUTE ON FUNCTION public.submit_task_response(UUID, TEXT) TO authenticated;


-- 3. (Optional) Create an index on the access_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_applications_access_token ON public.applications(access_token);

-- 4. Row Level Security (RLS) Policies for V2 Congruence
-- These policies ensure that authenticated users (recruiters) can manage applications
-- and anonymous users can submit new applications.

-- Ensure RLS is enabled on public.applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Revoke any generic rights from PUBLIC for clarity (non-destructive)
REVOKE ALL ON TABLE public.applications FROM PUBLIC;

-- Drop ALL existing policies on 'applications' to prevent any conflicts
-- This is a more aggressive reset to ensure a clean slate.
DROP POLICY IF EXISTS "Allow anon users to insert applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can update applications" ON public.applications;
DROP POLICY IF EXISTS "Recruiters can delete applications" ON public.applications;
-- Add any other V1 policies here if they exist and need to be dropped
-- For example: DROP POLICY IF EXISTS "some_old_policy_name" ON public.applications;


-- 3. Policy: allow anon role to INSERT ONLY when captcha_verified = true
--    and stage is 'applied' (or omitted/default). This prevents anonymous writes
--    without captcha verification.
CREATE POLICY public_applications_anon_insert
  ON public.applications
  FOR INSERT
  TO anon
  WITH CHECK (
    COALESCE(captcha_verified, false) = true
    AND (stage IS NULL OR stage = 'applied')
  );

-- 4. Policy: allow authenticated users (recruiters) to SELECT all rows
CREATE POLICY public_applications_authenticated_select
  ON public.applications
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Policy: allow authenticated users to INSERT (if you want recruiters to create entries)
CREATE POLICY public_applications_authenticated_insert
  ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Policy: allow authenticated users to UPDATE any row
CREATE POLICY public_applications_authenticated_update
  ON public.applications
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. Policy: allow authenticated users to DELETE any row
CREATE POLICY public_applications_authenticated_delete
  ON public.applications
  FOR DELETE
  TO authenticated
  USING (true);

-- 8. Optional: Prevent anon from updating/deleting (explicit deny via absence of policy is enough).
--    But to be explicit, ensure there is NO policy granting anon UPDATE/DELETE.
--    (No SQL required here — we keep no anon UPDATE/DELETE policy.)

-- 9. Grants for convenience (non-privileged): ensure authenticated role can use table (not strictly required)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.applications TO authenticated;
