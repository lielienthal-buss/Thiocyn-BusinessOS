// components/admin/ApplicationListView.tsx - V2 Refactor
import React, { useState, useEffect } from 'react';
import {
  getApplications,
  deleteApplication,
  getSettings,
} from '../../lib/actions';
import type {
  Application,
  RecruiterSettings,
  ApplicationStage,
} from '../../types'; // Import ApplicationStage
import Spinner from '../ui/Spinner';
import { ConfirmModal } from '../ui/ConfirmModal';

interface Props {
  onSelectApplicant: (id: string) => void;
}

const PAGE_SIZE = 15;

const PaginationControls: React.FC<{
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalCount, pageSize, onPageChange }) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className="flex justify-between items-center px-6 py-3 bg-white/30 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-800">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Showing <span className="font-bold">{from}</span> to{' '}
        <span className="font-bold">{to}</span> of{' '}
        <span className="font-bold">{totalCount}</span> results
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &larr; Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
};

const ApplicationListView: React.FC<Props> = ({ onSelectApplicant }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filterStage, setFilterStage] = useState<string>('all'); // Changed from filterStatus to filterStage
  const [filterNameEmail, setFilterNameEmail] = useState<string>('');
  const [recruiterSettings, setRecruiterSettings] =
    useState<RecruiterSettings | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Pass filters to getApplications
      const { data, count } = await getApplications(
        currentPage,
        PAGE_SIZE,
        filterStage,
        filterNameEmail
      ); // Pass filterStage
      setApps(data);
      setTotalCount(count);
      setLoading(false);
    };
    fetchData();
  }, [currentPage, filterStage, filterNameEmail]); // Add filters to dependency array

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getSettings();
      setRecruiterSettings(settings);
    };
    loadSettings();
  }, []);

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Application',
      message: `Are you sure you want to delete the application for ${name}?`,
      onConfirm: async () => {
        setLoading(true);
        await deleteApplication(id);
        const { data, count } = await getApplications(
          currentPage,
          PAGE_SIZE,
          filterStage,
          filterNameEmail
        );
        setApps(data);
        setTotalCount(count);
        setLoading(false);
      },
    });
  };

  const handleEmail = (app: Application) => {
    const subject = `Regarding your application to ${recruiterSettings?.company_name || 'Take A Shot GmbH'}`;
    const body = `Hi ${app.full_name},

`; // Placeholder body
    window.location.href = `mailto:${app.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading && apps.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-10 h-10 text-primary-600" />
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
        variant="danger"
      />
    )}
    <div className="rounded-[3rem] overflow-hidden shadow-2xl bg-white border border-gray-200 animate-[fadeIn_0.5s_ease-out]">
      {/* Filter Controls */}
      <div className="p-6 flex flex-wrap gap-4 items-center border-b border-gray-200">
        <input
          type="text"
          placeholder="Filter by Name or Email"
          value={filterNameEmail}
          onChange={(e) => setFilterNameEmail(e.target.value)}
          className="input-field flex-grow max-w-xs"
        />
        <select
          value={filterStage} // Changed from filterStatus to filterStage
          onChange={(e) =>
            setFilterStage(e.target.value as ApplicationStage | 'all')
          } // Cast to ApplicationStage | 'all'
          className="input-field max-w-[150px]"
        >
          <option value="all">All Stages</option>
          <option value="applied">Applied</option>
          <option value="task_requested">Task Sent</option>
          <option value="task_submitted">Task Submitted</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">
                Name
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">
                Stage
              </th>{' '}
              {/* Changed from Status to Stage */}
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">
                Project Highlight
              </th>{' '}
              {/* New column */}
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 relative">
            {loading && (
              <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center">
                <Spinner className="w-8 h-8 text-primary-500" />
              </div>
            )}
            {apps.map((app) => {
              return (
                <tr
                  key={app.id}
                  className="hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold">{app.full_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      app.stage === 'applied' ? 'bg-blue-100 text-blue-700' :
                      app.stage === 'task_requested' ? 'bg-amber-100 text-amber-700' :
                      app.stage === 'task_submitted' ? 'bg-green-100 text-green-700' :
                      app.stage === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                      app.stage === 'hired' ? 'bg-purple-100 text-purple-700' :
                      app.stage === 'onboarding' ? 'bg-teal-100 text-teal-700' :
                      app.stage === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {app.stage} {/* Changed from app.status to app.stage */}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {app.project_highlight || 'N/A'}
                  </td>{' '}
                  {/* Display Project Highlight */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onSelectApplicant(app.id)}
                        className="btn-primary"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEmail(app)}
                        className="btn-primary"
                      >
                        Email
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(
                            app.id,
                            app.full_name || 'this applicant'
                          )
                        }
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100">
        {loading && apps.length > 0 && (
          <div className="flex justify-center py-4">
            <Spinner className="w-6 h-6 text-primary-500" />
          </div>
        )}
        {apps.map((app) => (
          <div key={app.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 text-sm">{app.full_name}</p>
              <span className={`shrink-0 px-2 py-0.5 text-xs font-semibold rounded-full ${
                app.stage === 'applied' ? 'bg-blue-100 text-blue-700' :
                app.stage === 'task_requested' ? 'bg-amber-100 text-amber-700' :
                app.stage === 'task_submitted' ? 'bg-green-100 text-green-700' :
                app.stage === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                app.stage === 'hired' ? 'bg-purple-100 text-purple-700' :
                app.stage === 'onboarding' ? 'bg-teal-100 text-teal-700' :
                app.stage === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {app.stage}
              </span>
            </div>
            {app.project_highlight && (
              <p className="text-xs text-gray-500">{app.project_highlight}</p>
            )}
            <div className="flex gap-2">
              <button onClick={() => onSelectApplicant(app.id)} className="btn-primary text-xs">View</button>
              <button onClick={() => handleEmail(app)} className="btn-primary text-xs">Email</button>
              <button onClick={() => handleDelete(app.id, app.full_name || 'this applicant')} className="btn-danger text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {apps.length === 0 && !loading && (
        <div className="py-20 text-center">
          <p className="text-xs font-bold uppercase text-gray-400">
            No applications yet.
          </p>
        </div>
      )}
      <PaginationControls
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
    </>
  );
};

export default ApplicationListView;
