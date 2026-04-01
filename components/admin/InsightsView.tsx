// components/admin/InsightsView.tsx - V2 Refactor
import React, { useState, useEffect } from 'react';
import type { Application } from '@/types';
import { getAllApplications } from '@/lib/actions';
import Spinner from '@/components/ui/Spinner';

const InsightsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllApps = async () => {
      setLoading(true);
      const allApps = await getAllApplications();
      setApplications(allApps);
      setLoading(false);
    };
    fetchAllApps();
  }, []);

  // --- V2 Data Calculations ---

  const total = applications.length;

  const stageCounts = applications.reduce(
    (acc, app) => {
      const stage = app.stage || 'applied'; // Default to 'applied' if stage is null/undefined
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const psychometricsAverages = applications.reduce(
    (acc, app) => {
      if (app.psychometrics) {
        for (const trait in app.psychometrics) {
          if (!acc[trait]) {
            acc[trait] = { total: 0, count: 0 };
          }
          acc[trait].total += app.psychometrics[trait];
          acc[trait].count += 1;
        }
      }
      return acc;
    },
    {} as Record<string, { total: number; count: number }>
  );

  const bigFiveAverages = Object.entries(psychometricsAverages).map(
    ([trait, data]: [string, { total: number; count: number }]) => ({
      trait,
      average: Math.round(data.total / data.count),
    })
  );

  const traitColors: { [key: string]: string } = {
    openness: 'bg-blue-500',
    conscientiousness: 'bg-purple-500',
    extraversion: 'bg-green-500',
    agreeableness: 'bg-yellow-500',
    neuroticism: 'bg-red-500',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-10 h-10 text-primary-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeIn_0.5s_ease-out]">
      {/* Primary Metrics */}
      <div className="md:col-span-4 p-8 rounded-[2.5rem] flex flex-col justify-center bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Total Applicants
        </p>
        <h4 className="text-5xl font-black text-white tracking-tighter">
          {total}
        </h4>
      </div>

      {/* V2 Funnel */}
      <div className="md:col-span-8 p-8 rounded-[2.5rem] bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
          V2 Hiring Funnel
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Applied', count: total },
            {
              label: 'Task Submitted',
              count: stageCounts['task_submitted'] || 0,
            },
            { label: 'Rejected', count: stageCounts['rejected'] || 0 },
          ].map((step, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-[10px] font-black uppercase">
                <span className="text-slate-500">{step.label}</span>
                <span className="text-primary-600">{step.count}</span>
              </div>
              <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-1000"
                  style={{
                    width: total > 0 ? `${(step.count / total) * 100}%` : '0%',
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Big Five Average Distribution */}
      <div className="md:col-span-6 p-8 rounded-[2.5rem] bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">
          Avg. Personality Profile
        </h3>
        <div className="space-y-3">
          {bigFiveAverages.map(({ trait, average }) => (
            <div key={trait}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-slate-300 capitalize">
                  {trait}
                </span>
                <span className="text-sm font-bold text-white">
                  {average}%
                </span>
              </div>
              <div className="w-full bg-white/[0.08] rounded-full h-2.5">
                <div
                  className={`${traitColors[trait] || 'bg-gray-500'} h-2.5 rounded-full`}
                  style={{ width: `${average}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stage Breakdown Grid */}
      <div className="md:col-span-6 p-8 rounded-[2.5rem] grid grid-cols-2 gap-4 bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        {Object.entries(stageCounts).map(([stage, count]) => (
          <div
            key={stage}
            className="p-4 rounded-2xl bg-surface-900/60 border border-white/[0.06]"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {stage}
            </p>
            <p className="text-2xl font-black text-white">
              {count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightsView;
