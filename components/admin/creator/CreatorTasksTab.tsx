import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  CreatorTask,
  TASK_STATUS_COLORS,
  DIRECTION_LABELS,
  TIER_COLORS,
  getBrandSlug,
} from './types';

interface Props {
  tasks: CreatorTask[];
  brandFilter: string;
  actionLoading: string | null;
  setActionLoading: (v: string | null) => void;
  actionResult: string | null;
  setActionResult: (v: string | null) => void;
}

/** Tiers that allow paid ad usage */
const PAID_TIERS = new Set(['influencer', 'ambassador']);

const CreatorTasksTab: React.FC<Props> = ({
  tasks,
  brandFilter,
  actionLoading,
  setActionLoading,
  actionResult,
  setActionResult,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [localTasks, setLocalTasks] = useState<CreatorTask[]>([]);

  // Merge local overrides into tasks
  const mergedTasks = useMemo(() => {
    const overrides = new Map(localTasks.map(t => [t.id, t]));
    return tasks.map(t => overrides.get(t.id) ?? t);
  }, [tasks, localTasks]);

  const filteredTasks = useMemo(() => {
    if (brandFilter === 'All') return mergedTasks;
    return mergedTasks.filter(t => t.brand_slug === getBrandSlug(brandFilter));
  }, [mergedTasks, brandFilter]);

  const handleReject = async (task: CreatorTask) => {
    if (!rejectionReason.trim()) return;
    setRejectSaving(true);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 5);
    const { error } = await supabase
      .from('creator_tasks')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
        resubmission_deadline: deadline.toISOString().split('T')[0],
      })
      .eq('id', task.id);
    setRejectSaving(false);
    if (error) {
      setActionResult(`Reject Error: ${error.message}`);
    } else {
      setLocalTasks(prev => [
        ...prev.filter(t => t.id !== task.id),
        {
          ...task,
          status: 'rejected',
          rejection_reason: rejectionReason.trim(),
          resubmission_deadline: deadline.toISOString().split('T')[0],
        },
      ]);
      setRejectingId(null);
      setRejectionReason('');
    }
  };

  const handleRating = async (task: CreatorTask, rating: number) => {
    const { error } = await supabase
      .from('creator_tasks')
      .update({ quality_rating: rating })
      .eq('id', task.id);
    if (error) {
      setActionResult(`Rating Error: ${error.message}`);
    } else {
      setLocalTasks(prev => [
        ...prev.filter(t => t.id !== task.id),
        { ...task, quality_rating: rating },
      ]);
    }
  };

  if (filteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <span className="text-4xl mb-3">&#x1F4CB;</span>
        <p className="text-sm font-medium">No tasks available. Distribute content directions on Mondays.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-900/60 border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Creator</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">KW</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Direction</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Angle</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Rating</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Repost</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Ads</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {filteredTasks.map(t => (
            <React.Fragment key={t.id}>
              <tr className="hover:bg-white/[0.03] transition-colors">
                <td className="px-4 py-3 font-semibold text-white">{t.creator_name ?? '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">KW{t.week_number}/{t.year}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{DIRECTION_LABELS[t.content_direction] ?? t.content_direction}</td>
                <td className="px-4 py-3 font-mono text-amber-400 text-xs">{t.angle_code ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${TASK_STATUS_COLORS[t.status] ?? ''}`}>
                    {t.status}
                  </span>
                  {t.status === 'rejected' && t.rejection_reason && (
                    <div className="text-[10px] text-red-400/80 mt-0.5 max-w-[160px] truncate" title={t.rejection_reason}>
                      {t.rejection_reason}
                    </div>
                  )}
                  {t.status === 'rejected' && t.resubmission_deadline && (
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Resubmit by {t.resubmission_deadline}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex gap-0.5 cursor-pointer">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => handleRating(t, n)}
                        className={`text-base transition-colors ${
                          n <= (t.quality_rating ?? 0)
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={`Rate ${n}/5`}
                      >
                        {n <= (t.quality_rating ?? 0) ? '\u2605' : '\u2606'}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.repost_worthy ? <span className="text-green-400 font-bold">&#10003;</span> : '—'}
                </td>
                <td className="px-4 py-3 text-xs">
                  {t.repost_worthy && t.submission_url && (
                    <div className="relative group inline-block">
                      <button
                        onClick={async () => {
                          setActionLoading('push-ads-' + t.id);
                          const { data, error } = await supabase.rpc('push_creator_content_to_ads', { p_task_id: t.id });
                          setActionLoading(null);
                          if (error) setActionResult(`Push Error: ${error.message}`);
                          else setActionResult(`Asset created: ${data}`);
                        }}
                        disabled={actionLoading === 'push-ads-' + t.id}
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition-colors disabled:opacity-50"
                      >
                        {actionLoading === 'push-ads-' + t.id ? '...' : 'Push to Ads'}
                      </button>
                      {/* Tooltip for non-paid tiers — we check creator tier indirectly via task context */}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {(t.status === 'submitted' || t.status === 'feedback_given') && rejectingId !== t.id && (
                    <button
                      onClick={() => { setRejectingId(t.id); setRejectionReason(''); }}
                      className="px-2 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded text-[10px] font-bold transition-colors"
                    >
                      Reject
                    </button>
                  )}
                </td>
              </tr>
              {/* Inline rejection form */}
              {rejectingId === t.id && (
                <tr className="bg-red-500/5">
                  <td colSpan={9} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Rejection reason (required)..."
                        className="flex-1 px-3 py-2 border border-red-500/20 bg-surface-900/60 text-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-red-500/30 focus:border-red-400 outline-none resize-none"
                        rows={2}
                      />
                      <button
                        onClick={() => handleReject(t)}
                        disabled={!rejectionReason.trim() || rejectSaving}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {rejectSaving ? '...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CreatorTasksTab;
