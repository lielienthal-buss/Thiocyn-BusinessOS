import React, { useState } from 'react';
import type { Application, ApplicationNote, RecruiterSettings } from '../../types';
import { updateApplicationStatus, addApplicationNote } from '../../lib/actions';
import SpinnerIcon from '../icons/SpinnerIcon';

interface Props {
  application: Application;
  settings: RecruiterSettings | null;
  onBack: () => void;
  onNoteAdded: () => void;
}

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

const discQuestions = [
  { id: 'disc_q1', text: 'I am assertive, and direct.' },
  { id: 'disc_q2', text: 'I am optimistic and outgoing.' },
  { id: 'disc_q3', text: 'I am patient and a good listener.' },
  { id: 'disc_q4', text: 'I am precise and analytical.' },
  { id: 'disc_q5', text: 'I like to take on challenges.' },
  { id: 'disc_q6', text: 'I enjoy persuading and influencing others.' },
  { id: 'disc_q7', text: 'I prefer a stable and predictable environment.' },
  { id: 'disc_q8', text: 'I value accuracy and quality.' },
  { id: 'disc_q9', text: 'I can be demanding at times.' },
  { id: 'disc_q10', text: 'I enjoy collaborating in a team.' },
];

const ApplicantDetailView: React.FC<Props> = ({ application, settings, onBack, onNoteAdded }) => {
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const getDiscPrimaryAndSecondary = (app: Application) => {
    const counts = {
      D: app.disc_count_d || 0,
      I: app.disc_count_i || 0,
      S: app.disc_count_s || 0,
      C: app.disc_count_c || 0,
    };
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const primary = sorted[0][0];
    const secondary = sorted.length > 1 ? sorted[1][0] : '';
    return { primary, secondary };
  };

  const { primary: discPrimary, secondary: discSecondary } = getDiscPrimaryAndSecondary(application);

  const handleStatusChange = async (newStatus: Application['status'], templateKey?: keyof typeof emailTemplates) => {
    let timestamps: Record<string, string> = {};
    if (newStatus === 'task_sent') timestamps.task_sent_at = new Date().toISOString();
    if (newStatus === 'interview') timestamps.interview_at = new Date().toISOString();
    if (newStatus === 'accepted' || newStatus === 'rejected') timestamps.decided_at = new Date().toISOString();
    
    await updateApplicationStatus(application.id, newStatus, timestamps);

    if (templateKey) {
      const template = emailTemplates[templateKey];
      let subject = template.subject.replace('{{company_name}}', settings?.company_name || '');
      let body = template.body
        .replace('{{name}}', application.full_name)
        .replace('{{company_name}}', settings?.company_name || '')
        .replace('{{calendly_url}}', settings?.calendly_url || '[CALENDLY_LINK]');
      
      window.location.href = `mailto:${application.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    onBack(); // Go back to list after action
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    await addApplicationNote(application.id, newNote);
    setNewNote('');
    setIsSubmittingNote(false);
    onNoteAdded();
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out]">
      <button onClick={onBack} className="text-sm font-bold text-primary-600">&larr; Back to List</button>
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">{application.full_name}</h2>
          <p className="text-gray-500">{application.email}</p>
        </div>
        <div className="px-4 py-2 text-sm font-bold rounded-full bg-blue-100 text-blue-800">{application.status}</div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button onClick={() => handleStatusChange('task_sent', 'task')} className="btn-primary">Send Task</button>
        <button onClick={() => handleStatusChange('interview', 'interview')} className="btn-primary">Invite to Interview</button>
        <button onClick={() => handleStatusChange('accepted', 'offer')} className="btn-success">Accept</button>
        <button onClick={() => handleStatusChange('rejected', 'rejection')} className="btn-danger">Reject</button>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Written Answers */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">Written Answers</h3>
            <div className="space-y-4 text-sm">
              <p><strong>Motivation:</strong> {application.motivation_text}</p>
              <p><strong>Project Example:</strong> {application.project_example_text}</p>
              <p><strong>Requirements Handling:</strong> {application.requirements_handling_text}</p>
              <p><strong>Remote Work:</strong> {application.remote_work_text}</p>
            </div>
          </div>
          {/* DISC Answers */}
          <div className="card">
            <h3 className="font-bold text-lg mb-4">DISC Questionnaire Answers</h3>
            <div className="space-y-2 text-sm">
              {discQuestions.map((q, index) => (
                <p key={q.id}><strong>{index + 1}. {q.text}</strong>: {(application as any)[q.id]}</p>
              ))}
            </div>
          </div>
          {/* Notes */}
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
            <div className="flex gap-2">
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} rows={2} className="w-full p-2 border rounded" placeholder="Add a note..."></textarea>
              <button onClick={handleAddNote} disabled={isSubmittingNote} className="btn-primary self-start">
                {isSubmittingNote ? <SpinnerIcon className="animate-spin h-5 w-5" /> : 'Add'}
              </button>
            </div>
          </div>
        </div>
        {/* Sidebar */}
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
            <h3 className="font-bold text-lg mb-4">DISC Profile</h3>
            <p className="text-2xl font-bold">{discPrimary}</p>
            <p className="text-sm text-gray-500">Secondary: {discSecondary}</p>
            <div className="mt-4 text-sm">
              <p>D: {application.disc_count_d}</p>
              <p>I: {application.disc_count_i}</p>
              <p>S: {application.disc_count_s}</p>
              <p>C: {application.disc_count_c}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailView;