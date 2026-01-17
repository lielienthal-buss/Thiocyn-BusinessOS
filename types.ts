// types.ts - V2 Update for Lean, Evidence-Based Hiring

// Represents the stage of an application in the V2 workflow.
export type ApplicationStage = 'applied' | 'task_requested' | 'task_submitted' | 'rejected';

/**
 * Represents the full application record as it exists in the Supabase database.
 * This is the primary data structure for the Admin Dashboard.
 */
export interface Application {
  id: string;
  created_at: string;
  
  // Stage 1 Data
  full_name: string;
  email: string;
  linkedin_url: string;
  project_highlight: string;
  psychometrics: { [key: string]: number }; // Stores Big Five scores, e.g., { openness: 80, ... }
  
  // V2 Workflow Management
  stage: ApplicationStage;
  access_token: string; // UUID for secure task link
  work_sample_text: string | null;

  // Optional legacy fields for reference
  notes?: ApplicationNote[];
  aiScore?: number;
}

/**
 * Represents the data structure submitted from the new V2 multi-step application form (Stage 1).
 */
export interface ApplicationFormData {
  // Step 1: Basics
  full_name: string;
  email: string;
  
  // Step 2: Experience
  linkedin_url: string;
  project_highlight: string;
  
  // Step 3: Personality
  psychometrics: { [key: string]: number };

  // Meta
  captcha_token: string | null;
}

// --- Other types (unchanged from V1) ---

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

export interface EmailTemplate {
  id: string;
  slug: string;
  description: string;
  subject: string;
  body: string;
  created_at?: string;
  updated_at?: string;
}
