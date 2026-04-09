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
export interface WeeklyReview {
  id: string;
  application_id: string;
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
  application_id: string;
  type: 'task' | 'learning' | 'resource' | 'achievement';
  title: string;
  body: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface FinalReview {
  id: string;
  application_id: string;
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
  application_id: string;
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
