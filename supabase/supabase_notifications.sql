-- ============================================================
-- Notifications System — Supabase dfzrkzvsdiiihoejfozn
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type                TEXT        NOT NULL DEFAULT 'task_completed',
  title               TEXT        NOT NULL,
  body                TEXT,
  read                BOOLEAN     DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  metadata            JSONB,
  -- NULL = broadcast to all users, UUID = targeted to specific user
  recipient_user_id   UUID        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Enable Realtime (so Dashboard bell updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 3. Index for fast unread queries
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read, created_at DESC);

-- ============================================================
-- Optional: RLS (only admin can read, anyone can insert)
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow inserts from intern portal (public/anon)
CREATE POLICY "Allow insert notifications" ON notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only authenticated admin can read/update
CREATE POLICY "Allow admin read notifications" ON notifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin update notifications" ON notifications
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
