import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { type CreatorCommission, getBrandSlug, TIER_COLORS } from './types';

// ─── Creator Commissions Tab ─────────────────────────────────────────────────

interface Props {
  brandFilter: string;
}

const fmt = (n: number | null | undefined) =>
  n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—';

const pct = (n: number | null | undefined) => (n != null ? n.toFixed(1) + '%' : '—');

const cacBadge = (v: number | null) => {
  if (v == null) return <span className="text-xs text-slate-500">—</span>;
  const cls = v <= 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : v <= 25 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-rose-50 text-rose-700 border border-rose-200';
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{v.toFixed(1)}%</span>;
};

const CreatorCommissionsTab: React.FC<Props> = ({ brandFilter }) => {
  const [rows, setRows] = useState<CreatorCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('monthly_commission_summary').select('*').order('period_start', { ascending: false });
    if (brandFilter !== 'All') q = q.eq('brand_slug', getBrandSlug(brandFilter));
    const { data, error } = await q;
    if (error) {
      setActionMsg({ type: 'error', text: error.message });
    } else {
      setRows((data ?? []) as CreatorCommission[]);
    }
    setLoading(false);
  }, [brandFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const flash = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  // Derive month options (last 3 unique periods)
  const monthOptions = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.period_start))].sort().reverse().slice(0, 3);
    return unique;
  }, [rows]);

  const displayed = selectedMonth === 'all' ? rows : rows.filter((r) => r.period_start === selectedMonth);

  // KPIs
  const totalCost = displayed.reduce((s, r) => s + (r.total_cost ?? 0), 0);
  const avgCac = displayed.length > 0
    ? displayed.reduce((s, r) => s + (r.total_cac_pct ?? 0), 0) / displayed.filter((r) => r.total_cac_pct != null).length
    : 0;
  const pendingCount = displayed.filter((r) => r.status === 'calculated').length;
  const paidCount = displayed.filter((r) => r.status === 'paid').length;

  const updateStatus = async (row: CreatorCommission, newStatus: string, extra?: Record<string, unknown>) => {
    const { error } = await supabase
      .from('creator_commissions')
      .update({ status: newStatus, ...extra })
      .eq('creator_id', row.creator_id)
      .eq('period_start', row.period_start)
      .eq('brand_slug', row.brand_slug);
    if (error) {
      flash('error', error.message);
    } else {
      flash('success', `Status updated to "${newStatus}".`);
      fetchData();
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  const kpis = [
    { label: 'Total Cost', value: fmt(totalCost), color: 'text-slate-900' },
    { label: 'Avg CAC%', value: pct(avgCac || null), color: avgCac <= 20 ? 'text-emerald-700' : avgCac <= 25 ? 'text-amber-700' : 'text-rose-700' },
    { label: 'Pending Approval', value: String(pendingCount), color: pendingCount > 0 ? 'text-amber-700' : 'text-emerald-700' },
    { label: 'Paid Out', value: String(paidCount), color: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-4">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm rounded-lg bg-white ring-1 ring-slate-200 text-slate-900 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All periods</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="p-4 rounded-2xl bg-white ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{k.label}</p>
            <p className={`text-lg font-semibold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Flash */}
      {actionMsg && (
        <div className={`text-xs font-medium px-4 py-2 rounded-lg ${actionMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-white ring-1 ring-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p className="text-sm">No commission records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left bg-slate-50">
                  {['Creator', 'Brand', 'Tier', 'Model', 'Revenue', 'Commission', 'Flat Fee', 'Retainer', 'Bonus', 'Total Cost', 'CAC%', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((r, i) => (
                  <tr key={`${r.creator_id}-${r.period_start}-${i}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.creator_name}</td>
                    <td className="px-3 py-3 text-slate-600">{r.brand_name}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[r.tier] ?? 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                        {r.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 capitalize">{r.compensation_model}</td>
                    <td className="px-3 py-3 text-slate-700 tabular-nums">{fmt(r.gross_revenue)}</td>
                    <td className="px-3 py-3 text-slate-700 tabular-nums">{fmt(r.commission_amount)}</td>
                    <td className="px-3 py-3 text-slate-600 tabular-nums">{fmt(r.flat_fee_total)}</td>
                    <td className="px-3 py-3 text-slate-600 tabular-nums">{fmt(r.retainer_amount)}</td>
                    <td className="px-3 py-3 text-slate-600 tabular-nums">{fmt(r.performance_bonus)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-900 tabular-nums">{fmt(r.total_cost)}</td>
                    <td className="px-3 py-3">{cacBadge(r.total_cac_pct)}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {r.status === 'calculated' && (
                        <button
                          onClick={() => updateStatus(r, 'approved', { approved_by: 'admin', approved_at: new Date().toISOString() })}
                          className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          onClick={() => updateStatus(r, 'paid')}
                          className="text-xs font-semibold px-3 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorCommissionsTab;
