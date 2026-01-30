import React, { useState, useEffect } from 'react';
import { Application, ApplicationNote } from '../../types';
import Card from '../ui/Card';
import BigFiveVisualizer from './BigFiveVisualizer';
import LinkedInIcon from '../icons/LinkedInIcon';
import { addNoteForApplication } from '../../lib/actions';
import Spinner from '../ui/Spinner';

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
      alert('Failed to add note.');
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

  if (!application) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select an applicant to see details
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* --- Header --- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {application.full_name}
          </h2>
          {application.linkedin_url && (
            <a
              href={application.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              title="View Profile"
            >
              <LinkedInIcon />
            </a>
          )}
        </div>
        <button
          onClick={onReturn}
          className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white text-xs font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
        >
          &larr; Back to Applications
        </button>
      </div>
      <p className="text-sm text-gray-500 -mt-5">{application.email}</p>

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
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailView;

