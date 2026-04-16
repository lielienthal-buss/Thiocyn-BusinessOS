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
    <div className="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">#</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Creator</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Brand</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Grade</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Tier</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Delivery %</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Top Videos</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Sales (4w)</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Total Sales</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredScoreboard.map(s => (
            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 text-slate-500 text-xs">#{s.rank}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">{s.brand_slug}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${GRADE_COLORS[s.creator_grade] ?? ''}`}>
                  {s.creator_grade}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[s.tier] ?? ''}`}>
                  {s.tier}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-700">{s.avg_delivery_rate_4w}%</td>
              <td className="px-4 py-3 text-right text-slate-700">{s.top_videos_4w}</td>
              <td className="px-4 py-3 text-right text-amber-700">{s.sales_4w}</td>
              <td className="px-4 py-3 text-right text-slate-600">{s.total_sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CreatorPerformanceTab;
