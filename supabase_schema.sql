
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
    "timezone" text,
    "availability_hours_per_week" integer,
    "availability_start_date" date,
    "availability_end_date" date,
    "project_interest" text[],
    "disc_d" integer,
    "disc_i" integer,
    "disc_s" integer,
    "disc_c" integer,
    "disc_primary" text,
    "disc_secondary" text,
    "motivation_text" text,
    "project_example_text" text,
    "requirements_handling_text" text,
    "remote_work_text" text,
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
CREATE POLICY "Allow authenticated users to insert applications" ON "public"."applications" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to read all data" ON "public"."applications" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to update applications" ON "public"."applications" FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to manage notes" ON "public"."application_notes" FOR ALL TO authenticated USING (true);
