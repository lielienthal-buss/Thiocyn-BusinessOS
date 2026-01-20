export type ApplicationStage =
  | 'applied'
  | 'task_requested'
  | 'task_submitted'
  | 'rejected';

export interface ApplicationFormData {
  full_name: string;
  email: string;
  linkedin_url: string;
  project_highlight: string;
  psychometrics: { [key: string]: number };
  // Optional: Stage ist technisch nicht im Formular, aber gut für Types
  stage?: ApplicationStage;
}

export interface Application extends ApplicationFormData {
  id: string;
  created_at: string;
  access_token: string;
  work_sample_text: string | null;
  // Legacy support, falls Code darauf zugreift
  notes?: ApplicationNote[];
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  note_text: string;
  author_email?: string;
  created_at: string;
}

export interface RecruiterSettings {
  id: number;
  company_name: string;
  calendly_url: string | null;
  ai_instruction: string | null;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  subject: string;
  body: string;
  description: string;
}
