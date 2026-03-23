-- =============================================
-- FOUNDERS ASSOCIATE ACADEMY — DB MIGRATION
-- Run in Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Weekly Check-ins
CREATE TABLE IF NOT EXISTS "public"."intern_weekly_reviews" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "application_id" uuid NOT NULL,
  "week_number" integer NOT NULL,
  "highlight" text,
  "challenge" text,
  "learning" text,
  "next_goal" text,
  "mood_score" integer CHECK (mood_score BETWEEN 1 AND 5),
  "admin_feedback" text,
  CONSTRAINT "intern_weekly_reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "intern_weekly_reviews_application_id_fkey"
    FOREIGN KEY (application_id) REFERENCES "public"."applications" (id) ON DELETE CASCADE
);

ALTER TABLE "public"."intern_weekly_reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert (intern portal)" ON "public"."intern_weekly_reviews"
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read own (via token join)" ON "public"."intern_weekly_reviews"
  FOR SELECT TO anon USING (true);
CREATE POLICY "Allow authenticated full access" ON "public"."intern_weekly_reviews"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Learning Log / Tasks during internship
CREATE TABLE IF NOT EXISTS "public"."intern_learning_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "application_id" uuid NOT NULL,
  "type" text NOT NULL DEFAULT 'task', -- 'task' | 'learning' | 'resource' | 'achievement'
  "title" text NOT NULL,
  "body" text,
  "completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamptz,
  CONSTRAINT "intern_learning_log_pkey" PRIMARY KEY (id),
  CONSTRAINT "intern_learning_log_application_id_fkey"
    FOREIGN KEY (application_id) REFERENCES "public"."applications" (id) ON DELETE CASCADE
);

ALTER TABLE "public"."intern_learning_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON "public"."intern_learning_log"
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public read" ON "public"."intern_learning_log"
  FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public update" ON "public"."intern_learning_log"
  FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow authenticated full access" ON "public"."intern_learning_log"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Final Review / Exit Assessment
CREATE TABLE IF NOT EXISTS "public"."intern_final_review" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "application_id" uuid NOT NULL UNIQUE,
  "overall_rating" integer CHECK (overall_rating BETWEEN 1 AND 5),
  "key_contributions" text,
  "growth_areas" text,
  "recommend_for_hire" boolean,
  "admin_notes" text,
  "ai_summary" text,
  "certificate_issued_at" timestamptz,
  CONSTRAINT "intern_final_review_pkey" PRIMARY KEY (id),
  CONSTRAINT "intern_final_review_application_id_fkey"
    FOREIGN KEY (application_id) REFERENCES "public"."applications" (id) ON DELETE CASCADE
);

ALTER TABLE "public"."intern_final_review" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access" ON "public"."intern_final_review"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read" ON "public"."intern_final_review"
  FOR SELECT TO anon USING (true);

-- 4. Onboarding Checklists (move from localStorage to Supabase)
CREATE TABLE IF NOT EXISTS "public"."intern_onboarding_checklist" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "application_id" uuid NOT NULL UNIQUE,
  "items" jsonb NOT NULL DEFAULT '{}',
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "intern_onboarding_checklist_pkey" PRIMARY KEY (id),
  CONSTRAINT "intern_onboarding_checklist_application_id_fkey"
    FOREIGN KEY (application_id) REFERENCES "public"."applications" (id) ON DELETE CASCADE
);

ALTER TABLE "public"."intern_onboarding_checklist" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access" ON "public"."intern_onboarding_checklist"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
