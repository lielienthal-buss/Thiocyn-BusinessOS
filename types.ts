export type ApplicationStage =
  | 'applied'
  | 'task_requested'
  | 'task_submitted'
  | 'interview'
  | 'hired'
  | 'onboarding'
  | 'active'       // actively interning
  | 'completed'    // internship done
  | 'rejected';

// Academy types
export type AcademyPhase = 'onboarding' | 'foundation' | 'specialisation' | 'ownership' | 'completed';
export type AcademyLevel = 1 | 2 | 3 | 4 | 5;
export type AcademyTrack = 'growth_marketing' | 'creative_brand' | 'ops_cs' | 'ai_automation' | 'finance_analytics';
export type MilestoneKey = 'rookie' | 'explorer' | 'contributor' | 'builder' | 'owner' | 'graduated';
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
export type DeliverableFormat = 'text' | 'presentation' | 'document' | 'url' | 'checkbox' | 'none';

export interface InternAccount {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  department: string;
  assigned_brand: string | null;
  budget_tokens_monthly: number;
  model: string;
  is_active: boolean;
  created_at: string;
  cohort: string | null;
  phase: AcademyPhase;
  level: AcademyLevel;
  track: AcademyTrack | null;
  start_date: string | null;
  buddy_user_id: string | null;
  admin_notes: string | null;
}

export interface InternGoal {
  id: string;
  intern_id: string;
  goal_text: string;
  category: 'skill' | 'portfolio' | 'career' | 'other' | null;
  status: 'active' | 'achieved' | 'dropped';
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface InternMilestone {
  id: string;
  intern_id: string;
  milestone_key: MilestoneKey;
  unlocked_at: string;
  unlocked_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface InternAssignment {
  id: string;
  intern_id: string;
  template_id: string | null;
  template_key: string | null;
  phase: AcademyPhase;
  week_number: number | null;
  title: string;
  description: string | null;
  deliverable_format: DeliverableFormat | null;
  status: AssignmentStatus;
  submitted_at: string | null;
  submission_text: string | null;
  submission_url: string | null;
  reviewed_at: string | null;
  review_score: number | null;
  review_feedback: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface WeeklyReview {
  id: string;
  intern_id: string;
  week_number: number;
  highlight: string | null;
  challenge: string | null;
  learning: string | null;
  next_goal: string | null;
  mood_score: number | null;
  admin_feedback: string | null;
  created_at: string;
}

export interface LearningLogEntry {
  id: string;
  intern_id: string;
  type: 'task' | 'learning' | 'resource' | 'achievement';
  title: string;
  body: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface FinalReview {
  id: string;
  intern_id: string;
  overall_rating: number | null;
  key_contributions: string | null;
  growth_areas: string | null;
  recommend_for_hire: boolean | null;
  admin_notes: string | null;
  ai_summary: string | null;
  certificate_issued_at: string | null;
  created_at: string;
}

export interface OnboardingChecklist {
  intern_id: string;
  items: Record<string, boolean>;
  updated_at: string;
}

export interface OnboardingTask {
  id: string;
  label: string;
  completed: boolean;
}

export interface ApplicationFormData {
  full_name: string;
  email: string;
  linkedin_url: string;
  project_highlight: string;
  psychometrics: { [key: string]: number };
  preferred_project_areas?: string[]; // New field for applicant preferences
  turnstileToken?: string | null; // Added for captcha verification
  // CV upload (Welle 1b Item 7) — storage path inside applicant-cvs bucket
  cv_url?: string | null;
  cv_filename?: string | null;
  // Optional: Stage ist technisch nicht im Formular, aber gut für Types
  stage?: ApplicationStage;
}

export interface Application extends ApplicationFormData {
  id: string;
  created_at: string;
  access_token: string;
  work_sample_text: string | null;
  application_notes: ApplicationNote[];
  preferred_project_areas: string[] | null;
  ai_analysis: string | null;
  aiScore: number | null;
  // Stage transition timestamps (Welle 1b Item 6 — for funnel + median-time analytics)
  task_sent_at?: string | null;
  task_submitted_at?: string | null;
  interview_at?: string | null;
  decided_at?: string | null;
  // CV upload (Welle 1b Item 7)
  cv_url?: string | null;
  cv_filename?: string | null;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  note_text: string;
  author_email?: string;
  created_at: string;
}

export interface LandingConfig {
  mode: 'influencer' | 'partner' | 'both';
  hero_tagline: string;
  hero_subtitle: string;
  cta_primary_text: string;
  cta_primary_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
  show_portfolio: boolean;
  show_approach: boolean;
  show_jobs_link: boolean;
  show_faq: boolean;
}

export interface RecruiterSettings {
  id: number;
  company_name: string;
  calendly_url: string | null;
  ai_instruction: string | null;
  landing_config: LandingConfig | null;
  // Welle 1b Item 5 — feature flags for gradual rollout (e.g. email_send blocked
  // until Resend Domain is verified)
  feature_flags?: Record<string, boolean> | null;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  subject: string;
  body: string;
  description: string;
}

export interface ProjectArea {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  position_type: string | null;
  is_active: boolean;
}
