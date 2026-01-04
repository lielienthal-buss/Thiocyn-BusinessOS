
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
  disc_q1?: string;
  disc_q2?: string;
  disc_q3?: string;
  disc_q4?: string;
  disc_q5?: string;
  disc_q6?: string;
  disc_q7?: string;
  disc_q8?: string;
  disc_q9?: string;
  disc_q10?: string;
  disc_count_d?: number;
  disc_count_i?: number;
  disc_count_s?: number;
  disc_count_c?: number;
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
  disc_q1: string;
  disc_q2: string;
  disc_q3: string;
  disc_q4: string;
  disc_q5: string;
  disc_q6: string;
  disc_q7: string;
  disc_q8: string;
  disc_q9: string;
  disc_q10: string;
  motivation_text: string;
  project_example_text: string;
  requirements_handling_text: string;
  remote_work_text: string;
  captcha_token?: string; // Add captcha_token here
}
