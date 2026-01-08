// lib/actions.ts
import { supabase } from './supabaseClient';
import { Application, ApplicationFormData, RecruiterSettings } from '../types';

export async function submitApplication(formData: ApplicationFormData) {
  // This object is not used in the final insert, but was part of user's snippet.
  // It could be useful if you switch to a single jsonb column later.
  const formResponseData = {
    motivation_text: formData.motivation_text,
    cover_letter: formData.cover_letter,
    project_example_text: formData.project_example_text,
    requirements_handling_text: formData.requirements_handling_text,
    remote_work_text: formData.remote_work_text,
    project_interest: formData.project_interest,
    disc_answers: formData.disc_answers,
  };

  const { data, error } = await supabase
    .from('applications')
    .insert([
      {
        full_name: formData.full_name,
        email: formData.email,
        status: 'applied', // Standard-Status
        recruiter_id: formData.recruiter_id || null,
        available_from: formData.available_from || null,
        available_until: formData.available_until || null,
        availability_start_date: formData.availability_start_date || null,
        availability_end_date: formData.availability_end_date || null,
        availability_hours_per_week: formData.availability_hours_per_week || null,
        timezone: formData.timezone || null,
        captcha_verified: formData.captcha_verified || false,
        captcha_token: formData.captcha_token || null,
        disc_answers: formData.disc_answers,
        motivation_text: formData.motivation_text,
        project_example_text: formData.project_example_text,
        requirements_handling_text: formData.requirements_handling_text,
        remote_work_text: formData.remote_work_text,
        cover_letter: formData.cover_letter,
        project_interest: formData.project_interest,
      },
    ]);

  if (error) {
    console.error('Submit application error:', error.message, error.details || '');
    return { success: false, error };
  }

  return { success: true, data };
}

/**
 * Fetches the recruiter settings.
 * Assumes a single row with id = 1.
 */
export async function getSettings(): Promise<RecruiterSettings | null> {
  const { data, error } = await supabase
    .from('recruiter_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }

  return data;
}

/**
 * Updates the recruiter settings.
 * @param changes A partial object of the settings to update.
 */
export async function updateSettings(changes: Partial<RecruiterSettings>): Promise<boolean> {
  const { error } = await supabase
    .from('recruiter_settings')
    .update(changes)
    .eq('id', 1);

  if (error) {
    console.error('Error updating settings:', error);
    return false;
  }

  return true;
}

/**
 * Fetches all email templates.
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*');

  if (error) {
    console.error('Error fetching email templates:', error);
    return [];
  }

  return data || [];
}

/**
 * Updates an email template.
 * @param id The ID of the email template to update.
 * @param changes A partial object of the email template to update.
 */
export async function updateEmailTemplate(id: string, changes: Partial<EmailTemplate>): Promise<boolean> {
  const { error } = await supabase
    .from('email_templates')
    .update(changes)
    .eq('id', id);

  if (error) {
    console.error(`Error updating email template ${id}:`, error);
    return false;
  }

  return true;
}

/**
 * Fetches a paginated list of applications.
 */
export async function getApplications(page: number, pageSize: number): Promise<{ data: Application[], count: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
        .from('applications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching applications:', error);
        return { data: [], count: 0 };
    }

    return { data: data || [], count: count || 0 };
}

/**
 * Fetches all applications (non-paginated).
 * Useful for insights/KPIs where all data is needed.
 */
export async function getAllApplications(): Promise<Application[]> {
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

/**
 * Fetches a single application by its ID, including associated notes.
 */
export async function getApplicant(id: string): Promise<Application | null> {
    const { data, error } = await supabase
        .from('applications')
        .select('*, application_notes(*)') // Select application and all related notes
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching applicant ${id}:`, error);
        return null;
    }

    return data;
}

/**
 * Updates the status and optionally other timestamp fields of a specific application.
 */
export async function updateApplicationStatus(id: string, status: string, otherUpdates: Record<string, any> = {}): Promise<boolean> {
    const { error } = await supabase
        .from('applications')
        .update({ status, ...otherUpdates })
        .eq('id', id);

    if (error) {
        console.error(`Error updating status for applicant ${id}:`, error);
        return false;
    }

    return true;
}

/**
 * Adds a note to an application.
 */
export async function addApplicationNote(application_id: string, note_text: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.error('Cannot add note: user not authenticated.');
        return false;
    }

    const { error } = await supabase
        .from('application_notes')
        .insert({
            application_id,
            note_text,
            author_email: user.email,
        });

    if (error) {
        console.error(`Error adding note for applicant ${application_id}:`, error);
        return false;
    }

    return true;
}