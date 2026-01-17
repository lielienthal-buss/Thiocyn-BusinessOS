// components/admin/ApplicantDetailView.tsx - V2 Refactor
import React from 'react';
import { Application } from '../../types'; // V2 Application type

// --- Helper Components ---

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bg-white dark:bg-slate-800/50 shadow-md rounded-lg p-6 ${className}`}>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
    <div className="space-y-4">{children}</div>
  </div>
);

const BigFiveVisualizer: React.FC<{ scores: { [key: string]: number } | null | undefined }> = ({ scores }) => {
  if (!scores) {
    return <p className="text-sm text-gray-500">No personality assessment data available.</p>;
  }

  const traitColors: { [key: string]: string } = {
    openness: 'bg-blue-500',
    conscientiousness: 'bg-purple-500',
    extraversion: 'bg-green-500',
    agreeableness: 'bg-yellow-500',
    neuroticism: 'bg-red-500',
  };

  return (
    <div className="space-y-3">
      {Object.entries(scores).map(([trait, score]) => (
        <div key={trait}>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{trait}</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{score}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className={`${traitColors[trait] || 'bg-gray-500'} h-2.5 rounded-full`} style={{ width: `${score}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

const LinkedInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);


// --- Main Component ---

interface Props {
  application: Application | null;
}

const ApplicantDetailView: React.FC<Props> = ({ application }) => {
  if (!application) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select an applicant to see details
      </div>
    );
  }

  const handleCopyLink = () => {
    const taskUrl = `${window.location.origin}/task/${application.access_token}`;
    navigator.clipboard.writeText(taskUrl).then(() => {
      alert('Task link copied to clipboard!');
    });
  };

  return (
    <div className="p-4 space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* --- Header --- */}
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{application.full_name}</h2>
        {application.linkedin_url && (
          <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer" title="View Profile">
            <LinkedInIcon />
          </a>
        )}
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
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all"
              >
                Copy Task Link
              </button>
            )}
             {application.stage === 'task_requested' && (
               <p className="text-sm text-gray-500">Task link has been generated. Send it to the candidate.</p>
            )}
            {application.stage === 'task_submitted' && (
               <p className="text-sm font-bold text-green-500">✅ Work sample received for review.</p>
            )}
             {application.stage === 'rejected' && (
               <p className="text-sm font-bold text-red-500">Application rejected.</p>
            )}
          </Card>
        </div>

        {/* --- Right Column --- */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Project Highlight">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{application.project_highlight}</p>
          </Card>

          {application.stage === 'task_submitted' && application.work_sample_text && (
            <Card title="Work Sample Submission">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{application.work_sample_text}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantDetailView;
