import React, { useState, useEffect } from 'react';
import { Application, ApplicationNote } from '@/types';
import Card from '@/components/ui/Card';
import BigFiveVisualizer from './BigFiveVisualizer';
import LinkedInIcon from '@/components/icons/LinkedInIcon';
import { addNoteForApplication, updateApplicationStage } from '@/lib/actions';
import Spinner from '@/components/ui/Spinner';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
            className="w-full p-2 text-sm bg-white dark:bg-slate-800 rounded-md border border-gray-300 dark:border-slate-600"
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
                  className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg"
                >
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {note.note_text}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="font-bold">{note.author_email}</span> &middot;{' '}
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              ))
          ) : (
            <p className="text-sm text-gray-500">No notes yet.</p>
          )}
        </div>
      </div>
    </Card>
  );
};

// --- Helper: Status Badge ---
const StatusBadge: React.FC<{ stage: string | null }> = ({ stage }) => {
  const stageStyles: { [key: string]: string } = {
    applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    task_requested: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    task_submitted: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    hired: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    onboarding: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  };

  const style = stage ? stageStyles[stage] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
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
            body: { application_id: application.id, template_slug: templateSlug },
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
      <div className="flex items-center justify-center h-full text-gray-500">
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
    <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {application.full_name}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {application.stage === 'applied' && (
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
                ✉️ Send Task Email
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
            <button
              onClick={() => handleSendEmail('rejection')}
              disabled={isSendingEmail}
              className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isSendingEmail && <Spinner className="w-3 h-3" />}
              ❌ Reject
            </button>
          )}
          <button
            onClick={onReturn}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white text-xs font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            &larr; Back to Applications
          </button>
        </div>
      </div>
      
      {/* --- At-a-Glance Summary --- */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 font-bold">Status</p>
            <StatusBadge stage={application.stage} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 font-bold">Applied On</p>
            <p className="text-gray-900 dark:text-white font-semibold">
              {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 font-bold">Email</p>
            <a href={`mailto:${application.email}`} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              {application.email}
            </a>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 font-bold">Profile</p>
            {application.linkedin_url && application.linkedin_url.startsWith('http') ? (
              <a
                href={application.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                title="View Profile"
                className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-semibold hover:underline"
              >
                <LinkedInIcon />
                View Profile
              </a>
            ) : (
              <p className="text-gray-500">Not provided</p>
            )}
          </div>
          {application.preferred_project_areas && application.preferred_project_areas.length > 0 && (
            <div className="col-span-full mt-4">
              <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">Preferred Project Areas</p>
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
              <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">Preferred Project Areas</p>
              <p className="text-gray-500">Not filled out</p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Left Column --- */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Project Highlight">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {application.project_highlight}
            </p>
          </Card>

          {application.stage === 'task_submitted' &&
            application.work_sample_text && (
              <Card title="Work Sample Submission">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
                  <span className="text-sm font-bold text-gray-500">Score:</span>
                  <span className={`px-3 py-1 text-xs font-black rounded-full ${
                    application.aiScore >= 75 ? 'bg-green-100 text-green-800' :
                    application.aiScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {application.aiScore >= 100 ? 'STRONG YES' :
                     application.aiScore >= 75 ? 'YES' :
                     application.aiScore >= 50 ? 'MAYBE' : 'NO'}
                    {' '}({application.aiScore})
                  </span>
                </div>
              )}
              {aiAnalysis ? (
                <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {aiAnalysis}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Not yet analyzed.</p>
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

