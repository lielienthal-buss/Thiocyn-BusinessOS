import React, { useState, useEffect } from 'react';
import { getApplications } from '../../lib/actions';
import type { Application } from '../../types';
import SpinnerIcon from '../icons/SpinnerIcon';

interface Props {
  onSelectApplicant: (id: string) => void;
}

const PAGE_SIZE = 15;

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

const PaginationControls: React.FC<{ currentPage: number; totalCount: number; pageSize: number; onPageChange: (page: number) => void; }> = ({ currentPage, totalCount, pageSize, onPageChange }) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  if (totalCount === 0) return null;

  return (
    <div className="flex justify-between items-center px-6 py-3 bg-white/30 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-800">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Showing <span className="font-bold">{from}</span> to <span className="font-bold">{to}</span> of <span className="font-bold">{totalCount}</span> results
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-xs font-bold rounded-md bg-white/50 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &larr; Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-xs font-bold rounded-md bg-white/50 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, count } = await getApplications(currentPage, PAGE_SIZE);
      setApps(data);
      setTotalCount(count);
      setLoading(false);
    };
    fetchData();
  }, [currentPage]);

  const getDiscCounts = (app: Application) => {
    const counts = { D: 0, I: 0, S: 0, C: 0 };
    if (!app.disc_answers) return counts;

    for (const [questionId, answer] of Object.entries(app.disc_answers)) {
      const questionType = DISC_QUESTION_MAP[questionId];
      const score = DISC_SCORE_MAP[answer] || 0;
      if (questionType && score > 0) {
        counts[questionType] += score;
      }
    }
    return counts;
  };

  const getDiscPrimary = (counts: { D: number; I: number; S: number; C: number }) => {
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    return sorted[0] ? sorted[0][0] : 'N/A';
  };

  if (loading && apps.length === 0) {
    return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden shadow-2xl border-white/20 animate-[fadeIn_0.5s_ease-out]">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Name</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">DISC (D/I/S/C)</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Availability</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Project Interest</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 relative">
            {loading && (
                <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center">
                    <SpinnerIcon className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            )}
            {apps.map(app => {
              const discCounts = getDiscCounts(app);
              const discPrimary = getDiscPrimary(discCounts);
              return (
                <tr key={app.id} className="hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-semibold">{app.full_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">
                    {discPrimary} ({discCounts.D}/{discCounts.I}/{discCounts.S}/{discCounts.C})
                  </td>
                  <td className="px-6 py-4">{app.availability_hours_per_week} hrs/week</td>
                  <td className="px-6 py-4">{app.project_interest?.join(', ')}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onSelectApplicant(app.id)}
                      className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {apps.length === 0 && !loading && (
        <div className="py-20 text-center">
          <p className="text-xs font-bold uppercase text-gray-400">No applications yet.</p>
        </div>
      )}
      <PaginationControls 
        currentPage={currentPage}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default ApplicationListView;
