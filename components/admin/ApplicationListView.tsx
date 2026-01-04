import React, { useState, useEffect } from 'react';
import { getApplications } from '../../lib/actions';
import type { Application } from '../../types';
import SpinnerIcon from '../icons/SpinnerIcon';

interface Props {
  onSelectApplicant: (id: string) => void;
}

const ApplicationListView: React.FC<Props> = ({ onSelectApplicant }) => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const applications = await getApplications();
      setApps(applications);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden shadow-2xl border-white/20 animate-[fadeIn_0.5s_ease-out]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/50 dark:bg-slate-900/50">
          <tr>
            <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Name</th>
            <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Status</th>
            <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">DISC Primary</th>
            <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Availability</th>
            <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500">Project Interest</th>
            <th className="px-6 py-4 text-xs font-bold uppercase text-gray-500"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {apps.map(app => (
            <tr key={app.id} className="hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4 font-semibold">{app.full_name}</td>
              <td className="px-6 py-4">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
                  {app.status}
                </span>
              </td>
              <td className="px-6 py-4 font-semibold">{app.disc_primary}</td>
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
          ))}
        </tbody>
      </table>
      {apps.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-xs font-bold uppercase text-gray-400">No applications yet.</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationListView;