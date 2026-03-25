-- 72h Auto-Reject via pg_cron
-- Requires pg_cron extension enabled in Supabase (Dashboard → Extensions → pg_cron)
-- Run in Supabase SQL Editor AFTER enabling pg_cron

-- Enable extension (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant pg_cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create auto-reject function
CREATE OR REPLACE FUNCTION auto_reject_expired_tasks()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE applications
  SET
    stage = 'rejected',
    decided_at = NOW()
  WHERE
    stage = 'task_requested'
    AND task_sent_at IS NOT NULL
    AND task_sent_at < NOW() - INTERVAL '72 hours';
END;
$$;

-- Schedule: run every hour
SELECT cron.schedule(
  'auto-reject-expired-tasks',  -- job name (unique)
  '0 * * * *',                  -- every hour at :00
  'SELECT auto_reject_expired_tasks()'
);

-- Verify it was scheduled:
-- SELECT * FROM cron.job WHERE jobname = 'auto-reject-expired-tasks';
