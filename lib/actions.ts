
import { supabase } from "./supabaseClient";
import type { ApplicationFormData, ApplicationStatus, Application, ApplicationNote, RecruiterSettings } from "../types";

/**
 * Server Actions for the Hiring Tool.
 */

export async function submitApplicationAction(data: ApplicationFormData): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // 1. Calculate DISC scores
    const discMapping: { [key: string]: 'D' | 'I' | 'S' | 'C' } = { 'A': 'D', 'B': 'I', 'C': 'S', 'D': 'C' };
    const discCounts = { D: 0, I: 0, S: 0, C: 0 };
    Object.values(data.disc_answers).forEach(answer => {
      const trait = discMapping[answer];
      if (trait) {
        discCounts[trait]++;
      }
    });

    const sortedDisc = Object.entries(discCounts).sort(([, a], [, b]) => b - a);
    const disc_primary = sortedDisc[0][0];
    const disc_secondary = sortedDisc[1][0];

    // 2. Prepare data for Supabase
    const applicationData = {
      ...data,
      disc_d: discCounts.D,
      disc_i: discCounts.I,
      disc_s: discCounts.S,
      disc_c: discCounts.C,
      disc_primary,
      disc_secondary,
      status: 'new'
    };
    delete (applicationData as any).disc_answers; // Don't store raw answers

    // 3. Insert into Supabase
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
      .select(`*, notes:application_notes (*)`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch applications error:", error.message, error.details || "");
      return [];
    }
    return data || [];
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
