import { supabase } from './supabaseClient';
import type {
  ApplicationFormData,
  ApplicationStage,
  RecruiterSettings,
  EmailTemplate,
  Application,
  ProjectArea,
} from '@/types';

// --- APPLICANT ACTIONS (Public) ---

export async function submitApplicationAction(formData: ApplicationFormData) {
  try {

    // Wir rufen jetzt die sichere SQL-Funktion auf
    const { data, error } = await supabase.rpc('submit_application', {
      p_full_name: formData.full_name,
      p_email: formData.email,
      p_linkedin_url: formData.linkedin_url,
      p_project_highlight: formData.project_highlight,
      p_psychometrics: formData.psychometrics,
      p_preferred_project_areas: formData.preferred_project_areas || [], // Pass new field
      p_stage: 'applied',
      p_captcha_token: formData.turnstileToken, // Pass Turnstile token
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
    console.error(`Error fetching applicant ${id}:`, error.message); // More detailed error
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

  // Welle 1b Item 12: capture human verdict for AI-vs-Human comparison
  // Per docs/foundation/05-ai-strategy.md §2.3 — Phase-2-activation needs ≥70%
  // match-rate over 20 cases. Silent best-effort, never breaks the user flow.
  void captureVerdictMatch(id, stage);

  return data;
}

/**
 * Welle 1b Item 12 — Verdict-Match Hook
 *
 * Captures the human decision on a stage transition and snapshots the AI
 * verdict (if any) for later behavioral comparison. Append-only.
 *
 * Stage → human_verdict mapping:
 *   - hired           → STRONG_YES
 *   - task_requested  → YES        (recruiter advanced past initial screen)
 *   - rejected        → NO
 *   - other stages    → no row written (no clear human verdict yet)
 *
 * AI verdict is parsed from applications.ai_analysis if present, else NULL.
 *
 * Failure mode: silent. Logged via console.error so dev tools can pick it up.
 */
async function captureVerdictMatch(applicationId: string, newStage: ApplicationStage) {
  const stageToVerdict: Partial<Record<ApplicationStage, string>> = {
    hired: 'STRONG_YES',
    task_requested: 'YES',
    rejected: 'NO',
  };
  const humanVerdict = stageToVerdict[newStage];
  if (!humanVerdict) return;

  try {
    const [{ data: app }, { data: session }] = await Promise.all([
      supabase
        .from('applications')
        .select('aiScore, ai_analysis')
        .eq('id', applicationId)
        .maybeSingle(),
      supabase.auth.getSession(),
    ]);

    // Try to extract verdict from ai_analysis text (loose match — analyze-applicant
    // returns "STRONG YES" / "YES" / "MAYBE" / "NO" near the start of the response).
    let aiVerdict: string | null = null;
    const analysis = (app?.ai_analysis ?? '') as string;
    const match = analysis.match(/\b(STRONG[ _]?YES|YES|MAYBE|NO)\b/i);
    if (match) {
      aiVerdict = match[1].toUpperCase().replace(/\s+/, '_');
    }

    const { error } = await supabase.from('analyze_applicant_verdict_match').insert({
      application_id: applicationId,
      ai_score: app?.aiScore ?? null,
      ai_verdict: aiVerdict,
      ai_reasoning: analysis || null,
      human_verdict: humanVerdict,
      human_decided_by: session?.session?.user?.email ?? null,
      notes: `auto:stage_transition:${newStage}`,
    });

    if (error) {
      console.error('[verdict-match] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[verdict-match] threw:', err);
  }
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

// --- PROJECT AREA ACTIONS (Protected - Admin Only) ---

export async function getProjectAreas(): Promise<ProjectArea[]> {
  const { data, error } = await supabase.from('project_areas').select('*').order('name', { ascending: true });
  if (error) {
    console.error('Error fetching project areas:', error);
    return [];
  }
  return data || [];
}

export async function addProjectArea(name: string, description: string, position_type = 'internship', is_active = true): Promise<ProjectArea | null> {
  const { data, error } = await supabase
    .from('project_areas')
    .insert([{ name, description, position_type, is_active }])
    .select();

  if (error) {
    console.error('Error adding project area:', error);
    return null;
  }
  if (!data || data.length === 0) {
    console.warn('No project area added — likely due to RLS restrictions.');
    return null;
  }
  return data[0];
}

export async function updateProjectArea(id: string, name: string, description: string, position_type = 'internship', is_active = true): Promise<ProjectArea | null> {
  const { data, error } = await supabase
    .from('project_areas')
    .update({ name, description, position_type, is_active })
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating project area:', error);
    return null;
  }
  if (!data || data.length === 0) {
    console.warn('No project area updated — likely due to RLS restrictions or item not found.');
    return null;
  }
  return data[0];
}

// ─── Hiring Tasks ─────────────────────────────────────────────────────────────

export interface HiringTask {
  id: string;
  title: string;
  description: string | null;
  instructions: string;
  is_active: boolean;
  created_at: string;
}

export async function getHiringTasks(): Promise<HiringTask[]> {
  const { data } = await supabase.from('hiring_tasks').select('*').order('created_at', { ascending: false });
  return (data as HiringTask[]) ?? [];
}

export async function getActiveHiringTask(): Promise<HiringTask | null> {
  const { data } = await supabase.from('hiring_tasks').select('*').eq('is_active', true).maybeSingle();
  return (data as HiringTask) ?? null;
}

export async function createHiringTask(title: string, description: string, instructions: string): Promise<HiringTask | null> {
  const { data, error } = await supabase.from('hiring_tasks').insert({ title, description, instructions, is_active: false }).select().single();
  if (error) { console.error(error); return null; }
  return data as HiringTask;
}

export async function updateHiringTask(id: string, title: string, description: string, instructions: string): Promise<boolean> {
  const { error } = await supabase.from('hiring_tasks').update({ title, description, instructions, updated_at: new Date().toISOString() }).eq('id', id);
  return !error;
}

export async function activateHiringTask(id: string): Promise<boolean> {
  // Deactivate all, then activate the selected one
  await supabase.from('hiring_tasks').update({ is_active: false }).neq('id', id);
  const { error } = await supabase.from('hiring_tasks').update({ is_active: true }).eq('id', id);
  return !error;
}

export async function deleteHiringTask(id: string): Promise<boolean> {
  const { error } = await supabase.from('hiring_tasks').delete().eq('id', id);
  return !error;
}

export async function deleteProjectArea(id: string): Promise<boolean> {
  const { error, count } = await supabase.from('project_areas').delete().eq('id', id);
  if (error) {
    console.error('Error deleting project area:', error);
    return false;
  }
  if (count === 0) {
    console.warn('No project area deleted — likely due to RLS restrictions or item not found.');
    return false;
  }
  return true;
}
