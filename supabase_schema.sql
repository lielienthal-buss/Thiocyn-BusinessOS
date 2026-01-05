-- Drop existing tables and types to start fresh
DROP TABLE IF EXISTS "public"."application_notes" CASCADE;
DROP TABLE IF EXISTS "public"."applications" CASCADE;
DROP TABLE IF EXISTS "public"."recruiter_settings" CASCADE;
DROP TYPE IF EXISTS "public"."ApplicationStatus";

-- Recreate types
CREATE TYPE "public"."ApplicationStatus" AS ENUM ('new', 'review', 'task_sent', 'task_submitted', 'interview', 'accepted', 'rejected');

-- Create tables
CREATE TABLE "public"."applications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "full_name" text,
    "email" text,
    "cover_letter" text, -- Added
    "timezone" text,
    "availability_hours_per_week" integer,
    "availability_start_date" date,
    "availability_end_date" date,
    "project_interest" text[],
    "disc_q1" text,
    "disc_q2" text,
    "disc_q3" text,
    "disc_q4" text,
    "disc_q5" text,
    "disc_q6" text,
    "disc_q7" text,
    "disc_q8" text,
    "disc_q9" text,
    "disc_q10" text,
    "disc_count_d" integer DEFAULT 0,
    "disc_count_i" integer DEFAULT 0,
    "disc_count_s" integer DEFAULT 0,
    "disc_count_c" integer DEFAULT 0,
    "motivation_text" text,
    "project_example_text" text,,
    "requirements_handling_text" text,
    "remote_work_text" text,
    "captcha_token" text,
    "status" "public"."ApplicationStatus" NOT NULL DEFAULT 'new',
    "task_sent_at" timestamp with time zone,
    "task_submitted_at" timestamp with time zone,
    "interview_at" timestamp with time zone,
    "decided_at" timestamp with time zone,
    CONSTRAINT "applications_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."recruiter_settings" (
    "id" bigint NOT NULL DEFAULT 1,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "calendly_url" text,
    "company_name" text,
    "ai_instruction" text,
    CONSTRAINT "recruiter_settings_pkey" PRIMARY KEY (id)
);

-- Insert default settings
INSERT INTO "public"."recruiter_settings" (id, company_name) VALUES (1, 'Take A Shot GmbH') ON CONFLICT (id) DO NOTHING;

CREATE TABLE "public"."application_notes" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "application_id" uuid NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "author_email" text,
    "note_text" text,
    CONSTRAINT "application_notes_pkey" PRIMARY KEY (id),
    CONSTRAINT "application_notes_application_id_fkey" FOREIGN KEY (application_id) REFERENCES "public"."applications" (id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public" ."recruiter_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."application_notes" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access" ON "public"."recruiter_settings" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow authenticated users to insert applications" ON public.applications;
CREATE POLICY "Allow anon users to insert applications" ON "public"."applications" FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated users to read all data" ON "public"."applications" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to update applications" ON "public"."applications" FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage notes" ON "public"."application_notes" FOR ALL TO authenticated USING (true);
