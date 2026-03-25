-- =============================================
-- FA ACADEMY V2 — DB MIGRATION
-- Projekt: dfzrkzvsdiiihoejfozn
-- Referenziert intern_accounts statt applications
-- =============================================

-- 1. Weekly Check-ins
CREATE TABLE IF NOT EXISTS public.intern_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intern_id uuid NOT NULL REFERENCES public.intern_accounts(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  highlight text,
  challenge text,
  learning text,
  next_goal text,
  mood_score integer CHECK (mood_score BETWEEN 1 AND 5),
  admin_feedback text
);

ALTER TABLE public.intern_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON public.intern_weekly_reviews
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "intern reads own reviews" ON public.intern_weekly_reviews
  FOR SELECT TO authenticated
  USING (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()));
CREATE POLICY "intern inserts own reviews" ON public.intern_weekly_reviews
  FOR INSERT TO authenticated
  WITH CHECK (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()));

-- 2. Learning Log
CREATE TABLE IF NOT EXISTS public.intern_learning_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intern_id uuid NOT NULL REFERENCES public.intern_accounts(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'task', -- 'task' | 'learning' | 'resource' | 'achievement'
  title text NOT NULL,
  body text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);

ALTER TABLE public.intern_learning_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON public.intern_learning_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "intern manages own log" ON public.intern_learning_log
  FOR ALL TO authenticated
  USING (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()))
  WITH CHECK (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()));

-- 3. Final Review
CREATE TABLE IF NOT EXISTS public.intern_final_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  intern_id uuid NOT NULL UNIQUE REFERENCES public.intern_accounts(id) ON DELETE CASCADE,
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),
  key_contributions text,
  growth_areas text,
  recommend_for_hire boolean,
  admin_notes text,
  ai_summary text,
  certificate_issued_at timestamptz
);

ALTER TABLE public.intern_final_review ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON public.intern_final_review
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "intern reads own review" ON public.intern_final_review
  FOR SELECT TO authenticated
  USING (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()));

-- 4. Onboarding Checklist
CREATE TABLE IF NOT EXISTS public.intern_onboarding_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id uuid NOT NULL UNIQUE REFERENCES public.intern_accounts(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intern_onboarding_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON public.intern_onboarding_checklist
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "intern manages own checklist" ON public.intern_onboarding_checklist
  FOR ALL TO authenticated
  USING (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()))
  WITH CHECK (intern_id IN (SELECT id FROM public.intern_accounts WHERE auth_user_id = auth.uid()));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_intern_id ON public.intern_weekly_reviews(intern_id);
CREATE INDEX IF NOT EXISTS idx_learning_log_intern_id ON public.intern_learning_log(intern_id);
