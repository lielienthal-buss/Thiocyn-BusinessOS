import React, { useState, useEffect } from 'react';
import { Application, ApplicationNote } from '@/types';
import Card from '@/components/ui/Card';
import BigFiveVisualizer from './BigFiveVisualizer';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { addNoteForApplication, updateApplicationStage, getSettings } from '@/lib/actions';
import { trackOperationalMetric } from '@/lib/track-event';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// --- Notes Component ---
const NotesSection: React.FC<{
  notes: ApplicationNote[];
  applicationId: string;
  onNoteAdded: (newNote: ApplicationNote) => void;
}> = ({ notes, applicationId, onNoteAdded }) => {
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    const result = await addNoteForApplication(applicationId, newNote);
    if (result && result[0]) {
      onNoteAdded(result[0]);
      setNewNote('');
    } else {
      toast.error('Failed to add note.');
    }
    setIsSaving(false);
  };

  return (
    <Card title="Internal Notes">
      <div className="space-y-4">
        {/* Add Note Form */}
        <div className="space-y-2">
          <textarea
            rows={3}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a new note..."
            className="w-full p-2 text-sm bg-white/[0.04] rounded-md border border-white/[0.10] text-slate-100"
          />
          <button
            onClick={handleAddNote}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg flex items-center"
          >
            {isSaving && <Spinner className="w-4 h-4 mr-2" />}
            Add Note
          </button>
        </div>
        {/* Notes List */}
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {notes && notes.length > 0 ? (
            notes
              .sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )
              .map((note) => (
                <div
                  key={note.id}
                  className="bg-surface-900/60 p-3 rounded-lg"
                >
                  <p className="text-sm text-slate-100">
                    {note.note_text}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    <span className="font-bold">{note.author_email}</span> &middot;{' '}
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-sm text-slate-500">No notes yet.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

// --- Welle 1b Item 7 — CV Download (signed URL) ---
const CvDownload: React.FC<{ path: string; filename?: string | null }> = ({ path, filename }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUrl = async () => {
      setLoading(true);
      const { data, error: signError } = await supabase.storage
        .from('applicant-cvs')
        .createSignedUrl(path, 3600); // 1 hour
      if (cancelled) return;
      if (signError || !data) {
        setError(signError?.message ?? 'Could not generate download link');
      } else {
        setSignedUrl(data.signedUrl);
      }
      setLoading(false);
    };
    void fetchUrl();
    return () => { cancelled = true; };
  }, [path]);

  if (loading) return <Spinner className="w-4 h-4" />;
  if (error) return <p className="text-xs text-red-400">{error}</p>;
  if (!signedUrl) return null;

  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={filename ?? undefined}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors"
    >
      📄 {filename ?? 'Download CV'}
    </a>
  );
};

// --- Helper: Status Badge ---
const StatusBadge: React.FC<{ stage: string | null }> = ({ stage }) => {
  const stageStyles: { [key: string]: string } = {
    applied: 'bg-blue-500/15 text-blue-400',
    task_requested: 'bg-yellow-500/15 text-yellow-400',
    task_submitted: 'bg-emerald-500/15 text-emerald-400',
    rejected: 'bg-red-500/15 text-red-400',
    hired: 'bg-violet-500/15 text-violet-400',
    onboarding: 'bg-teal-500/15 text-teal-400',
  };

  const style = stage ? stageStyles[stage] || 'bg-slate-500/15 text-slate-400' : 'bg-slate-500/15 text-slate-400';
  const text = stage ? stage.replace('_', ' ').toUpperCase() : 'UNKNOWN';

  return (
    <span className={`px-3 py-1 text-xs font-black rounded-full ${style}`}>
      {text}
    </span>
  );
};


// --- Main Component ---

interface Props {
  application: Application | null;
  onReturn: () => void;
}

const ApplicantDetailView: React.FC<Props> = ({ application: initialApplication, onReturn }) => {
  const [application, setApplication] = useState(initialApplication);

  useEffect(() => {
    setApplication(initialApplication);
  }, [initialApplication]);

  const handleNoteAdded = (newNote: ApplicationNote) => {
    setApplication((prevApp) => {
      if (!prevApp) return null;
      const updatedNotes = [...(prevApp.application_notes || []), newNote];
      return { ...prevApp, application_notes: updatedNotes };
    });
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailLang, setEmailLang] = useState<'de' | 'en'>('de');
  // Welle 1b Item 5 — Coming-Soon flag. Defaults to disabled (Resend Domain blocker).
  // Re-enabled by toggling recruiter_settings.feature_flags.email_send to true.
  const [emailSendEnabled, setEmailSendEnabled] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const loadFlags = async () => {
      const settings = await getSettings();
      if (cancelled) return;
      setEmailSendEnabled(settings?.feature_flags?.email_send === true);
    };
    void loadFlags();
    return () => { cancelled = true; };
  }, []);
  const [isHiring, setIsHiring] = useState(false);
  const [hireModal, setHireModal] = useState(false);
  const [hireDepartment, setHireDepartment] = useState('marketing');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(application?.ai_analysis || null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleSendEmail = (templateSlug: string) => {
    if (!application) return;
    // Welle 1b Item 5 — operational metric per click (regardless of flag state).
    void trackOperationalMetric('send_email_button_clicked', 'hiring', {
      itemRef: 'welle_1b_item_5',
      notes: `template:${templateSlug}:lang:${emailLang}:enabled:${emailSendEnabled}`,
    });
    if (!emailSendEnabled) {
      toast.error('Email-Versand ist aktuell deaktiviert (Resend Domain noch nicht verifiziert).');
      return;
    }
    const labels: Record<string, string> = {
      task_invite: 'Send Task Email',
      interview_invite: 'Send Interview Invite',
      rejection: 'Send Rejection',
    };
    setConfirmModal({
      isOpen: true,
      title: 'Send Email',
      message: `Send "${labels[templateSlug] || templateSlug}" to ${application.full_name}?`,
      onConfirm: async () => {
        setIsSendingEmail(true);
        try {
          const { error } = await supabase.functions.invoke('send-email', {
            body: { application_id: application.id, template_slug: templateSlug, lang: emailLang },
          });
          if (error) throw error;
          const stageMap: Record<string, string> = {
            task_invite: 'task_requested',
            interview_invite: 'interview',
            rejection: 'rejected',
          };
          if (stageMap[templateSlug]) {
            setApplication((prev) => prev ? { ...prev, stage: stageMap[templateSlug] as any } : null);
          }
          toast.success('Email sent successfully!');
        } catch (err: any) {
          toast.error(`Failed to send email: ${err.message}`);
        }
        setIsSendingEmail(false);
      },
    });
  };

  const handleAnalyzeWithAI = async () => {
    if (!application) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-applicant', {
        body: { application_id: application.id },
      });
      if (error) throw error;
      setAiAnalysis(data.analysis);
      setApplication((prev) => prev ? { ...prev, aiScore: data.aiScore, ai_analysis: data.analysis } : null);
    } catch (err: any) {
      toast.error(`AI analysis failed: ${err.message}`);
    }
    setIsAnalyzing(false);
  };

  const handleHire = async () => {
    if (!application) return;
    setIsHiring(true);
    setHireModal(false);
    try {
      const { data, error } = await supabase.functions.invoke('hire-candidate', {
        body: { application_id: application.id, department: hireDepartment },
      });
      if (error) throw error;
      const internId = data?.intern_id;
      setApplication((prev) => prev ? { ...prev, stage: 'onboarding' as any } : null);
      toast.success(`${application.full_name} wurde aufgenommen. Account erstellt.`);
      // Ask for confirmation before sending the magic link
      setConfirmModal({
        isOpen: true,
        title: 'Magic Link senden?',
        message: `Einladungs-Email mit Magic Link jetzt an ${application.email} senden?`,
        onConfirm: async () => {
          try {
            const { error: inviteErr } = await supabase.functions.invoke('send-intern-invite', {
              body: { intern_id: internId },
            });
            if (inviteErr) throw inviteErr;
            toast.success('Magic Link gesendet.');
          } catch (err: any) {
            toast.error(`Email-Versand fehlgeschlagen: ${err.message}`);
          }
        },
      });
    } catch (err: any) {
      toast.error(`Hire fehlgeschlagen: ${err.message}`);
    }
    setIsHiring(false);
  };

  const handleCopyTaskLink = async () => {
    if (!application) return;
    const taskUrl = `${window.location.origin}/task/${application.access_token}`;
    await navigator.clipboard.writeText(taskUrl);
    await updateApplicationStage(application.id, 'task_requested');
    setApplication((prev) => prev ? { ...prev, stage: 'task_requested' } : null);
    toast.success('Task link copied to clipboard!');
  };

  if (!application) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Select an applicant to see details
      </div>
    );
  }

  return (
    <>
    {confirmModal && (
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
        onCancel={() => setConfirmModal(null)}
      />
    )}
    {hireModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-surface-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
          <h3 className="text-lg font-black text-white">Hire {application?.full_name}?</h3>
          <p className="text-sm text-slate-400">Wähle das Department. Der Kandidat erhält eine E-Mail mit Magic Link.</p>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Department</label>
            <select
              value={hireDepartment}
              onChange={(e) => setHireDepartment(e.target.value)}
              className="w-full px-3 py-2.5 bg-white/[0.06] border border-white/10 rounded-lg text-white text-sm"
            >
              <option value="marketing">Marketing</option>
              <option value="support">Customer Support</option>
              <option value="dev">Dev / Data Engineering</option>
              <option value="ops">Operations</option>
              <option value="finance">Finance</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleHire}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Hire & Send Email
            </button>
            <button
              onClick={() => setHireModal(false)}
              className="flex-1 py-2.5 bg-white/[0.06] text-slate-300 text-sm font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {application.full_name}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Welle 1b Item 5 — Coming-Soon pill while Resend Domain is unverified */}
          {!emailSendEnabled && (
            <span
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30"
              title="Resend Domain verification pending — emails are queued but not sent"
            >
              🔒 Email Coming Soon
            </span>
          )}
          {/* Language toggle for outgoing emails */}
          <div className="flex items-center gap-0.5 bg-surface-800 border border-white/[0.08] rounded-lg p-0.5">
            <button onClick={() => setEmailLang('de')} className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${emailLang === 'de' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}>DE</button>
            <button onClick={() => setEmailLang('en')} className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${emailLang === 'en' ? 'bg-amber-500 text-black' : 'text-slate-500 hover:text-slate-300'}`}>EN</button>
          </div>
          {(application.stage === 'applied' || application.stage === 'task_requested') && (
            <>
              <button
                onClick={handleCopyTaskLink}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                📋 Copy Task Link
              </button>
              <button
                onClick={() => handleSendEmail('task_invite')}
                disabled={isSendingEmail}
                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSendingEmail && <Spinner className="w-3 h-3" />}
                {application.stage === 'task_requested' ? '🔄 Resend Task Email' : '✉️ Send Task Email'}
              </button>
            </>
          )}
          {application.stage === 'task_submitted' && (
            <>
              <button
                onClick={() => handleSendEmail('interview_invite')}
                disabled={isSendingEmail}
                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSendingEmail && <Spinner className="w-3 h-3" />}
                📅 Send Interview Invite
              </button>
              <button
                onClick={() => handleSendEmail('rejection')}
                disabled={isSendingEmail}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSendingEmail && <Spinner className="w-3 h-3" />}
                ❌ Reject
              </button>
            </>
          )}
          {application.stage === 'interview' && (
            <>
              <button
                onClick={() => setHireModal(true)}
                disabled={isHiring}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isHiring && <Spinner className="w-3 h-3" />}
                ✅ Hire
              </button>
              <button
                onClick={() => handleSendEmail('rejection')}
                disabled={isSendingEmail}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSendingEmail && <Spinner className="w-3 h-3" />}
                ❌ Reject
              </button>
            </>
          )}
          {application.stage === 'onboarding' && (
            <button
              onClick={() => setConfirmModal({
                isOpen: true,
                title: 'Magic Link senden?',
                message: `Einladungs-Email mit Magic Link an ${application.email} senden?`,
                onConfirm: async () => {
                  const internResult = await supabase
                    .from('intern_accounts')
                    .select('id')
                    .eq('email', application.email)
                    .single();
                  if (internResult.data?.id) {
                    const { error } = await supabase.functions.invoke('send-intern-invite', {
                      body: { intern_id: internResult.data.id },
                    });
                    if (error) toast.error(`Fehler: ${error.message}`);
                    else toast.success('Magic Link gesendet.');
                  } else {
                    toast.error('Kein Intern-Account gefunden. Zuerst über "Hire" anlegen.');
                  }
                },
              })}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              🔗 Magic Link senden
            </button>
          )}
          <button
            onClick={onReturn}
            className="px-4 py-2 bg-white/[0.08] text-slate-100 text-xs font-bold rounded-lg hover:bg-white/[0.12] transition-colors"
          >
            &larr; Back to Applications
          </button>
        </div>
      </div>
      
      {/* --- At-a-Glance Summary --- */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-500 font-bold">Status</p>
            <StatusBadge stage={application.stage} />
          </div>
          <div>
            <p className="text-slate-500 font-bold">Applied On</p>
            <p className="text-white font-semibold">
              {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-bold">Email</p>
            <a href={`mailto:${application.email}`} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              {application.email}
            </a>
          </div>
          <div>
            <p className="text-slate-500 font-bold">Profile</p>
            {(() => {
              const raw = application.linkedin_url?.trim();
              if (!raw) return <p className="text-slate-500">Not provided</p>;
              // Normalize: auto-prefix https:// if missing (fixes Welle 1 Item 3 — many applicants
              // submit `www.linkedin.com/...` or `linkedin.com/...` which become 404 as relative links)
              const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Profile"
                  className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                >
                  <LinkedInIcon />
                  View Profile
                </a>
              );
            })()}
          </div>
          {application.preferred_project_areas && application.preferred_project_areas.length > 0 && (
            <div className="col-span-full mt-4">
              <p className="text-slate-500 font-bold mb-2">Preferred Project Areas</p>
              <div className="flex flex-wrap gap-2">
                {application.preferred_project_areas.map((area, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200 text-xs font-semibold rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(!application.preferred_project_areas || application.preferred_project_areas.length === 0) && (
            <div className="col-span-full mt-4">
              <p className="text-slate-500 font-bold mb-2">Preferred Project Areas</p>
              <p className="text-slate-500">Not filled out</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Left Column --- */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Project Highlight">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">
              {application.project_highlight}
            </p>
          </Card>

          {application.cv_url && (
            <Card title="CV / Resume">
              <CvDownload path={application.cv_url} filename={application.cv_filename} />
            </Card>
          )}

          {application.work_sample_text && (
              <Card title="Work Sample Submission">
                <p className="text-sm text-slate-300 whitespace-pre-wrap">
                  {application.work_sample_text}
                </p>
              </Card>
            )}
          
          <NotesSection
            notes={application.application_notes || []}
            applicationId={application.id}
            onNoteAdded={handleNoteAdded}
          />
        </div>

        {/* --- Right Column --- */}
        <div className="lg:col-span-1 space-y-6">
          <Card title="Personality Profile (BFI-10)">
            <BigFiveVisualizer scores={application.psychometrics} />
          </Card>

          <Card title="AI Analysis">
            <div className="space-y-3">
              {application.aiScore !== undefined && application.aiScore !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">Score:</span>
                  <span className={`px-3 py-1 text-xs font-black rounded-full ${
                    application.aiScore >= 75 ? 'bg-emerald-500/15 text-emerald-400' :
                    application.aiScore >= 50 ? 'bg-yellow-500/15 text-yellow-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {application.aiScore >= 100 ? 'STRONG YES' :
                     application.aiScore >= 75 ? 'YES' :
                     application.aiScore >= 50 ? 'MAYBE' : 'NO'}
                    {' '}({application.aiScore})
                  </span>
                </div>
              )}
              {aiAnalysis ? (
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {aiAnalysis}
                </p>
              ) : (
                <p className="text-sm text-slate-500">Not yet analyzed.</p>
              )}
              <button
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing}
                className="w-full px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzing && <Spinner className="w-3 h-3" />}
                {isAnalyzing ? 'Analyzing...' : aiAnalysis ? '🔄 Re-analyze' : '✨ Analyze with AI'}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
};

export default ApplicantDetailView;

