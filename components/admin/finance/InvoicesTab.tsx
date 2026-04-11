import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ENTITIES,
  CURRENCIES,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_STYLES,
  type Entity,
  type Currency,
  type PipelineStatus,
  type PipelineItem,
} from './financeTypes';
import { daysUntil, deadlineColor, deadlineBg, formatDate, formatAmount } from './financeHelpers';
import { EmptyState, SummaryBar } from './StatusBadge';

// ─── Invoices & Mahnungen Tab ─────────────────────────────────────────────────
// Reads + writes the canonical `finance_pipeline` table (manual entry layer).
// Mahnstufen-Tracking + Cash-Optimizer kommen in Welle 2 als separate Schicht.

const ENTITY_LABELS: Record<Entity, string> = {
  'thiocyn': 'Thiocyn',
  'hart-limes': 'Hart Limes',
  'paigh': 'Paigh',
  'dr-severin': 'Dr. Severin',
  'take-a-shot': 'Take A Shot',
  'wristr': 'Wristr',
  'timber-john': 'Timber & John',
};

const STATUS_LABELS: Record<PipelineStatus, string> = {
  offen: 'Offen',
  bezahlt: 'Bezahlt',
  beleg_fehlt: 'Beleg fehlt',
  erledigt: 'Erledigt',
  ueberfaellig: 'Überfällig',
};

const DEFAULT_FORM = {
  entity: ENTITIES[0] as Entity,
  vendor: '',
  amount: '',
  currency: 'EUR' as Currency,
  due_date: '',
  status: 'offen' as PipelineStatus,
  notes: '',
};

function InvoicesTab() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | 'all'>('all');
  const [filterEntity, setFilterEntity] = useState<Entity | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_pipeline')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (!error && data) setItems(data as PipelineItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (filterEntity !== 'all' && item.entity !== filterEntity) return false;
    return true;
  });

  const outstanding = items.filter((item) => item.paid_at === null);
  const overdueOnly = items.filter((item) => item.status === 'ueberfaellig');

  const sumByCurrency = (list: PipelineItem[]) =>
    list.reduce((groups: Record<string, number>, item) => {
      groups[item.currency] = (groups[item.currency] ?? 0) + item.amount;
      return groups;
    }, {});

  const fmtSum = (list: PipelineItem[]) => {
    const groups = sumByCurrency(list);
    const entries = Object.entries(groups);
    if (entries.length === 0) return '—';
    return entries.map(([cur, val]) => formatAmount(val, cur as Currency)).join(' + ');
  };

  const handleAdd = async () => {
    if (!form.vendor.trim() || !form.amount) {
      setError('Lieferant und Betrag sind Pflicht.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from('finance_pipeline').insert({
      entity: form.entity,
      vendor: form.vendor.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      due_date: form.due_date || null,
      status: form.status,
      notes: form.notes || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setForm(DEFAULT_FORM);
      setShowAddForm(false);
      await load();
    }
    setSubmitting(false);
  };

  const handleMarkPaid = async (id: string) => {
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from('finance_pipeline')
      .update({ status: 'bezahlt', paid_at: today })
      .eq('id', id);
    await load();
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <SummaryBar
        items={[
          { label: 'Offen', value: fmtSum(outstanding), color: outstanding.length > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: 'Überfällig', value: fmtSum(overdueOnly), color: overdueOnly.length > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Gesamt', value: String(items.length) },
        ]}
      />

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <select
            className="border border-white/[0.06] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PipelineStatus | 'all')}
          >
            <option value="all">Alle Status</option>
            {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select
            className="border border-white/[0.06] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value as Entity | 'all')}
          >
            <option value="all">Alle Firmen</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Rechnung hinzufügen
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Neue Rechnung</h3>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Firma</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.entity}
                onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value as Entity }))}
              >
                {ENTITIES.map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Lieferant *</label>
              <input
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="z.B. Shopify, Meta"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Betrag *</label>
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Währung</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PipelineStatus }))}
              >
                {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Fällig am</label>
              <input
                type="date"
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notizen</label>
            <textarea
              rows={2}
              className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Optionale Notizen..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-slate-300 font-medium hover:bg-white/[0.06] rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Speichere…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message="Keine Rechnungen für diese Filter." />
      ) : (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-surface-900/60">
                  {['Firma', 'Lieferant', 'Betrag', 'Eingang', 'Fällig am', 'Status', 'Notizen', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((item) => {
                  const isPaid = item.status === 'bezahlt' || item.status === 'erledigt';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.03] transition-colors ${deadlineBg(item.due_date, isPaid)}`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-100 whitespace-nowrap">
                        {ENTITY_LABELS[item.entity] ?? item.entity}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{item.vendor}</td>
                      <td className="px-4 py-3 font-semibold text-slate-100 whitespace-nowrap">
                        {formatAmount(item.amount, item.currency)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(item.received_at)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${deadlineColor(item.due_date, isPaid)}`}>
                        {formatDate(item.due_date)}
                        {!isPaid && daysUntil(item.due_date) !== null && (
                          <span className="ml-1 text-xs opacity-70">({daysUntil(item.due_date)}d)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            PIPELINE_STATUS_STYLES[item.status] ?? 'bg-slate-500/15 text-slate-400'
                          }`}
                        >
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{item.notes ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!isPaid && (
                          <button
                            onClick={() => handleMarkPaid(item.id)}
                            className="text-xs text-green-600 font-semibold hover:text-green-700 hover:underline"
                          >
                            Bezahlt markieren
                          </button>
                        )}
                      </td>
                    </tr>
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

export default InvoicesTab;
