import React, { useState } from 'react';
import {
  Creator,
  BRANDS,
  STATUSES,
  STATUS_COLORS,
  NEXT_STATUS,
  TIER_COLORS,
} from './types';

interface Props {
  creators: Creator[];
  filtered: Creator[];
  loading: boolean;
  error: string | null;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  bulkBrand: string;
  setBulkBrand: (v: string) => void;
  bulkFitScore: number | '';
  setBulkFitScore: (v: number | '') => void;
  bulkSaving: boolean;
  handleBulkTag: () => void;
  showUntaggedOnly: boolean;
  setShowUntaggedOnly: (v: boolean) => void;
  handleAdvanceStatus: (creator: Creator) => void;
  setSelectedIds: (v: Set<string>) => void;
}

const FIT_DOT: Record<number, string> = {
  1: 'bg-emerald-500',
  2: 'bg-amber-500',
  3: 'bg-rose-500',
};

const CreatorPipelineTab: React.FC<Props> = ({
  creators,
  filtered,
  loading,
  error,
  statusFilter,
  setStatusFilter,
  selectedIds,
  toggleSelect,
  toggleSelectAll,
  bulkBrand,
  setBulkBrand,
  bulkFitScore,
  setBulkFitScore,
  bulkSaving,
  handleBulkTag,
  showUntaggedOnly,
  setShowUntaggedOnly,
  handleAdvanceStatus,
  setSelectedIds,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <>
      {/* Filters + Bulk Tag Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm ring-1 ring-slate-200 bg-white text-slate-900 rounded-lg px-3 py-1.5"
          >
            <option>All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setShowUntaggedOnly(!showUntaggedOnly); setSelectedIds(new Set()); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition-colors ${
            showUntaggedOnly
              ? 'bg-amber-50 ring-amber-200 text-amber-700'
              : 'bg-white ring-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          Untagged ({creators.filter(c => !c.brand_slug).length})
        </button>
      </div>

      {/* Bulk Tag Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 ring-1 ring-indigo-200 rounded-xl p-3">
          <span className="text-sm font-semibold text-indigo-700">{selectedIds.size} selected</span>
          <select
            value={bulkBrand}
            onChange={e => setBulkBrand(e.target.value)}
            className="text-sm ring-1 ring-slate-200 bg-white text-slate-900 rounded-lg px-3 py-1.5"
          >
            <option value="">Select brand...</option>
            {BRANDS.filter(b => b !== 'All').map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={bulkFitScore}
            onChange={e => setBulkFitScore(e.target.value ? Number(e.target.value) : '')}
            className="text-sm ring-1 ring-slate-200 bg-white text-slate-900 rounded-lg px-3 py-1.5"
          >
            <option value="">Fit Score...</option>
            <option value="1">1 - Strong Fit</option>
            <option value="2">2 - Moderate</option>
            <option value="3">3 - Weak Fit</option>
          </select>
          <button
            onClick={handleBulkTag}
            disabled={!bulkBrand || bulkSaving}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {bulkSaving ? 'Saving...' : 'Tag'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-500 text-sm">Loading creators...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <span className="text-4xl mb-3">&#x1F933;</span>
          <p className="text-sm font-medium">No creators found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Name</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Instagram</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Brand</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Slug</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Tier</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Affiliate Code</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Sales</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => (
                <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(c.id) ? 'bg-indigo-50' : ''}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500" />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                  <td className="px-4 py-3">
                    {c.instagram_url ? (
                      <a href={c.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="text-indigo-700 hover:text-indigo-900 hover:underline truncate max-w-[160px] block">
                        {c.instagram_url.replace('https://www.instagram.com/', '@').replace(/\/$/, '')}
                      </a>
                    ) : <span className="text-slate-500">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-700">{c.brand}</span>
                      {c.brand_fit_score != null && FIT_DOT[c.brand_fit_score] && (
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${FIT_DOT[c.brand_fit_score]}`}
                          title={`Fit Score: ${c.brand_fit_score}`}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.brand_slug ? (
                      <span className="text-xs font-mono text-emerald-700">{c.brand_slug}</span>
                    ) : (
                      <span className="text-xs font-mono text-amber-700">untagged</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[c.status] ?? 'bg-slate-50 text-slate-700 border border-slate-200'}`}>
                      {c.status}
                    </span>
                    {c.onboarding_status && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{c.onboarding_status}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_COLORS[c.tier ?? 'gifting']}`}>
                      {c.tier ?? 'gifting'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.affiliate_code ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-slate-700">{c.affiliate_code}</span>
                        <button
                          onClick={() => copyToClipboard(c.affiliate_code!, c.id)}
                          className="text-slate-500 hover:text-slate-900 transition-colors"
                          title="Copy to clipboard"
                        >
                          {copiedId === c.id ? (
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{c.total_sales ?? 0}</td>
                  <td className="px-4 py-3">
                    {c.status !== 'Active' && (
                      <button onClick={() => handleAdvanceStatus(c)}
                        className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold transition-colors">
                        &rarr; {NEXT_STATUS[c.status]}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default CreatorPipelineTab;
