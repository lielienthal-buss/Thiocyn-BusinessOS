
import React from 'react';
import type { Application } from '../../types';

interface InsightsViewProps {
  applications: Application[];
}

const InsightsView: React.FC<InsightsViewProps> = ({ applications }) => {
  const total = applications.length;
  const last30Days = applications.filter(a => {
    const date = new Date(a.createdAt);
    const now = new Date();
    return (now.getTime() - date.getTime()) < (30 * 24 * 60 * 60 * 1000);
  }).length;

  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const aiBuckets = [
    { label: '0-40%', count: applications.filter(a => (a.aiScore || 0) <= 0.4).length, color: 'bg-red-500' },
    { label: '41-70%', count: applications.filter(a => (a.aiScore || 0) > 0.4 && (a.aiScore || 0) <= 0.7).length, color: 'bg-orange-500' },
    { label: '71-100%', count: applications.filter(a => (a.aiScore || 0) > 0.7).length, color: 'bg-green-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeIn_0.5s_ease-out]">
      {/* Primary Metrics */}
      <div className="md:col-span-4 glass-card p-8 rounded-[2.5rem] flex flex-col justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Pool</p>
        <h4 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{total}</h4>
        <p className="text-xs text-gray-400 mt-2 font-bold">{last30Days} in the last 30 days</p>
      </div>

      {/* Funnel Conversion */}
      <div className="md:col-span-8 glass-card p-8 rounded-[2.5rem]">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-6">Hiring Funnel</h3>
        <div className="space-y-4">
          {[
            { label: 'Applied', count: total, percentage: 100 },
            { label: 'Interviewed', count: statusCounts['interview'] || 0, percentage: (total > 0 ? (statusCounts['interview'] || 0) / total * 100 : 0) },
            { label: 'Hired', count: statusCounts['hired'] || 0, percentage: (total > 0 ? (statusCounts['hired'] || 0) / total * 100 : 0) },
          ].map((step, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-gray-500">{step.label}</span>
                <span className="text-primary-600">{step.count} ({Math.round(step.percentage)}%)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary-600 transition-all duration-1000" style={{ width: `${step.percentage}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Score Distribution */}
      <div className="md:col-span-6 glass-card p-8 rounded-[2.5rem]">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">AI Match Distribution</h3>
        <div className="flex items-end justify-between gap-4 h-40">
          {aiBuckets.map((bucket, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-4">
              <div className="w-full bg-gray-50 dark:bg-slate-800 rounded-2xl relative flex items-end overflow-hidden" style={{ height: '120px' }}>
                <div 
                  className={`w-full ${bucket.color} transition-all duration-1000 ease-out`} 
                  style={{ height: total > 0 ? `${(bucket.count / total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-[10px] font-black uppercase text-gray-400">{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status Breakdown Grid */}
      <div className="md:col-span-6 glass-card p-8 rounded-[2.5rem] grid grid-cols-2 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="p-4 rounded-2xl bg-white/30 dark:bg-slate-900/30 border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{status}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{count}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsView;
