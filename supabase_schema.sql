-- Drop existing tables and types to start fresh
DROP TABLE IF EXISTS "public"."application_notes" CASCADE;
DROP TABLE IF EXISTS "public"."applications" CASCADE;
DROP TABLE IF EXISTS "public"."recruiter_settings" CASCADE;
DROP TYPE IF EXISTS "public"."ApplicationStatus";

-- Create tables
CREATE TABLE "public"."applications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "full_name" text,
    "email" text,
    "status" text, -- Changed from ENUM to text to allow 'applied'
    "recruiter_id" uuid,
    "available_from" timestamptz,
    "available_until" timestamptz,
    "availability_start_date" timestamptz,
    "availability_end_date" timestamptz,
    "availability_hours_per_week" integer,
    "timezone" text,
    "captcha_verified" boolean,
    "captcha_token" text,
    "disc_answers" jsonb, -- The flexible JSONB column for DISC
    "motivation_text" text,
    "project_example_text" text,
    "requirements_handling_text" text,
    "remote_work_text" text,
    "cover_letter" text,
    "project_interest" text[],
    
    -- Timestamps for tracking
    "task_sent_at" timestamp with time zone,
    "task_submitted_at" timestamp with time zone,
    "interview_at" timestamp with time zone,
    "decided_at" timestamp with time zone,
    "aiScore" real, -- New column for AI scoring

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

CREATE TABLE "public"."email_templates" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    "slug" text NOT NULL UNIQUE,
    "description" text,
    "subject" text,
    "body" text,
    CONSTRAINT "email_templates_pkey" PRIMARY KEY (id)
);

-- Add some default email templates
INSERT INTO "public"."email_templates" (slug, description, subject, body) VALUES
('application_received', 'Confirmation for new application', 'Thanks for your application to Take A Shot GmbH!', 'Hi {{full_name}},<br><br>Thanks for your application to Take A Shot GmbH. We have received your application and will get back to you shortly.<br><br>Best regards,<br>The Take A Shot Team'),
('interview_invite', 'Invitation for an interview', 'Interview Invitation - Take A Shot GmbH', 'Hi {{full_name}},<br><br>We would like to invite you for an interview for the {{position}} position at Take A Shot GmbH. Please use the following link to schedule a time: {{calendly_url}}<br><br>Best regards,<br>The Take A Shot Team'),
('rejection', 'Rejection letter', 'Update on your application to Take A Shot GmbH', 'Hi {{full_name}},<br><br>Thank you for your interest in Take A Shot GmbH. We appreciate you taking the time to apply. While your qualifications are impressive, we have decided to move forward with other candidates at this time.<br><br>We wish you the best in your job search.<br><br>Best regards,<br>The Take A Shot Team');

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

-- RLS for email_templates
ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read email templates" ON "public"."email_templates" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to update email templates" ON "public"."email_templates" FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert email templates" ON "public"."email_templates" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to delete email templates" ON "public"."email_templates" FOR DELETE TO authenticated USING (true);
