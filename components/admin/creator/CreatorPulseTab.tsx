import React, { useMemo } from 'react';
import {
  WeeklyPulse,
  GRADE_COLORS,
  getBrandSlug,
} from './types';

interface Props {
  pulse: WeeklyPulse[];
  brandFilter: string;
  loading: boolean;
}

const CreatorPulseTab: React.FC<Props> = ({ pulse, brandFilter, loading }) => {
  const filteredPulse = useMemo(() => {
    if (brandFilter === 'All') return pulse;
    return pulse.filter(p => p.brand_slug === getBrandSlug(brandFilter));
  }, [pulse, brandFilter]);

  if (loading) {
    return <div className="flex justify-center py-20 text-slate-500 text-sm">Loading Weekly Pulse...</div>;
  }

  if (filteredPulse.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <span className="text-4xl mb-3">&#128200;</span>
        <p className="text-sm font-medium">No pulse data yet. Distribute tasks and run a snapshot first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Tasks Total', value: filteredPulse.reduce((s, p) => s + p.tasks_total, 0), color: 'text-white' },
          { label: 'Delivered', value: filteredPulse.reduce((s, p) => s + p.tasks_delivered, 0), color: 'text-green-400' },
          { label: 'Pending', value: filteredPulse.reduce((s, p) => s + p.tasks_pending, 0), color: 'text-amber-400' },
          { label: 'Overdue', value: filteredPulse.reduce((s, p) => s + p.tasks_overdue, 0), color: 'text-red-400' },
          { label: 'Tier Upgrades', value: filteredPulse.reduce((s, p) => s + p.tier_upgrades_this_week, 0), color: 'text-violet-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Per-Brand Cards */}
      <div className="grid gap-4">
        {filteredPulse.filter(p => p.tasks_total > 0 || (brandFilter !== 'All')).map(p => (
          <div key={p.brand_slug} className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold">{p.brand_name}</h3>
              <div className="flex gap-3 text-xs">
                <span className="text-slate-400">{p.tasks_total} Tasks</span>
                {p.tier_upgrades_this_week > 0 && (
                  <span className="text-violet-400 font-bold">{p.tier_upgrades_this_week} Tier-Up</span>
                )}
                {p.repost_worthy > 0 && (
                  <span className="text-green-400 font-bold">{p.repost_worthy} Repost-worthy</span>
                )}
              </div>
            </div>

            {/* Delivery bar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-3 rounded-full overflow-hidden bg-surface-900/60">
                <div
                  className={`h-full rounded-full transition-all ${
                    p.delivery_rate >= 80 ? 'bg-green-500' :
                    p.delivery_rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(p.delivery_rate, 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-white w-14 text-right">{p.delivery_rate}%</span>
            </div>

            {/* Stats row */}
            <div className="flex gap-4 text-xs text-slate-500 mb-3">
              <span>Delivered: <span className="text-green-400 font-bold">{p.tasks_delivered}</span></span>
              <span>Pending: <span className="text-amber-400 font-bold">{p.tasks_pending}</span></span>
              <span>Overdue: <span className="text-red-400 font-bold">{p.tasks_overdue}</span></span>
              {p.avg_quality && (
                <span>Avg Quality: <span className="text-white font-bold">{p.avg_quality}/5</span></span>
              )}
            </div>

            {/* Top 5 Creators */}
            {p.top_5_names && p.top_5_names.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Top 5:</span>
                {p.top_5_names.map((name, i) => (
                  <span key={name} className="inline-flex items-center gap-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black ${
                      GRADE_COLORS[p.top_5_grades?.[i] ?? 'C'] ?? ''
                    }`}>
                      {p.top_5_grades?.[i]}
                    </span>
                    <span className="text-slate-300">{name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatorPulseTab;
