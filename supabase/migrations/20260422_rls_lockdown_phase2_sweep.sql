-- =====================================================================
-- RLS Lockdown Phase 2.2 — Sweep aller verbliebenen permissive Policies
-- =====================================================================
-- Date: 2026-04-22
-- Reason: 28 Tabellen hatten USING(true) für authenticated. Default-Move:
--           SELECT → is_team_member()       (any active team_member)
--           WRITE  → is_admin_or_owner()    (only Luis, Peter, Valentin, Vanessa, hiring@)
--         Plus High-Sensitivity-Tabellen → SELECT auch admin/owner only.
-- Reversible: ja — DROP new + CREATE old USING(true).
-- Anon-Policies (assignment_templates anon read, applications anon insert,
-- project_areas anon read) bleiben unverändert — intentional für Forms.
-- =====================================================================

-- ────────────────────────────────────────────────────────────────────
-- HIGH SENSITIVITY — admin/owner-only read+write
-- ────────────────────────────────────────────────────────────────────

-- security_incidents — Audit-Log
DROP POLICY IF EXISTS "auth_read_security_incidents" ON public.security_incidents;
DROP POLICY IF EXISTS "auth_write_security_incidents" ON public.security_incidents;
CREATE POLICY "security_incidents_select_admin" ON public.security_incidents
  FOR SELECT TO authenticated USING (is_admin_or_owner());
CREATE POLICY "security_incidents_write_admin" ON public.security_incidents
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- recruiter_settings — Konfig (vorher PUBLIC read!)
DROP POLICY IF EXISTS "Allow public read access" ON public.recruiter_settings;
CREATE POLICY "recruiter_settings_select_admin" ON public.recruiter_settings
  FOR SELECT TO authenticated USING (is_admin_or_owner());
CREATE POLICY "recruiter_settings_write_admin" ON public.recruiter_settings
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- intern_token_usage — AI Cost Tracking
DROP POLICY IF EXISTS "itu_select" ON public.intern_token_usage;
CREATE POLICY "intern_token_usage_select_admin" ON public.intern_token_usage
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- business_risks
DROP POLICY IF EXISTS "auth_read_business_risks" ON public.business_risks;
DROP POLICY IF EXISTS "auth_write_business_risks" ON public.business_risks;
CREATE POLICY "business_risks_select_admin" ON public.business_risks
  FOR SELECT TO authenticated USING (is_admin_or_owner());
CREATE POLICY "business_risks_write_admin" ON public.business_risks
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- risk_register
DROP POLICY IF EXISTS "auth_read_risk_register" ON public.risk_register;
DROP POLICY IF EXISTS "auth_write_risk_register" ON public.risk_register;
CREATE POLICY "risk_register_select_admin" ON public.risk_register
  FOR SELECT TO authenticated USING (is_admin_or_owner());
CREATE POLICY "risk_register_write_admin" ON public.risk_register
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- non_conformances
DROP POLICY IF EXISTS "auth_read_non_conformances" ON public.non_conformances;
DROP POLICY IF EXISTS "auth_write_non_conformances" ON public.non_conformances;
CREATE POLICY "non_conformances_select_admin" ON public.non_conformances
  FOR SELECT TO authenticated USING (is_admin_or_owner());
CREATE POLICY "non_conformances_write_admin" ON public.non_conformances
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- access_requests
DROP POLICY IF EXISTS "ar_select" ON public.access_requests;
CREATE POLICY "access_requests_select_admin" ON public.access_requests
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- application_notes — internal recruiter notes
DROP POLICY IF EXISTS "Allow authenticated users to view notes" ON public.application_notes;
CREATE POLICY "application_notes_select_admin" ON public.application_notes
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- email_queue — pending mails
DROP POLICY IF EXISTS "eq_select" ON public.email_queue;
CREATE POLICY "email_queue_select_admin" ON public.email_queue
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- intern_final_review
DROP POLICY IF EXISTS "ifr_select" ON public.intern_final_review;
CREATE POLICY "intern_final_review_select_admin" ON public.intern_final_review
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- intern_weekly_reviews
DROP POLICY IF EXISTS "iwr_select" ON public.intern_weekly_reviews;
CREATE POLICY "intern_weekly_reviews_select_admin" ON public.intern_weekly_reviews
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- intern_learning_log
DROP POLICY IF EXISTS "ill_select" ON public.intern_learning_log;
CREATE POLICY "intern_learning_log_select_admin" ON public.intern_learning_log
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- usage_rights_consent — legal documents
DROP POLICY IF EXISTS "auth_all_urc" ON public.usage_rights_consent;
CREATE POLICY "usage_rights_consent_select_admin" ON public.usage_rights_consent
  FOR SELECT TO authenticated USING (is_admin_or_owner());
CREATE POLICY "usage_rights_consent_write_admin" ON public.usage_rights_consent
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- MEDIUM SENSITIVITY — team_member read, admin write
-- ────────────────────────────────────────────────────────────────────

-- creators
DROP POLICY IF EXISTS "cr_select" ON public.creators;
CREATE POLICY "creators_select_team" ON public.creators
  FOR SELECT TO authenticated USING (is_team_member());

-- creator_brands
DROP POLICY IF EXISTS "auth_all_cb" ON public.creator_brands;
CREATE POLICY "creator_brands_select_team" ON public.creator_brands
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "creator_brands_write_admin" ON public.creator_brands
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- creator_gifts
DROP POLICY IF EXISTS "auth_all_gifts" ON public.creator_gifts;
CREATE POLICY "creator_gifts_select_team" ON public.creator_gifts
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "creator_gifts_write_admin" ON public.creator_gifts
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- creator_prospects
DROP POLICY IF EXISTS "auth_all_prospects" ON public.creator_prospects;
CREATE POLICY "creator_prospects_select_team" ON public.creator_prospects
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "creator_prospects_write_admin" ON public.creator_prospects
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ad_campaigns
DROP POLICY IF EXISTS "authenticated_access" ON public.ad_campaigns;
CREATE POLICY "ad_campaigns_select_team" ON public.ad_campaigns
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "ad_campaigns_write_admin" ON public.ad_campaigns
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- ads_metrics
DROP POLICY IF EXISTS "am_select" ON public.ads_metrics;
CREATE POLICY "ads_metrics_select_team" ON public.ads_metrics
  FOR SELECT TO authenticated USING (is_team_member());

-- product_performance
DROP POLICY IF EXISTS "auth_all_pp" ON public.product_performance;
DROP POLICY IF EXISTS "auth_read_pp" ON public.product_performance;
CREATE POLICY "product_performance_select_team" ON public.product_performance
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "product_performance_write_admin" ON public.product_performance
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- brand_configs
DROP POLICY IF EXISTS "auth_all_bc" ON public.brand_configs;
DROP POLICY IF EXISTS "auth_read_bc" ON public.brand_configs;
CREATE POLICY "brand_configs_select_team" ON public.brand_configs
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "brand_configs_write_admin" ON public.brand_configs
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- content_outputs
DROP POLICY IF EXISTS "co_select" ON public.content_outputs;
CREATE POLICY "content_outputs_select_team" ON public.content_outputs
  FOR SELECT TO authenticated USING (is_team_member());

-- content_queue
DROP POLICY IF EXISTS "cq_select" ON public.content_queue;
CREATE POLICY "content_queue_select_team" ON public.content_queue
  FOR SELECT TO authenticated USING (is_team_member());

-- email_templates
DROP POLICY IF EXISTS "Allow authenticated users to read email templates" ON public.email_templates;
CREATE POLICY "email_templates_select_team" ON public.email_templates
  FOR SELECT TO authenticated USING (is_team_member());

-- video_jobs
DROP POLICY IF EXISTS "Authenticated users can manage video_jobs" ON public.video_jobs;
CREATE POLICY "video_jobs_select_team" ON public.video_jobs
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "video_jobs_write_admin" ON public.video_jobs
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- hiring_tasks
DROP POLICY IF EXISTS "ht_select" ON public.hiring_tasks;
CREATE POLICY "hiring_tasks_select_team" ON public.hiring_tasks
  FOR SELECT TO authenticated USING (is_team_member());

-- intern_accounts — list of intern users
DROP POLICY IF EXISTS "ia_select" ON public.intern_accounts;
CREATE POLICY "intern_accounts_select_team" ON public.intern_accounts
  FOR SELECT TO authenticated USING (is_team_member());

-- intern_assignments
DROP POLICY IF EXISTS "authenticated full access" ON public.intern_assignments;
CREATE POLICY "intern_assignments_select_team" ON public.intern_assignments
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "intern_assignments_write_admin" ON public.intern_assignments
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- intern_goals
DROP POLICY IF EXISTS "authenticated full access" ON public.intern_goals;
CREATE POLICY "intern_goals_select_team" ON public.intern_goals
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "intern_goals_write_admin" ON public.intern_goals
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- intern_milestones
DROP POLICY IF EXISTS "authenticated full access" ON public.intern_milestones;
CREATE POLICY "intern_milestones_select_team" ON public.intern_milestones
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "intern_milestones_write_admin" ON public.intern_milestones
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- intern_meeting_attendance
DROP POLICY IF EXISTS "authenticated full access" ON public.intern_meeting_attendance;
CREATE POLICY "intern_meeting_attendance_select_team" ON public.intern_meeting_attendance
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "intern_meeting_attendance_write_admin" ON public.intern_meeting_attendance
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- intern_onboarding_checklist
DROP POLICY IF EXISTS "ioc_select" ON public.intern_onboarding_checklist;
CREATE POLICY "intern_onboarding_checklist_select_team" ON public.intern_onboarding_checklist
  FOR SELECT TO authenticated USING (is_team_member());

-- monday_meetings
DROP POLICY IF EXISTS "authenticated full access" ON public.monday_meetings;
CREATE POLICY "monday_meetings_select_team" ON public.monday_meetings
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "monday_meetings_write_admin" ON public.monday_meetings
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- assignment_templates — anon read bleibt!
DROP POLICY IF EXISTS "authenticated full access" ON public.assignment_templates;
-- "anon reads templates" stays — public hiring page fetches templates
CREATE POLICY "assignment_templates_write_admin" ON public.assignment_templates
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- support_tickets
DROP POLICY IF EXISTS "Authenticated users can read support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can update support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Authenticated users can delete support_tickets" ON public.support_tickets;
CREATE POLICY "support_tickets_select_team" ON public.support_tickets
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "support_tickets_update_team" ON public.support_tickets
  FOR UPDATE TO authenticated USING (is_team_member()) WITH CHECK (is_team_member());
CREATE POLICY "support_tickets_delete_admin" ON public.support_tickets
  FOR DELETE TO authenticated USING (is_admin_or_owner());

-- funnel_submissions — leads with PII
DROP POLICY IF EXISTS "authenticated can read funnel submissions" ON public.funnel_submissions;
DROP POLICY IF EXISTS "authenticated can update funnel submissions" ON public.funnel_submissions;
CREATE POLICY "funnel_submissions_select_team" ON public.funnel_submissions
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "funnel_submissions_update_admin" ON public.funnel_submissions
  FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- form_events — lead PII / event-log
DROP POLICY IF EXISTS "Authenticated can read events" ON public.form_events;
CREATE POLICY "form_events_select_admin" ON public.form_events
  FOR SELECT TO authenticated USING (is_admin_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- LOW SENSITIVITY — team_member read (operational logs)
-- ────────────────────────────────────────────────────────────────────

-- sync_log
DROP POLICY IF EXISTS "auth_read_sync_log" ON public.sync_log;
DROP POLICY IF EXISTS "auth_write_sync_log" ON public.sync_log;
CREATE POLICY "sync_log_select_team" ON public.sync_log
  FOR SELECT TO authenticated USING (is_team_member());
CREATE POLICY "sync_log_write_admin" ON public.sync_log
  FOR ALL TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());

-- shopify_sync_log
DROP POLICY IF EXISTS "auth_read_ssl" ON public.shopify_sync_log;
CREATE POLICY "shopify_sync_log_select_team" ON public.shopify_sync_log
  FOR SELECT TO authenticated USING (is_team_member());

-- project_areas — Duplikat-Policy aufräumen, anon read bleibt
DROP POLICY IF EXISTS "Allow authenticated users to view project_areas" ON public.project_areas;
DROP POLICY IF EXISTS "Allow authenticated users to view project areas" ON public.project_areas;
CREATE POLICY "project_areas_select_team" ON public.project_areas
  FOR SELECT TO authenticated USING (is_team_member());
-- "Allow public users to view project_areas" (anon read) bleibt für Hiring-Funnel
