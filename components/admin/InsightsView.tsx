// components/admin/InsightsView.tsx
// Welle 1b Item 6 — Hiring Insights View
// Funnel + Conversion-Rates + Median-Times + Big Five averages
// Per docs/welle/welle-1-plan.md §Welle 1b
import React, { useState, useEffect, useMemo } from 'react';
import type { Application } from '@/types';
import { getAllApplications } from '@/lib/actions';
import { trackOperationalMetric } from '@/lib/track-event';
import Spinner from '@/components/ui/Spinner';

// ─── Funnel definition ────────────────────────────────────────────────────
// Stage order matches the ApplicationStage union in types.ts. Each step has
// a label, a count selector, and an optional "previous step" pointer for
// conversion-rate calculation.
type FunnelStep = {
  key: string;
  label: string;
  matches: (a: Application) => boolean;
};

const FUNNEL_STEPS: FunnelStep[] = [
  { key: 'applied',        label: 'Applied',         matches: () => true },
  { key: 'task_requested', label: 'Task Requested',  matches: (a) => a.task_sent_at != null || ['task_requested','task_submitted','interview','hired'].includes(a.stage ?? '') },
  { key: 'task_submitted', label: 'Task Submitted',  matches: (a) => a.task_submitted_at != null || ['task_submitted','interview','hired'].includes(a.stage ?? '') },
  { key: 'interview',      label: 'Interview',       matches: (a) => a.interview_at != null || ['interview','hired'].includes(a.stage ?? '') },
  { key: 'hired',          label: 'Hired',           matches: (a) => a.stage === 'hired' },
];

// ─── Median helper ────────────────────────────────────────────────────────
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const diffMs = new Date(b).getTime() - new Date(a).getTime();
  if (isNaN(diffMs) || diffMs < 0) return null;
  return diffMs / (1000 * 60 * 60 * 24);
}

const TRAIT_COLORS: Record<string, string> = {
  openness: 'bg-blue-500',
  conscientiousness: 'bg-purple-500',
  extraversion: 'bg-green-500',
  agreeableness: 'bg-yellow-500',
  neuroticism: 'bg-red-500',
};

const InsightsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void trackOperationalMetric('insights_view_opened', 'hiring');
    let cancelled = false;
    const fetchAllApps = async () => {
      setLoading(true);
      const allApps = await getAllApplications();
      if (!cancelled) {
        setApplications(allApps);
        setLoading(false);
      }
    };
    void fetchAllApps();
    return () => { cancelled = true; };
  }, []);

  // ─── Aggregations (memoized so they don't recompute on every render) ────
  const stats = useMemo(() => {
    const total = applications.length;

    // Funnel counts
    const funnelCounts = FUNNEL_STEPS.map((step) => ({
      ...step,
      count: applications.filter(step.matches).length,
    }));

    // Conversion rates (per step vs first step)
    const funnelWithConversion = funnelCounts.map((step, idx) => {
      const prevCount = idx === 0 ? total : funnelCounts[idx - 1].count;
      const fromPrev = prevCount > 0 ? (step.count / prevCount) * 100 : 0;
      const fromTop = total > 0 ? (step.count / total) * 100 : 0;
      return { ...step, fromPrev, fromTop };
    });

    // Median time-to-hire (created_at → decided_at where stage='hired')
    const hiredApps = applications.filter((a) => a.stage === 'hired');
    const timeToHireDays = median(
      hiredApps
        .map((a) => daysBetween(a.created_at, a.decided_at))
        .filter((v): v is number => v !== null)
    );

    // Median time-to-task (created_at → task_sent_at)
    const timeToTaskDays = median(
      applications
        .map((a) => daysBetween(a.created_at, a.task_sent_at))
        .filter((v): v is number => v !== null)
    );

    // Median task-completion time (task_sent_at → task_submitted_at)
    const taskCompletionDays = median(
      applications
        .map((a) => daysBetween(a.task_sent_at, a.task_submitted_at))
        .filter((v): v is number => v !== null)
    );

    // Stage breakdown (raw enum counts for the grid)
    const stageCounts = applications.reduce<Record<string, number>>((acc, app) => {
      const stage = app.stage || 'applied';
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    // Big Five personality averages
    const psychSums = applications.reduce<Record<string, { total: number; count: number }>>(
      (acc, app) => {
        if (app.psychometrics) {
          for (const trait in app.psychometrics) {
            if (!acc[trait]) acc[trait] = { total: 0, count: 0 };
            acc[trait].total += app.psychometrics[trait];
            acc[trait].count += 1;
          }
        }
        return acc;
      },
      {}
    );
    const bigFiveAverages = Object.entries(psychSums).map(([trait, data]) => ({
      trait,
      average: Math.round(data.total / data.count),
    }));

    return {
      total,
      hiredCount: hiredApps.length,
      funnel: funnelWithConversion,
      timeToHireDays,
      timeToTaskDays,
      taskCompletionDays,
      stageCounts,
      bigFiveAverages,
    };
  }, [applications]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-10 h-10 text-primary-600" />
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────
  if (stats.total === 0) {
    return (
      <div className="p-12 rounded-[2.5rem] bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm text-center animate-[fadeIn_0.5s_ease-out]">
        <p className="text-5xl mb-4">📊</p>
        <h3 className="text-xl font-bold text-white mb-2">No applications yet</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          The Insights View shows funnel conversion, median time-to-hire, and personality averages
          once applicants come through the public form. Come back after your first few submissions.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-[fadeIn_0.5s_ease-out]">
      {/* ─── Headline metrics ─── */}
      <div className="md:col-span-3 p-8 rounded-[2.5rem] flex flex-col justify-center bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Total Applicants
        </p>
        <h4 className="text-5xl font-black text-white tracking-tighter">{stats.total}</h4>
      </div>

      <div className="md:col-span-3 p-8 rounded-[2.5rem] flex flex-col justify-center bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Hired</p>
        <h4 className="text-5xl font-black text-emerald-400 tracking-tighter">{stats.hiredCount}</h4>
        <p className="text-xs text-slate-500 mt-1">
          {stats.total > 0 ? `${((stats.hiredCount / stats.total) * 100).toFixed(1)}% conversion` : '—'}
        </p>
      </div>

      <div className="md:col-span-3 p-8 rounded-[2.5rem] flex flex-col justify-center bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Median Time-to-Hire
        </p>
        <h4 className="text-5xl font-black text-white tracking-tighter">
          {stats.timeToHireDays != null ? `${stats.timeToHireDays.toFixed(1)}d` : '—'}
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          {stats.hiredCount > 0 ? `n=${stats.hiredCount}` : 'no data yet'}
        </p>
      </div>

      <div className="md:col-span-3 p-8 rounded-[2.5rem] flex flex-col justify-center bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Median Task Completion
        </p>
        <h4 className="text-5xl font-black text-white tracking-tighter">
          {stats.taskCompletionDays != null ? `${stats.taskCompletionDays.toFixed(1)}d` : '—'}
        </h4>
        <p className="text-xs text-slate-500 mt-1">task sent → submitted</p>
      </div>

      {/* ─── Full hiring funnel with conversion rates ─── */}
      <div className="md:col-span-12 p-8 rounded-[2.5rem] bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <div className="flex items-baseline justify-between mb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
            Hiring Funnel
          </h3>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">
            % from previous step · % from top
          </p>
        </div>
        <div className="space-y-5">
          {stats.funnel.map((step, idx) => (
            <div key={step.key} className="space-y-1.5">
              <div className="flex justify-between items-baseline text-[11px]">
                <span className="font-black uppercase tracking-widest text-slate-400">{step.label}</span>
                <div className="flex gap-3 items-baseline">
                  {idx > 0 && (
                    <span className="text-slate-500">{step.fromPrev.toFixed(1)}% ↓</span>
                  )}
                  <span className="text-slate-500">{step.fromTop.toFixed(1)}% top</span>
                  <span className="font-black text-primary-400 text-sm">{step.count}</span>
                </div>
              </div>
              <div className="w-full h-3 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 transition-all duration-1000"
                  style={{ width: stats.total > 0 ? `${step.fromTop}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Big Five personality averages ─── */}
      {stats.bigFiveAverages.length > 0 && (
        <div className="md:col-span-6 p-8 rounded-[2.5rem] bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-8">
            Avg. Personality Profile
          </h3>
          <div className="space-y-3">
            {stats.bigFiveAverages.map(({ trait, average }) => (
              <div key={trait}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-300 capitalize">{trait}</span>
                  <span className="text-sm font-bold text-white">{average}%</span>
                </div>
                <div className="w-full bg-white/[0.08] rounded-full h-2.5">
                  <div
                    className={`${TRAIT_COLORS[trait] || 'bg-gray-500'} h-2.5 rounded-full transition-all duration-700`}
                    style={{ width: `${average}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Stage breakdown grid ─── */}
      <div className="md:col-span-6 p-8 rounded-[2.5rem] bg-surface-800/60 border border-white/[0.06] backdrop-blur-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">
          Stage Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.stageCounts).map(([stage, count]) => (
            <div
              key={stage}
              className="p-4 rounded-2xl bg-surface-900/60 border border-white/[0.06]"
            >
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stage}</p>
              <p className="text-2xl font-black text-white">{count}</p>
            </div>
          ))}
          {stats.timeToTaskDays != null && (
            <div className="p-4 rounded-2xl bg-surface-900/60 border border-white/[0.06] col-span-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Median Time to Task Sent
              </p>
              <p className="text-2xl font-black text-white">
                {stats.timeToTaskDays.toFixed(1)}d
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsView;
