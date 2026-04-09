import React, { useMemo } from 'react';
import {
  CreatorScoreboard,
  GRADE_COLORS,
  TIER_COLORS,
  getBrandSlug,
} from './types';

interface Props {
  scoreboard: CreatorScoreboard[];
  brandFilter: string;
}

const CreatorPerformanceTab: React.FC<Props> = ({ scoreboard, brandFilter }) => {
  const filteredScoreboard = useMemo(() => {
    if (brandFilter === 'All') return scoreboard;
    return scoreboard.filter(s => s.brand_slug === getBrandSlug(brandFilter));
  }, [scoreboard, brandFilter]);

  if (filteredScoreboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <span className="text-4xl mb-3">&#x1F4CA;</span>
        <p className="text-sm font-medium">No performance data yet. Data is aggregated automatically after the first tasks.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-900/60 border-b border-white/[0.06]">
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">#</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Creator</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Brand</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Grade</th>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Tier</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Delivery %</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Top Videos</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Sales (4w)</th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Total Sales</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {filteredScoreboard.map(s => (
            <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
              <td className="px-4 py-3 text-slate-500 text-xs">#{s.rank}</td>
              <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
              <td className="px-4 py-3 text-slate-400 text-xs">{s.brand_slug}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${GRADE_COLORS[s.creator_grade] ?? ''}`}>
                  {s.creator_grade}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${TIER_COLORS[s.tier] ?? ''}`}>
                  {s.tier}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-300">{s.avg_delivery_rate_4w}%</td>
              <td className="px-4 py-3 text-right text-slate-300">{s.top_videos_4w}</td>
              <td className="px-4 py-3 text-right text-amber-400">{s.sales_4w}</td>
              <td className="px-4 py-3 text-right text-slate-400">{s.total_sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CreatorPerformanceTab;
