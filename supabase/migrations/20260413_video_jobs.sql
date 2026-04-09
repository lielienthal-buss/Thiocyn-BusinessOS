-- Migration: video_jobs
-- Created: 2026-04-13
-- Project: dfzrkzvsdiiihoejfozn (Thiocyn BusinessOS)
-- Purpose: Stores AI video/image generation jobs consumed by VideoGenerationView.tsx

CREATE TABLE IF NOT EXISTS video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  job_type text NOT NULL DEFAULT 'video' CHECK (job_type IN ('image', 'video')),
  prompt text NOT NULL,
  style_preset text NOT NULL DEFAULT 'cinematic',
  character_ref_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'processing', 'done', 'failed')),
  result_url text,
  credits_used real,
  error_msg text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- Admin full access policy
CREATE POLICY "Authenticated users can manage video_jobs" ON video_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime (used by VideoGenerationView)
ALTER PUBLICATION supabase_realtime ADD TABLE video_jobs;
