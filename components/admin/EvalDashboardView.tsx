// components/admin/EvalDashboardView.tsx
// Welle 1b Item 8 — Eval Dashboard
// Single-screen wall view for interview-prep: every application with aiScore,
// work_sample preview, notes count, stage, decision-timestamps, CV link.
// Per docs/welle/welle-1-plan.md §Welle 1b
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { trackOperationalMetric } from '@/lib/track-event';
import type { Application, ApplicationStage } from '@/types';
import Spinner from '@/components/ui/Spinner';

type SortKey = 'aiScore' | 'created_at' | 'stage';
type EvalApp = Application & { notes_count?: number };

interface Props {
  onSelectApplicant: (id: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-blue-500/15 text-blue-400',
  task_requested: 'bg-yellow-500/15 text-yellow-400',
  task_submitted: 'bg-emerald-500/15 text-emerald-400',
  interview: 'bg-orange-500/15 text-orange-400',
  hired: 'bg-violet-500/15 text-violet-400',
  onboarding: 'bg-teal-500/15 text-teal-400',
  rejected: 'bg-red-500/15 text-red-400',
};

const SCORE_COLOR = (score: number | null | undefined) => {
  if (score == null) return 'text-[#6e6e73]';
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

const SCORE_VERDICT = (score: number | null | undefined) => {
  if (score == null) return '—';
  if (score >= 100) return 'STRONG YES';
  if (score >= 75) return 'YES';
  if (score >= 50) return 'MAYBE';
  return 'NO';
};

const truncate = (s: string | null | undefined, n: number) =>
  !s ? '—' : s.length > n ? s.slice(0, n) + '…' : s;

const EvalDashboardView: React.FC<Props> = ({ onSelectApplicant }) => {
  const [apps, setApps] = useState<EvalApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<ApplicationStage | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('aiScore');

  useEffect(() => {
    void trackOperationalMetric('eval_dashboard_opened', 'hiring', {
      itemRef: 'welle_1b_item_8',
    });
    let cancelled = false;
    const fetchAll = async () => {
      setLoading(true);
      // Embedded count via Postgres relationship — `application_notes(count)`
      // returns one row per app with { count: N } in the array slot.
      const { data, error } = await supabase
        .from('applications')
        .select('*, application_notes(count)')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error('[eval-dashboard] fetch failed:', error.message);
        setApps([]);
      } else {
        const flattened: EvalApp[] = (data ?? []).map((row: Application & { application_notes?: { count: number }[] }) => ({
          ...row,
          notes_count: row.application_notes?.[0]?.count ?? 0,
        }));
        setApps(flattened);
      }
      setLoading(false);
    };
    void fetchAll();
    return () => { cancelled = true; };
  }, []);

  const filteredSorted = useMemo(() => {
    const filtered = stageFilter === 'all'
      ? apps
      : apps.filter((a) => a.stage === stageFilter);
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'aiScore') {
        return (b.aiScore ?? -1) - (a.aiScore ?? -1);
      }
      if (sortKey === 'created_at') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return (a.stage ?? '').localeCompare(b.stage ?? '');
    });
    return sorted;
  }, [apps, stageFilter, sortKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-10 h-10 text-primary-600" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="p-12 rounded-[2.5rem] bg-white/70 border border-black/[0.06] backdrop-blur-sm text-center">
        <p className="text-5xl mb-4">🗂️</p>
        <h3 className="text-xl font-bold text-[#1d1d1f] mb-2">No applications yet</h3>
        <p className="text-[#515154] max-w-md mx-auto">
          The Eval Dashboard collects every application in one scrollable wall once
          applicants come through the public form.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-3 items-center p-4 rounded-2xl bg-white/70 border border-black/[0.06] backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73]">Stage</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as ApplicationStage | 'all')}
            className="px-3 py-1.5 bg-black/[0.04] border border-white/10 rounded-lg text-xs text-[#1d1d1f]"
          >
            <option value="all">All</option>
            <option value="applied">Applied</option>
            <option value="task_requested">Task Requested</option>
            <option value="task_submitted">Task Submitted</option>
            <option value="interview">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73]">Sort</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-1.5 bg-black/[0.04] border border-white/10 rounded-lg text-xs text-[#1d1d1f]"
          >
            <option value="aiScore">AI Score (high → low)</option>
            <option value="created_at">Newest first</option>
            <option value="stage">Stage</option>
          </select>
        </div>
        <span className="ml-auto text-xs text-[#6e6e73]">
          {filteredSorted.length} of {apps.length}
        </span>
      </div>

      {/* ── Card grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSorted.map((app) => (
          <button
            key={app.id}
            onClick={() => onSelectApplicant(app.id)}
            className="text-left p-5 rounded-2xl bg-white/70 border border-black/[0.06] backdrop-blur-sm hover:border-primary-500/40 hover:bg-white/80/80 transition-all"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-black text-[#1d1d1f] truncate">{app.full_name}</h4>
                <p className="text-xs text-[#6e6e73] truncate">{app.email}</p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${STAGE_COLORS[app.stage ?? ''] ?? 'bg-slate-500/15 text-[#515154]'}`}>
                {(app.stage ?? 'unknown').replace('_', ' ')}
              </span>
            </div>

            {/* Score + verdict */}
            <div className="flex items-center gap-3 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73]">AI Score</p>
                <p className={`text-2xl font-black tracking-tight ${SCORE_COLOR(app.aiScore)}`}>
                  {app.aiScore != null ? Math.round(app.aiScore) : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73]">Verdict</p>
                <p className={`text-sm font-bold ${SCORE_COLOR(app.aiScore)}`}>{SCORE_VERDICT(app.aiScore)}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73]">Notes</p>
                <p className="text-sm font-bold text-[#1d1d1f]">{app.notes_count ?? 0}</p>
              </div>
            </div>

            {/* Work sample preview */}
            <div className="mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Work Sample</p>
              <p className="text-xs text-[#515154] leading-relaxed">
                {truncate(app.work_sample_text, 180)}
              </p>
            </div>

            {/* Footer pills */}
            <div className="flex flex-wrap gap-2 text-[10px] text-[#6e6e73]">
              <span className="px-2 py-0.5 rounded bg-black/[0.03] border border-black/[0.06]">
                Applied {new Date(app.created_at).toLocaleDateString()}
              </span>
              {app.task_sent_at && (
                <span className="px-2 py-0.5 rounded bg-black/[0.03] border border-black/[0.06]">
                  Task {new Date(app.task_sent_at).toLocaleDateString()}
                </span>
              )}
              {app.interview_at && (
                <span className="px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-300">
                  Interview {new Date(app.interview_at).toLocaleDateString()}
                </span>
              )}
              {app.decided_at && (
                <span className="px-2 py-0.5 rounded bg-black/[0.03] border border-black/[0.06]">
                  Decided {new Date(app.decided_at).toLocaleDateString()}
                </span>
              )}
              {app.cv_url && (
                <span className="px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 text-primary-300">
                  📄 CV
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default EvalDashboardView;
