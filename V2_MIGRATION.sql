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

-- Enable RLS on the applications table if not already enabled
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Policy for anonymous users to insert new applications (Stage 1)
-- This policy was already in supabase_update_prompt.txt, ensuring it's present.
DROP POLICY IF EXISTS "Allow anon users to insert applications" ON public.applications;
CREATE POLICY "Allow anon users to insert applications"
ON public.applications
FOR INSERT
TO anon
WITH CHECK (true);

-- Policy for authenticated users (recruiters) to view all applications
DROP POLICY IF EXISTS "Recruiters can view all applications" ON public.applications;
CREATE POLICY "Recruiters can view all applications"
ON public.applications
FOR SELECT
TO authenticated
USING (true);

-- Policy for authenticated users (recruiters) to update applications
-- This allows recruiters to change the 'stage' and other fields.
DROP POLICY IF EXISTS "Recruiters can update applications" ON public.applications;
CREATE POLICY "Recruiters can update applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for authenticated users (recruiters) to delete applications
DROP POLICY IF EXISTS "Recruiters can delete applications" ON public.applications;
CREATE POLICY "Recruiters can delete applications"
ON public.applications
FOR DELETE
TO authenticated
USING (true);