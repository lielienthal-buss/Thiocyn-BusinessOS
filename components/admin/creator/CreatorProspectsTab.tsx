import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { type CreatorProspect, getBrandSlug } from './types';

// ─── Creator Prospects Tab ───────────────────────────────────────────────────

interface Props {
  brandFilter: string;
}

const CreatorProspectsTab: React.FC<Props> = ({ brandFilter }) => {
  const [prospects, setProspects] = useState<CreatorProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [qualifiedOnly, setQualifiedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('creator_prospects').select('*').order('qualification_score', { ascending: false });
    if (brandFilter !== 'All') q = q.eq('suggested_brand', getBrandSlug(brandFilter));
    const { data, error } = await q;
    if (error) {
      setActionMsg({ type: 'error', text: error.message });
    } else {
      setProspects((data ?? []) as CreatorProspect[]);
    }
    setLoading(false);
  }, [brandFilter]);

  useEffect(() => {
    fetchProspects();
  }, [fetchProspects]);

  const flash = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 3500);
  };

  const displayed = qualifiedOnly
    ? prospects.filter((p) => p.status === 'qualified' && p.qualification_score >= 12)
    : prospects;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === displayed.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayed.map((p) => p.id)));
    }
  };

  const bulkUpdate = async (status: string, extra?: Record<string, unknown>) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const { error } = await supabase
      .from('creator_prospects')
      .update({ status, ...extra })
      .in('id', ids);
    if (error) {
      flash('error', error.message);
    } else {
      flash('success', `${ids.length} prospect(s) updated to "${status}".`);
      setSelected(new Set());
      fetchProspects();
    }
  };

  const convertProspect = async (id: string) => {
    const { error } = await supabase.rpc('convert_prospect_to_creator', { p_prospect_id: id });
    if (error) {
      flash('error', error.message);
    } else {
      flash('success', 'Prospect converted to creator.');
      fetchProspects();
    }
  };

  const scoreBadge = (score: number) => {
    const cls =
      score >= 15
        ? 'bg-green-500/15 text-green-400'
        : score >= 12
          ? 'bg-yellow-500/15 text-yellow-400'
          : 'bg-red-500/15 text-red-400';
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>{score}</span>;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-400 select-none cursor-pointer">
          <input
            type="checkbox"
            checked={qualifiedOnly}
            onChange={() => setQualifiedOnly((v) => !v)}
            className="rounded border-white/20 bg-surface-700 text-primary-500 focus:ring-primary-500/30"
          />
          Qualified only
        </label>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500">{selected.size} selected</span>
            <button
              onClick={() => bulkUpdate('qualified', { qualified_at: new Date().toISOString() })}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
            >
              Qualify
            </button>
            <button
              onClick={() => bulkUpdate('rejected')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Flash message */}
      {actionMsg && (
        <div
          className={`text-xs font-medium px-4 py-2 rounded-lg ${
            actionMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl shadow-sm overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p className="text-sm">No prospects found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-left">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.size === displayed.length && displayed.length > 0}
                      onChange={toggleAll}
                      className="rounded border-white/20 bg-surface-700 text-primary-500 focus:ring-primary-500/30"
                    />
                  </th>
                  {['Handle', 'Name', 'Followers', 'Source', 'Brand', 'Score', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {displayed.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="rounded border-white/20 bg-surface-700 text-primary-500 focus:ring-primary-500/30"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">@{p.instagram_handle}</td>
                    <td className="px-4 py-3 text-slate-300">{p.display_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.follower_count != null ? p.follower_count.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 capitalize">{p.source}</td>
                    <td className="px-4 py-3 text-slate-400">{p.suggested_brand ?? '—'}</td>
                    <td className="px-4 py-3">{scoreBadge(p.qualification_score)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'qualified' && (
                        <button
                          onClick={() => convertProspect(p.id)}
                          className="text-xs font-semibold px-3 py-1 rounded-lg bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 transition-colors"
                        >
                          Convert
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

export default CreatorProspectsTab;
