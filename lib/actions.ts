
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "./supabaseClient";
import type { ApplicationFormData, ApplicationStatus, Application, ApplicationNote, EmailTemplate, RecruiterSettings } from "../types";

/**
 * Server Actions for the Hiring Tool.
 */

export async function submitApplicationAction(data: ApplicationFormData): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    if (!data.consent) throw new Error("GDPR consent is mandatory.");
    if (!data.cv || !data.miniTask) throw new Error("CV and Mini-Task files are required.");

    const cvPath = `cvs/${Date.now()}-${data.cv.name}`;
    const taskPath = `tasks/${Date.now()}-${data.miniTask.name}`;

    const { data: app, error: insertError } = await supabase
      .from('applications')
      .insert({
        full_name: data.fullName,
        email: data.email,
        linkedin_url: data.linkedinUrl,
        status: 'applied',
        cv_path: cvPath,
        task_path: taskPath,
        personality_data: data.personalityData
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Trigger AI Scoring
    const apiKey = (process.env as any).API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Act as an expert recruiter. Analyze the following candidate personality data: ${JSON.stringify(data.personalityData)}. 
      Based on the Big Five traits, provide a hiring score (0.0 to 1.0) and a 2-sentence summary regarding their fit for a high-performance startup environment.`;

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-pro-preview",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                score: { type: Type.NUMBER, description: "Match score between 0 and 1" },
                summary: { type: Type.STRING, description: "Concise hiring summary" }
              },
              required: ["score", "summary"]
            }
          }
        });

        // Clean potentially returned markdown wrappers
        const cleanedText = response.text?.replace(/```json|```/g, '').trim() || "{}";
        const aiResult = JSON.parse(cleanedText);

        await supabase
          .from('applications')
          .update({
            ai_score: aiResult.score,
            ai_analysis: aiResult.summary
          })
          .eq('id', app.id);
      } catch (aiErr) {
        console.error("AI Analysis failed but application was saved:", aiErr);
      }
    }

    return { success: true, id: app.id };
  } catch (err: any) {
    console.error("Submission error:", err.message || err);
    return { success: false, error: err.message };
  }
}

export async function updateApplicationStatus(id: string, newStatus: ApplicationStatus): Promise<boolean> {
  const { error } = await supabase
    .from('applications')
    .update({ status: newStatus })
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
        application_notes (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // Improved error logging to prevent [object Object]
      console.error("Fetch applications error:", error.message, error.details || "");
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      createdAt: item.created_at,
      email: item.email,
      fullName: item.full_name,
      linkedinUrl: item.linkedin_url,
      status: item.status,
      cvPath: item.cv_path,
      taskPath: item.task_path,
      aiScore: item.ai_score,
      aiAnalysis: item.ai_analysis,
      personalityData: item.personality_data,
      notes: item.application_notes || []
    }));
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

/**
 * Email Template Actions
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('slug', { ascending: true });

  if (error) {
    console.error("Fetch email templates error:", error.message || error);
    return [];
  }
  return data;
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<boolean> {
  const { error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error("Update email template error:", error.message || error);
    return false;
  }
  return true;
}

/**
 * Seeding Logic for Testing
 */
export async function seedMockData(): Promise<boolean> {
  const mockCandidates = [
    {
      full_name: "Sarah Miller",
      email: "sarah.m@tech.io",
      linkedin_url: "https://linkedin.com/in/sarahmiller",
      status: "hired",
      ai_score: 0.94,
      ai_analysis: "Exceptional conscientiousness and problem-solving skills demonstrated in the task. Perfect culture fit for the engineering team.",
      personality_data: { q1: 5, q2: 5, q3: 4, q4: 4, q5: 1 }
    },
    {
      full_name: "Marcus Aurelius",
      email: "stoic.dev@gmail.com",
      linkedin_url: "https://linkedin.com/in/maurelius",
      status: "interview",
      ai_score: 0.88,
      ai_analysis: "High emotional stability and strategic thinking. Task performance was solid, showing great attention to edge cases.",
      personality_data: { q1: 4, q2: 5, q3: 2, q4: 3, q5: 1 }
    }
  ];

  const mockTemplates = [
    {
      slug: "application_received",
      description: "Sent immediately after successful portal submission",
      subject: "We received your application, {{full_name}}!",
      body: "Hello {{full_name}},

Thank you for applying to Take A Shot GmbH. We've received your documents and will review them shortly.

Best,
The Recruiting Team"
    },
    {
      slug: "status_update",
      description: "Triggered when application moves in the pipeline",
      subject: "Update on your application",
      body: "Hi {{full_name}},

Your application status has been updated to: {{status}}.

We will get in touch soon for the next steps."
    }
  ];

  try {
    const { error: appError } = await supabase.from('applications').insert(
      mockCandidates.map(c => ({
        ...c,
        cv_path: "cvs/mock-cv.pdf",
        task_path: "tasks/mock-task.pdf"
      }))
    );
    if (appError) throw appError;

    const { error: tempError } = await supabase.from('email_templates').insert(mockTemplates);
    if (tempError) throw tempError;

    return true;
  } catch (err: any) {
    console.error("Seeding failed:", err.message || err);
    return false;
  }
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
  const { error } = await supabase
    .from('applications')
    .update({ email_sent: true, sent_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) {
    console.error('Error marking email as sent:', error);
    return false;
  }
  return true;
}
