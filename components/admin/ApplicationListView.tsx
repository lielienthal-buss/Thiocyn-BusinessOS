import React, { useState, useEffect } from 'react';
import { getApplications, markEmailAsSentAction, updateApplicationStatus, getSettings } from '../../lib/actions';
import type { Application, ApplicationStatus, RecruiterSettings } from '../../types';
import SpinnerIcon from '../icons/SpinnerIcon';
import LinkedInIcon from '../icons/LinkedInIcon';

const ApplicationListView: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<RecruiterSettings | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    const [applications, globalSettings] = await Promise.all([
      getApplications(),
      getSettings()
    ]);
    setApps(applications);
    setSettings(globalSettings);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusChange = async (id: string, status: ApplicationStatus) => {
    setUpdatingId(id);
    await updateApplicationStatus(id, status);
    await fetchData();
    setUpdatingId(null);
  };

  const handleConfirmSent = async (id: string) => {
    setUpdatingId(id);
    await markEmailAsSentAction(id);
    await fetchData();
    setUpdatingId(null);
  };

  const generateMailto = (app: Application) => {
    if (!settings) return '#';
    const subject = encodeURIComponent(`Application Update: ${settings.company_name}`);
    const body = encodeURIComponent(`Hi ${app.fullName.split(' ')[0]},

We were impressed by your profile and would love to move forward to the next step.

Best regards,
The ${settings.company_name} Team`);
    return `mailto:${app.email}?subject=${subject}&body=${body}`;
  };

  if (loading) return <div className="flex justify-center py-20"><SpinnerIcon className="w-10 h-10 animate-spin text-primary-600" /></div>;

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden shadow-2xl border-white/20 animate-[fadeIn_0.5s_ease-out]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white/50 dark:bg-slate-900/50">
          <tr>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Candidate</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">AI Score</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Communication</th>
            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
          {apps.map(app => (
            <tr key={app.id} className="hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-8 py-6">
                <div className="flex flex-col">
                  <span className="font-black text-gray-900 dark:text-white tracking-tight">{app.fullName}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                    {app.email}
                    <a href={app.linkedinUrl} target="_blank" className="text-primary-600 hover:text-primary-700">
                      <LinkedInIcon className="w-3 h-3" />
                    </a>
                  </span>
                </div>
              </td>
              <td className="px-8 py-6">
                <select 
                  value={app.status}
                  onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationStatus)}
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full outline-none border-transparent focus:ring-2 focus:ring-primary-500 ${app.status === 'approved' ? 'bg-green-100 text-green-700' : app.status === 'interview' ? 'bg-blue-100 text-blue-700' : app.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                >
                  <option value="applied">Applied</option>
                  <option value="completed">Completed</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="approved">Approved</option>
                  <option value="interview">Interview</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </td>
              <td className="px-8 py-6">
                <div className="flex items-center gap-2">
                   <div className="w-12 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600" style={{ width: `${(app.aiScore || 0) * 100}%` }} />
                   </div>
                   <span className="text-[10px] font-black text-gray-900 dark:text-white">{Math.round((app.aiScore || 0) * 100)}%</span>
                </div>
              </td>
              <td className="px-8 py-6">
                <div className="flex flex-col gap-2">
                   {app.status === 'approved' && !app.email_sent ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={generateMailto(app)}
                          className="px-4 py-2 bg-primary-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-primary-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                          Write Email
                        </a>
                        <button 
                          onClick={() => handleConfirmSent(app.id)}
                          className="px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[9px] font-black uppercase tracking-widest rounded-lg border border-transparent hover:border-primary-500 transition-all"
                        >
                          Confirm Sent
                        </button>
                      </div>
                   ) : app.email_sent ? (
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                          Email Sent
                        </span>
                        <span className="text-[8px] text-gray-400 font-bold uppercase mt-1">{new Date(app.sent_at || '').toLocaleString()}</span>
                     </div>
                   ) : (
                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                       {app.status === 'approved' ? 'Approved - Pending' : 'Status: Approved required'}
                     </span>
                   )}
                </div>
              </td>
              <td className="px-8 py-6">
                <button 
                  disabled={updatingId === app.id}
                  className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-gray-400 hover:text-primary-600 transition-all"
                  title="View Details"
                >
                  {updatingId === app.id ? <SpinnerIcon className="w-4 h-4 animate-spin" /> : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {apps.length === 0 && (
        <div className="py-20 text-center">
           <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">No applications in the pipeline yet.</p>
        </div>
      )}
    </div>
  );
};

export default ApplicationListView;
