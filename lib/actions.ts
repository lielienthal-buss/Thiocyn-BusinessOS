import { supabase } from './supabaseClient';
import type {
  ApplicationFormData,
  RecruiterSettings,
  EmailTemplate,
  Application,
} from '../types';

// --- APPLICANT ACTIONS (Public) ---

export async function submitApplicationAction(formData: ApplicationFormData) {
  try {
    console.log('Submitting via RPC...');

    // Wir rufen jetzt die sichere SQL-Funktion auf
    const { data, error } = await supabase.rpc('submit_application', {
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_linkedin_url: formData.linkedin_url,
      p_project_highlight: formData.project_highlight,
      p_psychometrics: formData.psychometrics,
      p_stage: 'applied',
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: unknown) {
    console.error('Submit Error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'An unknown error occurred' };
  }
}

// --- ADMIN ACTIONS (Protected) ---
// (Hier kopieren wir den Rest von vorhin rein, damit nichts fehlt)

export async function getSettings(): Promise<RecruiterSettings | null> {
  const { data, error } = await supabase
    .from('recruiter_settings')
    .select('*')
    .single();
  if (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
  return data;
}

export async function updateSettings(settings: Partial<RecruiterSettings>) {
  const { error } = await supabase
    .from('recruiter_settings')
    .update(settings)
    .eq('id', 1);
  if (error) {
    console.error('Error updating settings:', error);
    return false;
  }
  return true;
}

export async function getApplications(
  page: number,
  pageSize: number,
  filterStage: string = 'all',
  search: string = ''
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase.from('applications').select('*', { count: 'exact' });
  if (filterStage !== 'all') query = query.eq('stage', filterStage);
  if (search)
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) {
    console.error('Error fetching applications:', error);
    return { data: [], count: 0 };
  }
  return { data: data || [], count: count || 0 };
}

export async function getAllApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching all applications:', error);
    return [];
  }
  return data || [];
}

export async function getApplicant(id: string): Promise<Application | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, application_notes(*)')
    .eq('id', id)
    .single();
  if (error) {
    console.error(`Error fetching applicant ${id}:`, error);
    return null;
  }
  return data;
}

export async function deleteApplication(id: string) {
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) {
    console.error('Error deleting application:', error);
    return false;
  }
  return true;
}

export async function getEmailTemplates() {
  const { data, error } = await supabase.from('email_templates').select('*');
  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  return data || [];
}

export async function updateEmailTemplate(
  id: string,
  updates: Partial<EmailTemplate>
) {
  const { error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id);
  if (error) {
    console.error('Error updating template:', error);
    return false;
  }
  return true;
}

/**
 * Updates the stage of a specific application.
 * Used for the Kanban board click-to-update functionality.
 */
export async function updateApplicationStage(
  id: string,
  stage: ApplicationStage
) {
  const { data, error } = await supabase
    .from('applications')
    .update({ stage: stage })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating application stage:', error);
    return null;
  }
  return data;
}

/**
 * Adds a new note to a specific application.
 * It automatically captures the logged-in user's email as the author.
 */
export async function addNoteForApplication(
  applicationId: string,
  noteText: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    console.error('No user or user email found to add a note.');
    return null;
  }

  const { data, error } = await supabase
    .from('application_notes')
    .insert([
      {
        application_id: applicationId,
        note_text: noteText,
        author_email: user.email, // Using author_email as specified
      },
    ])
    .select();

  if (error) {
    console.error('Error adding note:', error);
    return null;
  }
  return data;
}
