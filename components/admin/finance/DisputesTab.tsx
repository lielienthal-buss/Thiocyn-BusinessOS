import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  BRANDS,
  PLATFORMS,
  CURRENCIES,
  DISPUTE_STATUSES,
  DISPUTE_STATUS_STYLES,
  type Brand,
  type Platform,
  type Currency,
  type DisputeStatus,
  type Dispute,
} from './financeTypes';
import { daysUntil, deadlineColor, deadlineBg, formatDate, formatAmount } from './financeHelpers';
import { StatusBadge, EmptyState, SummaryBar } from './StatusBadge';

// ─── Disputes Tab ─────────────────────────────────────────────────────────────

const DEFAULT_DISPUTE_FORM = {
  brand: BRANDS[0] as Brand,
  case_id: '',
  platform: PLATFORMS[0] as Platform,
  amount: '',
  currency: 'EUR' as Currency,
  deadline: '',
  notes: '',
};

function DisputesTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_DISPUTE_FORM);
  const [editForm, setEditForm] = useState<Partial<Dispute>>({});
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setDisputes(data as Dispute[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'escalated');
  const totalAtRisk = openDisputes.reduce((acc, d) => acc + (d.amount || 0), 0);
  // Simplistic EUR sum (mixed currencies shown as-is in summary label)
  const atRiskLabel = openDisputes.length > 0
    ? openDisputes
        .reduce((groups: Record<Currency, number>, d) => {
          groups[d.currency] = (groups[d.currency] ?? 0) + d.amount;
          return groups;
        }, {} as Record<Currency, number>)
    : null;
  const atRiskStr = atRiskLabel
    ? Object.entries(atRiskLabel)
        .map(([cur, val]) => formatAmount(val as number, cur as Currency))
        .join(' + ')
    : '—';

  const handleAdd = async () => {
    if (!form.case_id.trim() || !form.amount) {
      setError('Case ID and amount are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from('disputes').insert({
      brand: form.brand,
      case_id: form.case_id.trim(),
      platform: form.platform,
      amount: parseFloat(form.amount),
      currency: form.currency,
      deadline: form.deadline || null,
      status: 'open',
      notes: form.notes || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setForm(DEFAULT_DISPUTE_FORM);
      setShowAddForm(false);
      await fetch();
    }
    setSubmitting(false);
  };

  const handleMarkResolved = async (id: string) => {
    await supabase.from('disputes').update({ status: 'resolved' }).eq('id', id);
    await fetch();
  };

  const handleEditSave = async (id: string) => {
    const payload: Partial<Dispute> = { ...editForm };
    if (payload.amount !== undefined) payload.amount = parseFloat(String(payload.amount));
    await supabase.from('disputes').update(payload).eq('id', id);
    setEditingId(null);
    setEditForm({});
    await fetch();
  };

  const startEdit = (d: Dispute) => {
    setEditingId(d.id);
    setEditForm({
      brand: d.brand,
      case_id: d.case_id,
      platform: d.platform,
      amount: d.amount,
      currency: d.currency,
      deadline: d.deadline ?? '',
      status: d.status,
      notes: d.notes ?? '',
    });
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <SummaryBar
        items={[
          { label: 'Open disputes', value: String(openDisputes.length), color: openDisputes.length > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Total at risk', value: atRiskStr, color: 'text-orange-600' },
          { label: 'Total disputes', value: String(disputes.length) },
        ]}
      />

      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Dispute
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-100">New Dispute</h3>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Brand</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value as Brand }))}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Case ID *</label>
              <input
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="PP-12345-XXXXX"
                value={form.case_id}
                onChange={(e) => setForm((f) => ({ ...f, case_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Platform</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Platform }))}
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Deadline</label>
              <input
                type="date"
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-slate-300 font-medium hover:bg-white/[0.06] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Dispute'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState message="No disputes recorded." />
      ) : (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-surface-900/60">
                  {['Brand', 'Case ID', 'Platform', 'Amount', 'Deadline', 'Status', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {disputes.map((d) => {
                  const isEditing = editingId === d.id;
                  const isResolved = d.status === 'resolved' || d.status === 'won' || d.status === 'lost';
                  return (
                    <React.Fragment key={d.id}>
                      <tr
                        className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${deadlineBg(d.deadline, isResolved)}`}
                        onClick={() => !isEditing && startEdit(d)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-100 capitalize whitespace-nowrap">{d.brand}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono text-xs whitespace-nowrap">{d.case_id}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{d.platform}</td>
                        <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">{formatAmount(d.amount, d.currency)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap ${deadlineColor(d.deadline, isResolved)}`}>
                          {formatDate(d.deadline)}
                          {!isResolved && daysUntil(d.deadline) !== null && (
                            <span className="ml-1 text-xs opacity-70">
                              ({daysUntil(d.deadline)}d)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={d.status} styles={DISPUTE_STATUS_STYLES} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px] truncate">{d.notes ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {!isResolved && (
                            <button
                              onClick={() => handleMarkResolved(d.id)}
                              className="text-xs text-green-600 font-semibold hover:text-green-700 hover:underline"
                            >
                              Resolve
                            </button>
                          )}
                        </td>
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-blue-500/10 border-t border-blue-500/20">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Brand</label>
                                <select
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.brand ?? d.brand}
                                  onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value as Brand }))}
                                >
                                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Case ID</label>
                                <input
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.case_id ?? d.case_id}
                                  onChange={(e) => setEditForm((f) => ({ ...f, case_id: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                                <select
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.status ?? d.status}
                                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as DisputeStatus }))}
                                >
                                  {DISPUTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Amount</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.amount ?? d.amount}
                                  onChange={(e) => setEditForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Platform</label>
                                <select
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.platform ?? d.platform}
                                  onChange={(e) => setEditForm((f) => ({ ...f, platform: e.target.value as Platform }))}
                                >
                                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                                <select
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.currency ?? d.currency}
                                  onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value as Currency }))}
                                >
                                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Deadline</label>
                                <input
                                  type="date"
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.deadline ?? d.deadline ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                                <input
                                  className="w-full border border-white/[0.06] rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.notes ?? d.notes ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 justify-end">
                              <button
                                onClick={() => { setEditingId(null); setEditForm({}); }}
                                className="px-3 py-1.5 text-xs text-slate-300 font-medium hover:bg-white/[0.06] rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditSave(d.id)}
                                className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                              >
                                Save Changes
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputesTab;
