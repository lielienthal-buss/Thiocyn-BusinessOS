// components/admin/ApplicantDetailView.tsx - V2 Refactor
import React, { useState, useEffect } from 'react';
import { Application } from '../../types'; // V2 Application type
import Card from '../ui/Card';
import BigFiveVisualizer from './BigFiveVisualizer';
import LinkedInIcon from '../icons/LinkedInIcon';

// --- Main Component ---

interface Props {
  application: Application | null;
  onReturn: () => void; // Function to return to the list
}

const ApplicantDetailView: React.FC<Props> = ({ application, onReturn }) => {
  const [taskUrl, setTaskUrl] = useState('');

  // Pre-fill the task URL from localStorage when the component mounts
  useEffect(() => {
    const savedUrl = localStorage.getItem('savedTaskUrl');
    if (savedUrl) {
      setTaskUrl(savedUrl);
    }
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setTaskUrl(newUrl);
    localStorage.setItem('savedTaskUrl', newUrl); // Save to localStorage on change
  };

  const handleCopyLink = () => {
    if (taskUrl) {
      navigator.clipboard.writeText(taskUrl);
      alert('Link copied to clipboard!');
    } else {
      alert('Please paste a link first.');
    }
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
        <div className="lg:col-span-1 space-y-6">
          <Card title="Personality Profile (BFI-10)">
            <BigFiveVisualizer scores={application.psychometrics} />
          </Card>
          <Card title="Workflow Actions">
            {application.stage === 'applied' && (
              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Task Link to Send
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste task link here..."
                    value={taskUrl}
                    onChange={handleUrlChange}
                    className="flex-grow px-3 py-2 text-sm bg-white dark:bg-slate-800 rounded-md outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200 dark:border-slate-700"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
            {application.stage === 'task_requested' && (
              <p className="text-sm text-gray-500">
                Task link has been generated. Send it to the candidate.
              </p>
            )}
            {application.stage === 'task_submitted' && (
              <p className="text-sm font-bold text-green-500">
                ✅ Work sample received for review.
              </p>
            )}
            {application.stage === 'rejected' && (
              <p className="text-sm font-bold text-red-500">
                Application rejected.
              </p>
            )}
          </Card>
        </div>

        {/* --- Right Column --- */}
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
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailView;
