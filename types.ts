
export type ApplicationStatus = 'applied' | 'completed' | 'reviewed' | 'interview' | 'hired' | 'rejected';

export interface BigFiveResults {
  o: number; // Openness
  c: number; // Conscientiousness
  e: number; // Extraversion
  a: number; // Agreeableness
  n: number; // Neuroticism
}

export interface Application {
  id: string;
  createdAt: string;
  email: string;
  fullName: string;
  linkedinUrl: string;
  status: ApplicationStatus;
  cvPath: string;
  taskPath: string;
  aiScore?: number;
  aiAnalysis?: string;
  personalityData?: Record<string, number>;
  notes?: ApplicationNote[];
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_email: string;
  note_text: string;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  slug: string;
  subject: string;
  body: string;
  description: string;
}

export interface ApplicationFormData {
  fullName: string;
  email: string;
  linkedinUrl: string;
  cv: File | null;
  miniTask: File | null;
  personalityData: Record<string, number>;
  consent: boolean;
}

export interface ApplicationData {
  fullName: string;
  email: string;
  linkedinUrl: string;
  coverLetter: string;
  resume: File | null;
}

export type RecruiterSettings = {
  id: number;
  created_at: string; // ISO timestamp
  calendly_url?: string | null;
  company_name?: string | null;
  ai_instruction?: string | null;
};
