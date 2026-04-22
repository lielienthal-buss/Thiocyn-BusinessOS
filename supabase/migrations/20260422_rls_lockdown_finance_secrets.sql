-- =====================================================================
-- RLS Lockdown — Finance + Integration Secrets + Application Legacy
-- =====================================================================
-- Date: 2026-04-22
-- Reason: Audit found permissive USING(true) policies expose finance
--         data, integration secrets and application PII to all
--         authenticated team members regardless of role.
-- Effect: Read on finance tables → has_section_access('finance').
--         Write on finance tables → is_admin_or_owner().
--         integration_secrets readable only by service_role (Edge Fns).
-- Reversible: Yes — DROP new policies + CREATE old USING(true) policies.
--
-- AFFECTED USERS (per audit 2026-04-22):
--   READ Finance: jll, luis@mail, ph, vb, vp (admins/owners)
--                 + dnlktsk (staff with finance in allowed_sections)
--   WRITE Finance: only admin/owner (Luis, Peter, Valentin, Vanessa)
--   LOSE access: Tom, Mainak, Vincent, hiring inbox (no finance section)
-- =====================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 0. Helper: section-based access check (semantic, future-proof)
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_section_access(section_name text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY INVOKER
  SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE auth_user_id = ( SELECT auth.uid() )
      AND status = 'active'
      AND (
        role IN ('admin','owner')
        OR section_name = ANY(allowed_sections)
      )
  );
$$;
COMMENT ON FUNCTION public.has_section_access(text) IS
  'Returns true if calling user is active team_member AND (role admin/owner OR section in allowed_sections). Use in RLS policies for section-scoped access.';

-- ────────────────────────────────────────────────────────────────────
-- 1. integration_secrets — strip ALL human access
-- ────────────────────────────────────────────────────────────────────
-- Comment on table claims "Only readable by Edge Functions (service_role)"
-- but actual policies expose to authenticated. Fix by dropping both.
-- service_role bypasses RLS implicitly — no replacement policy needed.
DROP POLICY IF EXISTS "auth_all_isecrets" ON public.integration_secrets;
DROP POLICY IF EXISTS "auth_read_isecrets" ON public.integration_secrets;

-- ────────────────────────────────────────────────────────────────────
-- 2. finance_mails — fetched IMAP content
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "fm_select" ON public.finance_mails;
CREATE POLICY "finance_mails_select_finance" ON public.finance_mails
  FOR SELECT TO authenticated
  USING (has_section_access('finance'));
-- update/delete policies (fm_update, fm_delete) already use is_team_member /
-- is_admin_or_owner — leave as-is. Tighten later if needed.

-- ────────────────────────────────────────────────────────────────────
-- 3. finance_pipeline
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "finance_pipeline_select" ON public.finance_pipeline;
CREATE POLICY "finance_pipeline_select_finance" ON public.finance_pipeline
  FOR SELECT TO authenticated
  USING (has_section_access('finance'));

-- ────────────────────────────────────────────────────────────────────
-- 4. finance_mahnungen — OPOS list
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "fm_select" ON public.finance_mahnungen;
CREATE POLICY "finance_mahnungen_select_finance" ON public.finance_mahnungen
  FOR SELECT TO authenticated
  USING (has_section_access('finance'));

-- ────────────────────────────────────────────────────────────────────
-- 5. monthly_b2b_invoices
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated read monthly_b2b_invoices" ON public.monthly_b2b_invoices;
DROP POLICY IF EXISTS "authenticated write monthly_b2b_invoices" ON public.monthly_b2b_invoices;
CREATE POLICY "monthly_b2b_invoices_select_finance" ON public.monthly_b2b_invoices
  FOR SELECT TO authenticated
  USING (has_section_access('finance'));
CREATE POLICY "monthly_b2b_invoices_write_admin_owner" ON public.monthly_b2b_invoices
  FOR ALL TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- 6. creator_commissions — Read=finance, Write=admin/owner
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_cc" ON public.creator_commissions;
CREATE POLICY "creator_commissions_select_finance" ON public.creator_commissions
  FOR SELECT TO authenticated
  USING (has_section_access('finance'));
CREATE POLICY "creator_commissions_write_admin_owner" ON public.creator_commissions
  FOR ALL TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- 7. creator_payouts — Read=finance, Write=admin/owner
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth_all_cp" ON public.creator_payouts;
CREATE POLICY "creator_payouts_select_finance" ON public.creator_payouts
  FOR SELECT TO authenticated
  USING (has_section_access('finance'));
CREATE POLICY "creator_payouts_write_admin_owner" ON public.creator_payouts
  FOR ALL TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- 8. ecom_orders — Customer PII + order data
-- Read kept broad (support team needs it) — write restricted to admin
-- ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_access" ON public.ecom_orders;
CREATE POLICY "ecom_orders_select_team" ON public.ecom_orders
  FOR SELECT TO authenticated
  USING (is_team_member());
CREATE POLICY "ecom_orders_write_admin_owner" ON public.ecom_orders
  FOR ALL TO authenticated
  USING (is_admin_or_owner())
  WITH CHECK (is_admin_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- 9. applications — drop legacy USING(true), keep team-scoped
-- ────────────────────────────────────────────────────────────────────
-- Existing `applications_select_team` already enforces team_member check.
-- Legacy permissive policy makes it OR-evaluated to true → drop it.
DROP POLICY IF EXISTS "Allow authenticated users to read all data" ON public.applications;

COMMIT;

-- =====================================================================
-- POST-APPLY VERIFICATION (run separately):
-- =====================================================================
-- 1. As staff WITHOUT finance section (e.g. Mainak) — these = 0 rows:
--    SELECT count(*) FROM finance_mails;
--    SELECT count(*) FROM creator_commissions;
--
-- 2. As Danylo (staff WITH finance section) — these = data:
--    SELECT count(*) FROM finance_mails;
--
-- 3. As admin (Luis) — these = data:
--    SELECT count(*) FROM finance_mails;
--    SELECT count(*) FROM integration_secrets;  -- still 0! only service_role
--
-- 4. Edge Functions (service_role) — unchanged, all access continues.
-- =====================================================================
