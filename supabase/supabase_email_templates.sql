-- Email Templates + recruiter_settings setup
-- Run in Supabase SQL Editor

-- 1. Ensure email_templates table exists
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure recruiter_settings table exists
CREATE TABLE IF NOT EXISTS recruiter_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name TEXT DEFAULT 'Take A Shot GmbH',
  calendly_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row (upsert safe)
INSERT INTO recruiter_settings (id, company_name, calendly_url)
VALUES (1, 'Take A Shot GmbH', 'https://calendly.com/take-a-shot/interview')
ON CONFLICT (id) DO NOTHING;

-- 3. Add ai_analysis column to applications (needed for analyze-applicant Edge Function)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS "aiScore" INTEGER;

-- 4. Upsert email templates
INSERT INTO email_templates (slug, subject, body) VALUES
(
  'task_invite',
  'Your next step at {{company_name}} 🎯',
  '<p>Hi {{full_name}},</p>
<p>Thanks for applying to <strong>{{company_name}}</strong>! We''ve reviewed your application and we''d love to see what you can do.</p>
<p>We''ve put together a short work sample task for you. Please complete it within <strong>72 hours</strong> — no extensions, since we''re running a tight hiring timeline.</p>
<p><a href="{{task_link}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Start Your Task →</a></p>
<p>The task should take around 2–3 hours. Don''t overthink it — we want to see how you approach real work, not a polished presentation.</p>
<p>Good luck!<br>The {{company_name}} Team</p>'
),
(
  'interview_invite',
  'Interview Invitation — {{company_name}} 🚀',
  '<p>Hi {{full_name}},</p>
<p>Great news — we loved your work sample and we''d like to invite you to a short interview with the team at <strong>{{company_name}}</strong>.</p>
<p>Please book a slot here:<br>
<a href="{{calendly_url}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Book Your Interview →</a></p>
<p>The interview is ~30 minutes. Come prepared to talk about your task submission and why you''re excited about joining us.</p>
<p>Looking forward to meeting you!<br>The {{company_name}} Team</p>'
),
(
  'rejection',
  'Your application at {{company_name}}',
  '<p>Hi {{full_name}},</p>
<p>Thank you for taking the time to apply to <strong>{{company_name}}</strong> and for completing our application process.</p>
<p>After careful consideration, we''ve decided to move forward with other candidates whose profiles more closely match what we''re looking for at this stage.</p>
<p>We genuinely appreciate your interest and the effort you put in. We wish you all the best in your search.</p>
<p>Kind regards,<br>The {{company_name}} Team</p>'
)
,
(
  'application_received',
  'Application received — {{company_name}}',
  '<p>Hi {{full_name}},</p>
<p>Thanks for applying to <strong>{{company_name}}</strong>! We''ve received your application and will review it shortly.</p>
<p>We''ll be in touch with next steps. In the meantime, feel free to check out our brands at takeashot.de, drseverin.com, paigh.com, thiocyn.com, timber-john.com, and wristr.com.</p>
<p>Best regards,<br>The {{company_name}} Team</p>'
),
(
  'offer',
  'Welcome to the team — {{company_name}} 🎉',
  '<p>Hi {{full_name}},</p>
<p>We''re thrilled to offer you a position at <strong>{{company_name}}</strong>! Your application really stood out and we''d love to have you on board.</p>
<p><strong>Next steps:</strong> Please review and sign the documents we''ll share separately (Internship Agreement, Code of Conduct, Data Protection Policy).</p>
<p>We''re flexible on hours and happy to work around your schedule. If you have any questions, just reply to this email.</p>
<p>Welcome to the team!<br>The {{company_name}} Team</p>'
)
ON CONFLICT (slug) DO UPDATE SET
  subject = EXCLUDED.subject,
  body = EXCLUDED.body;
