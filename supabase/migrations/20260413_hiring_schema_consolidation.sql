-- ============================================================
-- Hiring Schema Consolidation
-- Business OS — Hart Limes GmbH
-- Created: 2026-04-13
--
-- Documentation migration: schema already exists in live DB.
-- All statements are safe and idempotent (IF NOT EXISTS,
-- OR REPLACE, ON CONFLICT DO NOTHING/UPDATE).
-- No destructive operations.
-- ============================================================


-- ============================================================
-- 1. APPLICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id"                          uuid              NOT NULL DEFAULT gen_random_uuid(),
    "created_at"                  timestamptz       NOT NULL DEFAULT now(),
    "full_name"                   text,
    "email"                       text,
    "status"                      text,
    "recruiter_id"                uuid,
    "available_from"              timestamptz,
    "available_until"             timestamptz,
    "availability_hours_per_week" integer,
    "timezone"                    text,
    "captcha_verified"            boolean           DEFAULT false,
    "captcha_token"               text,
    "motivation_text"             text,
    "project_interest"            text[],
    "aiScore"                     real,
    "ai_analysis"                 text,
    -- V2 core columns
    "linkedin_url"                text,
    "project_highlight"           text,
    "psychometrics"               jsonb,
    "stage"                       text              NOT NULL DEFAULT 'applied',
    "access_token"                uuid              NOT NULL DEFAULT gen_random_uuid(),
    "work_sample_text"            text,
    -- Timestamps for pipeline tracking
    "task_sent_at"                timestamptz,
    "task_submitted_at"           timestamptz,
    "interview_at"                timestamptz,
    "decided_at"                  timestamptz,
    -- Deprecated V1 columns (kept for historical data)
    "disc_answers"                jsonb,
    "project_example_text"        text,
    "requirements_handling_text"  text,
    "remote_work_text"            text,
    "cover_letter"                text,
    CONSTRAINT "applications_pkey" PRIMARY KEY (id)
);

COMMENT ON COLUMN public.applications.stage IS
  'Manages candidate progress. Values: ''applied'', ''task_requested'', ''task_submitted'', ''rejected''.';
COMMENT ON COLUMN public.applications.status IS
  'Legacy V1 field — ''stage'' is the primary V2 indicator.';

-- Add any columns that may be missing on an existing table
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS "project_highlight"           text,
    ADD COLUMN IF NOT EXISTS "linkedin_url"                text,
    ADD COLUMN IF NOT EXISTS "psychometrics"               jsonb,
    ADD COLUMN IF NOT EXISTS "stage"                       text NOT NULL DEFAULT 'applied',
    ADD COLUMN IF NOT EXISTS "access_token"                uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS "work_sample_text"            text,
    ADD COLUMN IF NOT EXISTS "captcha_token"               text,
    ADD COLUMN IF NOT EXISTS "captcha_verified"            boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "aiScore"                     real,
    ADD COLUMN IF NOT EXISTS "ai_analysis"                 text,
    ADD COLUMN IF NOT EXISTS "task_sent_at"                timestamptz,
    ADD COLUMN IF NOT EXISTS "task_submitted_at"           timestamptz,
    ADD COLUMN IF NOT EXISTS "interview_at"                timestamptz,
    ADD COLUMN IF NOT EXISTS "decided_at"                  timestamptz;


-- ============================================================
-- 2. APPLICATION_NOTES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."application_notes" (
    "id"             uuid        NOT NULL DEFAULT gen_random_uuid(),
    "application_id" uuid        NOT NULL,
    "created_at"     timestamptz NOT NULL DEFAULT now(),
    "author_email"   text,
    "note_text"      text,
    CONSTRAINT "application_notes_pkey"             PRIMARY KEY (id),
    CONSTRAINT "application_notes_application_id_fkey"
        FOREIGN KEY (application_id)
        REFERENCES "public"."applications" (id)
        ON DELETE CASCADE
);


-- ============================================================
-- 3. RECRUITER_SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."recruiter_settings" (
    "id"           bigint      NOT NULL DEFAULT 1,
    "created_at"   timestamptz NOT NULL DEFAULT now(),
    "updated_at"   timestamptz          DEFAULT now(),
    "company_name" text,
    "calendly_url" text,
    "ai_instruction" text,
    CONSTRAINT "recruiter_settings_pkey" PRIMARY KEY (id)
);

-- Seed default row (safe upsert)
INSERT INTO "public"."recruiter_settings" (id, company_name, calendly_url)
VALUES (1, 'Take A Shot GmbH', 'https://calendly.com/take-a-shot/interview')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. EMAIL_TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    "updated_at"  timestamptz NOT NULL DEFAULT now(),
    "slug"        text        NOT NULL UNIQUE,
    "description" text,
    "subject"     text,
    "body"        text,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY (id)
);

-- Seed / upsert all standard templates
INSERT INTO "public"."email_templates" (slug, description, subject, body) VALUES
(
  'application_received',
  'Confirmation sent immediately after a candidate submits the form',
  'Application received — {{company_name}}',
  '<p>Hi {{full_name}},</p>
<p>Thanks for applying to <strong>{{company_name}}</strong>! We''ve received your application and will review it shortly.</p>
<p>We''ll be in touch with next steps. In the meantime, feel free to check out our brands at takeashot.de, drseverin.com, paigh.com, thiocyn.com, timber-john.com, and wristr.com.</p>
<p>Best regards,<br>The {{company_name}} Team</p>'
),
(
  'task_invite',
  'Work-sample task invitation sent after initial review',
  'Your next step at {{company_name}} 🎯',
  '<p>Hi {{full_name}},</p>
<p>Thanks for applying to <strong>{{company_name}}</strong>! We''ve reviewed your application and we''d love to see what you can do.</p>
<p>We''ve put together a short work sample task for you. Please complete it within <strong>72 hours</strong> — no extensions, since we''re running a tight hiring timeline.</p>
<p><a href="{{task_link}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Start Your Task →</a></p>
<p>The task should take around 2–3 hours. Don''t overthink it — we want to see how you approach real work, not a polished presentation.</p>
<p>Good luck!<br>The {{company_name}} Team</p>'
),
(
  'interview_invite',
  'Interview invitation sent after a strong task submission',
  'Interview Invitation — {{company_name}} 🚀',
  '<p>Hi {{full_name}},</p>
<p>Great news — we loved your work sample and we''d like to invite you to a short interview with the team at <strong>{{company_name}}</strong>.</p>
<p>Please book a slot here:<br>
<a href="{{calendly_url}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Book Your Interview →</a></p>
<p>The interview is ~30 minutes. Come prepared to talk about your task submission and why you''re excited about joining us.</p>
<p>Looking forward to meeting you!<br>The {{company_name}} Team</p>'
),
(
  'rejection',
  'Rejection letter for candidates not moving forward',
  'Your application at {{company_name}}',
  '<p>Hi {{full_name}},</p>
<p>Thank you for taking the time to apply to <strong>{{company_name}}</strong> and for completing our application process.</p>
<p>After careful consideration, we''ve decided to move forward with other candidates whose profiles more closely match what we''re looking for at this stage.</p>
<p>We genuinely appreciate your interest and the effort you put in. We wish you all the best in your search.</p>
<p>Kind regards,<br>The {{company_name}} Team</p>'
),
(
  'offer',
  'Offer letter sent to successful candidates',
  'Welcome to the team — {{company_name}} 🎉',
  '<p>Hi {{full_name}},</p>
<p>We''re thrilled to offer you a position at <strong>{{company_name}}</strong>! Your application really stood out and we''d love to have you on board.</p>
<p><strong>Next steps:</strong> Please review and sign the documents we''ll share separately (Internship Agreement, Code of Conduct, Data Protection Policy).</p>
<p>We''re flexible on hours and happy to work around your schedule. If you have any questions, just reply to this email.</p>
<p>Welcome to the team!<br>The {{company_name}} Team</p>'
)
ON CONFLICT (slug) DO UPDATE SET
    subject     = EXCLUDED.subject,
    body        = EXCLUDED.body,
    updated_at  = now();


-- ============================================================
-- 5. PROJECT_AREAS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS "public"."project_areas" (
    "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
    "created_at"  timestamptz NOT NULL DEFAULT now(),
    "name"        text        NOT NULL,
    "description" text,
    CONSTRAINT "project_areas_pkey" PRIMARY KEY (id)
);


-- ============================================================
-- 6. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_applications_access_token
    ON public.applications (access_token);


-- ============================================================
-- 7. ROW LEVEL SECURITY — ENABLE
-- ============================================================

ALTER TABLE "public"."applications"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application_notes"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."recruiter_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."email_templates"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."project_areas"      ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. RLS POLICIES — idempotent via DO blocks
-- ============================================================

-- recruiter_settings: public read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'recruiter_settings'
      AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access"
      ON "public"."recruiter_settings"
      FOR SELECT USING (true);
  END IF;
END $$;

-- applications: anon insert (captcha-gated)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
      AND policyname = 'Allow anon users to insert applications with verified captcha'
  ) THEN
    CREATE POLICY "Allow anon users to insert applications with verified captcha"
      ON "public"."applications"
      FOR INSERT TO anon
      WITH CHECK (
        COALESCE(captcha_verified, false) = true
        AND (stage IS NULL OR stage = 'applied')
      );
  END IF;
END $$;

-- applications: authenticated full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
      AND policyname = 'Allow authenticated users to read all data'
  ) THEN
    CREATE POLICY "Allow authenticated users to read all data"
      ON "public"."applications"
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
      AND policyname = 'Allow authenticated users to update applications'
  ) THEN
    CREATE POLICY "Allow authenticated users to update applications"
      ON "public"."applications"
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
      AND policyname = 'Allow authenticated users to delete applications'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete applications"
      ON "public"."applications"
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'applications'
      AND policyname = 'Allow authenticated users to insert applications'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert applications"
      ON "public"."applications"
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- application_notes: authenticated full access
DO $$ BEGIN
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

-- email_templates: authenticated full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_templates'
      AND policyname = 'Allow authenticated users to read email templates'
  ) THEN
    CREATE POLICY "Allow authenticated users to read email templates"
      ON "public"."email_templates"
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_templates'
      AND policyname = 'Allow authenticated users to update email templates'
  ) THEN
    CREATE POLICY "Allow authenticated users to update email templates"
      ON "public"."email_templates"
      FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_templates'
      AND policyname = 'Allow authenticated users to insert email templates'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert email templates"
      ON "public"."email_templates"
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_templates'
      AND policyname = 'Allow authenticated users to delete email templates'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete email templates"
      ON "public"."email_templates"
      FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- project_areas: authenticated full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_areas'
      AND policyname = 'Allow authenticated users to manage project areas'
  ) THEN
    CREATE POLICY "Allow authenticated users to manage project areas"
      ON "public"."project_areas"
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ============================================================
-- 9. RPC FUNCTIONS
-- ============================================================

-- submit_application
-- Called by the public application form (lib/actions.ts → submitApplicationAction).
-- SECURITY DEFINER allows anon role to insert without bypassing RLS manually.
CREATE OR REPLACE FUNCTION public.submit_application(
    p_full_name               TEXT,
    p_email                   TEXT,
    p_linkedin_url            TEXT,
    p_project_highlight       TEXT,
    p_psychometrics           JSONB,
    p_preferred_project_areas TEXT[],
    p_stage                   TEXT    DEFAULT 'applied',
    p_captcha_token           TEXT    DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION public.submit_application(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_application(TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[], TEXT, TEXT) TO authenticated;


-- submit_task_response
-- Called from the public task page via the candidate's unique access_token link.
-- Sets work_sample_text and advances stage to 'task_submitted'.
CREATE OR REPLACE FUNCTION public.submit_task_response(
    p_token  UUID,
    p_answer TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.applications
    SET
        work_sample_text  = p_answer,
        stage             = 'task_submitted',
        task_submitted_at = now()
    WHERE access_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_task_response(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_task_response(UUID, TEXT) TO authenticated;


-- ============================================================
-- Done.
-- Verify with:
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_name = 'applications'
--   ORDER BY ordinal_position;
-- ============================================================
