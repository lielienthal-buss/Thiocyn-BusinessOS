export type ApplicationStatus = 'new' | 'review' | 'task_sent' | 'task_submitted' | 'interview' | 'accepted' | 'rejected';

export interface Application {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  timezone?: string;
  availability_hours_per_week?: number;
  availability_start_date?: string;
  availability_end_date?: string;
  project_interest?: string[];
  disc_d?: number;
  disc_i?: number;
  disc_s?: number;
  disc_c?: number;
  disc_primary?: string;
  disc_secondary?: string;
  motivation_text?: string;
  project_example_text?: string;
  requirements_handling_text?: string;
  remote_work_text?: string;
  status: ApplicationStatus;
  task_sent_at?: string;
  task_submitted_at?: string;
  interview_at?: string;
  decided_at?: string;
  notes?: ApplicationNote[];
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_email: string;
  note_text: string;
  created_at: string;
}

export interface RecruiterSettings {
  id: number;
  created_at: string;
  calendly_url?: string | null;
  company_name?: string | null;
  ai_instruction?: string | null;
}

export interface ApplicationFormData {
  full_name: string;
  email: string;
  timezone: string;
  availability_hours_per_week: number;
  availability_start_date: string;
  availability_end_date: string;
  project_interest: string[];
  disc_answers: Record<string, string>;
  motivation_text: string;
  project_example_text: string;
  requirements_handling_text: string;
  remote_work_text: string;
}