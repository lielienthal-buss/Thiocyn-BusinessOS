import { supabase } from "./supabaseClient";
import type { ApplicationFormData, ApplicationStatus, Application, ApplicationNote, RecruiterSettings } from "../types";

/**
 * Server Actions for the Hiring Tool.
 */

export async function submitApplicationAction(data: ApplicationFormData): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Prepare data for Supabase
    const applicationData = {
      full_name: data.full_name,
      email: data.email,
      timezone: data.timezone,
      availability_hours_per_week: data.availability_hours_per_week,
      availability_start_date: data.availability_start_date,
      availability_end_date: data.availability_end_date,
      project_interest: data.project_interest,
      disc_q1: data.disc_q1,
      disc_q2: data.disc_q2,
      disc_q3: data.disc_q3,
      disc_q4: data.disc_q4,
      disc_q5: data.disc_q5,
      disc_q6: data.disc_q6,
      disc_q7: data.disc_q7,
      disc_q8: data.disc_q8,
      disc_q9: data.disc_q9,
      disc_q10: data.disc_q10,
      motivation_text: data.motivation_text,
      project_example_text: data.project_example_text,
      requirements_handling_text: data.requirements_handling_text,
      remote_work_text: data.remote_work_text,
      status: 'new'
    };

    // Insert into Supabase
    const { data: app, error: insertError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (insertError) throw insertError;

    return { success: true, id: app.id };
  } catch (err: any) {
    console.error("Submission error:", err.message || err);
    return { success: false, error: err.message };
  }
}

export async function updateApplicationStatus(id: string, newStatus: ApplicationStatus, timestamps: Partial<Record<string, string>> = {}): Promise<boolean> {
  const { error } = await supabase
    .from('applications')
    .update({ status: newStatus, ...timestamps })
    .eq('id', id);
  
  if (error) {
    console.error("Status update failed:", error.message || error);
    return false;
  }
  return true;
}

export async function getApplications(): Promise<Application[]> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        notes:application_notes (*),
        disc_count_d,
        disc_count_i,
        disc_count_s,
        disc_count_c
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch applications error:", error.message, error.details || "");
      return [];
    }
    return data.map(app => ({
      ...app,
      project_interest: Array.isArray(app.project_interest) ? app.project_interest : [],
    })) || [];
  } catch (err: any) {
    console.error("Fetch applications exception:", err.message || err);
    return [];
  }
}

export async function addApplicationNote(applicationId: string, text: string): Promise<ApplicationNote | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('application_notes')
    .insert({
      application_id: applicationId,
      note_text: text,
      author_email: session.user.email
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to add note:", error.message || error);
    return null;
  }
  return data;
}

export async function getSettings(): Promise<RecruiterSettings | null> {
  const { data, error } = await supabase
    .from('recruiter_settings')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
  return data;
}

export async function updateSettings(settings: Partial<RecruiterSettings>): Promise<boolean> {
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

export async function markEmailAsSentAction(applicationId: string): Promise<boolean> {
  // This is a placeholder as per the prompt. In a real app, this might not be needed if mailto is the only comms.
  console.log(`Marking email as sent for ${applicationId}`);
  return Promise.resolve(true);
}