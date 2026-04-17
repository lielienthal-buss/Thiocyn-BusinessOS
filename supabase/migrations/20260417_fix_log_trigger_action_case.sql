-- =============================================================================
-- Migration: 20260417_fix_log_trigger_action_case.sql
-- Purpose:   Fix log_table_change() to write lowercase action values.
-- Reason:    audit_log.action CHECK constraint allows only
--            ('insert','update','delete','approve','reject') — lowercase.
--            Original trigger wrote 'UPDATE' etc. which violated the CHECK
--            and blocked all UPDATEs on tracked tables.
-- Author:    Jarvis
-- Date:      2026-04-17
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    UUID;
  v_actor_email TEXT;
  v_row_id      UUID;
  v_diff        JSONB;
BEGIN
  BEGIN
    v_actor_id    := auth.uid();
    v_actor_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    v_actor_id    := NULL;
    v_actor_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_row_id := OLD.id;
    INSERT INTO public.audit_log
      (table_name, row_id, action, operation, actor_id, actor_email, old_data)
    VALUES
      (TG_TABLE_NAME, v_row_id, 'delete', 'DELETE', v_actor_id, v_actor_email, to_jsonb(OLD));
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_row_id := NEW.id;
    SELECT jsonb_object_agg(n.key, n.value)
    INTO   v_diff
    FROM   jsonb_each(to_jsonb(NEW)) n
    WHERE  (to_jsonb(OLD) -> n.key) IS DISTINCT FROM n.value;

    INSERT INTO public.audit_log
      (table_name, row_id, action, operation, actor_id, actor_email, old_data, new_data, diff)
    VALUES
      (TG_TABLE_NAME, v_row_id, 'update', 'UPDATE', v_actor_id, v_actor_email,
       to_jsonb(OLD), to_jsonb(NEW), v_diff);
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    v_row_id := NEW.id;
    INSERT INTO public.audit_log
      (table_name, row_id, action, operation, actor_id, actor_email, new_data)
    VALUES
      (TG_TABLE_NAME, v_row_id, 'insert', 'INSERT', v_actor_id, v_actor_email, to_jsonb(NEW));
    RETURN NEW;

  END IF;

  RETURN NULL;
END;
$$;
