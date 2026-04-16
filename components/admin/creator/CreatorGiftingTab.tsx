import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { type GiftingEntry, getBrandSlug, TIER_COLORS } from './types';

// ─── Creator Gifting Tab ─────────────────────────────────────────────────────

interface Props {
  brandFilter: string;
}

const STATUS_BADGE: Record<string, string> = {
  not_shipped: 'bg-slate-50 text-slate-700 border border-slate-200',
  awaiting_content: 'bg-amber-50 text-amber-700 border border-amber-200',
  content_received: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  overdue: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const fmt = (n: number | null | undefined) =>
  n != null ? n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '—';

const CreatorGiftingTab: React.FC<Props> = ({ brandFilter }) => {
  const [rows, setRows] = useState<GiftingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [shippingDateFor, setShippingDateFor] = useState<string | null>(null);
  const [shippingDate, setShippingDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('gifting_pipeline').select('*');
    if (brandFilter !== 'All') q = q.eq('brand_slug', getBrandSlug(brandFilter));
    const { data, error } = await q;
    if (error) {
      setActionMsg({ type: 'error', text: error.message });
    } else {
      setRows((data ?? []) as GiftingEntry[]);
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

  const displayed = statusFilter === 'all' ? rows : rows.filter((r) => r.gift_status === statusFilter);

  // Summary stats
  const summary = useMemo(() => {
    const total = displayed.length;
    const totalCost = displayed.reduce((s, r) => s + (r.cost_eur ?? 0), 0);
    const received = displayed.filter((r) => r.content_received).length;
    const receivedPct = total > 0 ? ((received / total) * 100).toFixed(0) : '0';
    return { total, totalCost, received, receivedPct };
  }, [displayed]);

  const markShipped = async (id: string) => {
    const { error } = await supabase
      .from('creator_gifts')
      .update({ shipped_date: shippingDate })
      .eq('id', id);
    if (error) {
      flash('error', error.message);
    } else {
      flash('success', 'Marked as shipped.');
      setShippingDateFor(null);
      fetchData();
    }
  };

  const markContentReceived = async (id: string) => {
    const { error } = await supabase
      .from('creator_gifts')
      .update({ content_received: true })
      .eq('id', id);
    if (error) {
      flash('error', error.message);
    } else {
      flash('success', 'Content marked as received.');
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm rounded-lg bg-white ring-1 ring-slate-200 text-slate-900 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All statuses</option>
          <option value="not_shipped">Not Shipped</option>
          <option value="awaiting_content">Awaiting Content</option>
          <option value="content_received">Content Received</option>
          <option value="overdue">Overdue</option>
        </select>
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
            <p className="text-sm">No gifting records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left bg-slate-50">
                  {['Creator', 'Tier', 'Brand', 'Gift Type', 'Description', 'Season', 'Shipped', 'Content Received', 'Cost', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-3 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.name}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[r.tier] ?? 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                        {r.tier}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{r.brand_slug}</td>
                    <td className="px-3 py-3 text-slate-700 capitalize">{r.gift_type}</td>
                    <td className="px-3 py-3 text-slate-600 max-w-[200px] truncate">{r.gift_description ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{r.season ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-600">{r.shipped_date ?? '—'}</td>
                    <td className="px-3 py-3">
                      {r.content_received ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Yes</span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">No</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-700 tabular-nums">{fmt(r.cost_eur)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.gift_status] ?? 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                        {r.gift_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {r.gift_status === 'not_shipped' && (
                        shippingDateFor === r.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={shippingDate}
                              onChange={(e) => setShippingDate(e.target.value)}
                              className="text-xs rounded bg-white ring-1 ring-slate-200 text-slate-900 px-2 py-1"
                            />
                            <button
                              onClick={() => markShipped(r.id)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShippingDateFor(null)}
                              className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setShippingDateFor(r.id); setShippingDate(new Date().toISOString().slice(0, 10)); }}
                            className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            Mark Shipped
                          </button>
                        )
                      )}
                      {r.gift_status === 'awaiting_content' && (
                        <button
                          onClick={() => markContentReceived(r.id)}
                          className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          Content Received
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary row */}
        {displayed.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-6 text-xs text-slate-500 bg-slate-50">
            <span>Total gifts: <span className="font-semibold text-slate-900">{summary.total}</span></span>
            <span>Total cost: <span className="font-semibold text-slate-900">{fmt(summary.totalCost)}</span></span>
            <span>Content received: <span className="font-semibold text-slate-900">{summary.receivedPct}%</span></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorGiftingTab;
