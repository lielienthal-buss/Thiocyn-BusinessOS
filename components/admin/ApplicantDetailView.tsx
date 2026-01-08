import React, { useState, useEffect } from 'react';
import type { Application, ApplicationNote, RecruiterSettings } from '../../types';
import { getApplicant, updateApplicationStatus, addApplicationNote } from '../../lib/actions';
import SpinnerIcon from '../icons/SpinnerIcon';
import DISCVisualizerPro from './DISCVisualizerPro'; // Import the new visualizer

interface Props {
  applicationId: string;
  settings: RecruiterSettings | null;
  onBack: () => void;
  onNoteAdded: () => void;
}

// Mapping of email templates for different application statuses
const emailTemplates = {
  task: {
    subject: "Your Task from {{company_name}}",
    body: "Hi {{name}},\n\nHere is your task: [TASK DESCRIPTION]. Please complete it by [DEADLINE].\n\nBest,\nThe {{company_name}} Team"
  },
  interview: {
    subject: "Interview Invitation from {{company_name}}",
    body: "Hi {{name}},\n\nWe were impressed and would like to invite you for an interview. Please book a slot here: {{calendly_url}}\n\nBest,\nThe {{company_name}} Team"
  },
  offer: {
    subject: "Job Offer from {{company_name}}",
    body: "Hi {{name}},\n\nCongratulations! We would like to offer you the position. [OFFER DETAILS]\n\nBest,\nThe {{company_name}} Team"
  },
  rejection: {
    subject: "Update on your application at {{company_name}}",
    body: "Hi {{name}},\n\nThank you for your interest. We have decided to move forward with other candidates at this time.\n\nBest,\nThe {{company_name}} Team"
  }
};

// DISC questions and their mapping to personality types
const discQuestions = [
    { id: 'disc_q1', text: 'I am direct and to the point.' },
    { id: 'disc_q2', text: 'I enjoy influencing and inspiring others.' },
    { id: 'disc_q3', text: 'I prefer a stable and predictable work environment.' },
    { id: 'disc_q4', text: 'I focus on details and ensure high quality.' },
    { id: 'disc_q5', text: 'I take charge when necessary.' },
    { id: 'disc_q6', text: 'I am optimistic and outgoing.' },
    { id: 'disc_q7', text: 'I am a good listener and very patient.' },
    { id: 'disc_q8', text: 'I follow rules and procedures closely.' },
    { id: 'disc_q9', text: 'I am driven by results and challenges.' },
    { id: 'disc_q10', text: 'I thrive in social and collaborative settings.' },
];

// Mapping of DISC questions to their types (D, I, S, C)
const DISC_QUESTION_MAP: { [key: string]: 'D' | 'I' | 'S' | 'C' } = {
  disc_q1: 'D', disc_q5: 'D', disc_q9: 'D',
  disc_q2: 'I', disc_q6: 'I', disc_q10: 'I',
  disc_q3: 'S', disc_q7: 'S',
  disc_q4: 'C', disc_q8: 'C',
};

// Scoring for answers
const DISC_SCORE_MAP: { [key: string]: number } = {
  'Agree': 1,
  'Strongly Agree': 2,
};


const ApplicantDetailView: React.FC<Props> = ({ applicationId, settings, onBack, onNoteAdded }) => {
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Effect to load applicant data when the component mounts or applicationId changes
  useEffect(() => {
    const loadApplicant = async () => {
      setLoading(true);
      // Fetch applicant data using the provided applicationId
      const app = await getApplicant(applicationId);
      setApplication(app);
      setLoading(false);
    };
    loadApplicant();
  }, [applicationId]);

  // Function to calculate DISC profile based on application answers
  const getDiscProfile = (app: Application) => {
    const counts = { D: 0, I: 0, S: 0, C: 0 };
    // Return default if no disc_answers are present
    if (!app.disc_answers) return { counts, primary: 'N/A', secondary: 'N/A' };

    // Iterate over answers and sum scores based on question type
    for (const [questionId, answer] of Object.entries(app.disc_answers)) {
      const questionType = DISC_QUESTION_MAP[questionId];
      const score = DISC_SCORE_MAP[answer] || 0;
      if (questionType && score > 0) {
        counts[questionType] += score;
      }
    }
    
    // Sort counts to determine primary and secondary DISC types
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const primary = sorted[0] ? sorted[0][0] : 'N/A';
    const secondary = sorted[1] ? sorted[1][0] : 'N/A';
    
    return { counts, primary, secondary };
  };

  // Show loading spinner if data is being fetched
  if (loading) {
    return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;
  }

  // Show error message if applicant not found
  if (!application) {
    return <div className="text-center py-20">Applicant not found.</div>;
  }

  // Calculate DISC profile for the current application
  const { counts: discCounts, primary: discPrimary, secondary: discSecondary } = getDiscProfile(application);

  // Handler for changing application status and sending emails
  const handleStatusChange = async (newStatus: string, templateKey?: keyof typeof emailTemplates) => {
    let timestamps: Record<string, string> = {};
    // Set timestamps based on status change
    if (newStatus === 'task_sent') timestamps.task_sent_at = new Date().toISOString();
    if (newStatus === 'interview') timestamps.interview_at = new Date().toISOString();
    if (newStatus === 'accepted' || newStatus === 'rejected') timestamps.decided_at = new Date().toISOString();
    
    // Update application status in the backend
    await updateApplicationStatus(application.id, newStatus, timestamps);

    // If a template key is provided, send an email
    if (templateKey) {
      const template = emailTemplates[templateKey];
      // Replace placeholders in subject and body
      let subject = template.subject.replace('{{company_name}}', settings?.company_name || '');
      let body = template.body
        .replace('{{name}}', application.full_name)
        .replace('{{company_name}}', settings?.company_name || '')
        .replace('{{calendly_url}}', settings?.calendly_url || '[CALENDLY_LINK]');
      
      // Open mailto link to send email
      window.location.href = `mailto:${application.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    onBack(); // Navigate back to the list after action
  };

  // Handler for adding a new note to the application
  const handleAddNote = async () => {
    if (!newNote.trim()) return; // Do nothing if note is empty
    setIsSubmittingNote(true);
    await addApplicationNote(application.id, newNote);
    setNewNote('');
    setIsSubmittingNote(false);
    // Reload applicant data to show the new note
    const reloadedApp = await getApplicant(applicationId);
    setApplication(reloadedApp);
    onNoteAdded();
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      {/* Back button */}
      <button onClick={onBack} className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg">&larr; Back to List</button>
      
      {/* Header Section: Applicant Name, Email, and Status */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">{application.full_name}</h2>
          <p className="text-gray-500">{application.email}</p>
        </div>
        <div className="px-4 py-2 text-sm font-bold rounded-full bg-blue-100 text-blue-800">{application.status}</div>
      </div>

      {/* Action Buttons: Send Task, Invite to Interview, Accept, Reject */}
      <div className="flex flex-wrap gap-4">
        <button onClick={() => handleStatusChange('task_sent', 'task')} className="btn-primary">Send Task</button>
        <button onClick={() => handleStatusChange('interview', 'interview')} className="btn-primary">Invite to Interview</button>
        <button onClick={() => handleStatusChange('accepted', 'offer')} className="btn-success">Accept</button>
        <button onClick={() => handleStatusChange('rejected', 'rejection')} className="btn-danger">Reject</button>
      </div>

      {/* Details Grid: Written Answers, DISC Answers, Notes, and Sidebar Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Written Answers Section */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">Written Answers</h3>
            <div className="space-y-4 text-sm">
              <p><strong>Motivation:</strong> {application.motivation_text}</p>
              <p><strong>Project Example:</strong> {application.project_example_text}</p>
              <p><strong>Requirements Handling:</strong> {application.requirements_handling_text}</p>
              <p><strong>Remote Work:</strong> {application.remote_work_text}</p>
            </div>
          </div>
          {/* DISC Answers Section */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">DISC Questionnaire Answers</h3>
            <div className="space-y-2 text-sm">
              {discQuestions.map((q, index) => (
                <p key={q.id}><strong>{index + 1}. {q.text}</strong>: {application.disc_answers?.[q.id] || 'N/A'}</p>
              ))}
            </div>
          </div>
          {/* Internal Notes Section */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">Internal Notes</h3>
            <div className="space-y-2 mb-4">
              {application.notes?.map((note: ApplicationNote) => (
                <div key={note.id} className="text-sm p-2 bg-gray-100 rounded">
                  <p>{note.note_text}</p>
                  <p className="text-xs text-gray-500 text-right">by {note.author_email} on {new Date(note.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
            {/* Input for adding new notes */}
            <div className="flex gap-2">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} className="w-full p-2 border rounded text-black" placeholder="Add a note..."></textarea>
              <button onClick={handleAddNote} disabled={isSubmittingNote} className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg self-start">
                {isSubmittingNote ? <SpinnerIcon className="animate-spin h-5 w-5" /> : 'Add'}
              </button>
            </div>
          </div>
        </div>
        {/* Sidebar Section: Details and DISC Profile */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-bold text-lg mb-4">Details</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Interest:</strong> {application.project_interest?.join(', ')}</p>
              <p><strong>Availability:</strong> {application.availability_hours_per_week} hrs/week</p>
              <p><strong>Timezone:</strong> {application.timezone}</p>
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-lg mb-4">DISC & AI Profile</h3>
            <DISCVisualizerPro
              discCounts={{
                d: discCounts.D,
                i: discCounts.I,
                s: discCounts.S,
                c: discCounts.C,
              }}
              aiScore={application.aiScore}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailView;