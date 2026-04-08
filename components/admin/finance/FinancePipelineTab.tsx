import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ENTITIES,
  CURRENCIES,
  PAYMENT_METHODS,
  PIPELINE_STATUSES,
  PIPELINE_STATUS_STYLES,
  type Entity,
  type Currency,
  type PaymentMethod,
  type PipelineStatus,
  type PipelineItem,
} from './financeTypes';
import { formatDate, formatAmount, daysUntil } from './financeHelpers';
import { StatusBadge, EmptyState, SummaryBar } from './StatusBadge';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<Entity, string> = {
  'thiocyn': 'Thiocyn',
  'hart-limes': 'Hart Limes',
  'paigh': 'Paigh',
  'dr-severin': 'Dr. Severin',
  'take-a-shot': 'Take A Shot',
  'wristr': 'Wristr',
  'timber-john': 'Timber & John',
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  qonto: 'Qonto',
  paypal: 'PayPal',
  kreditkarte: 'Kreditkarte',
  wise: 'Wise',
  lastschrift: 'Lastschrift',
  bar: 'Bar',
  other: 'Sonstige',
};

const STATUS_LABELS: Record<PipelineStatus, string> = {
  offen: 'Offen',
  bezahlt: 'Bezahlt',
  beleg_fehlt: 'Beleg fehlt',
  erledigt: 'Erledigt',
  ueberfaellig: 'Überfällig',
};

function exportCSV(items: PipelineItem[]) {
  const headers = [
    'Lieferant', 'Rechnungsnr', 'Betrag', 'Währung', 'Firma',
    'Zahlungsweg', 'Fällig am', 'Eingang GMI', 'Bezahlt am',
    'Beleg zugeordnet', 'DATEV exportiert', 'Status', 'Notizen',
  ];
  const rows = items.map((i) => [
    i.vendor,
    i.invoice_number ?? '',
    i.amount.toFixed(2).replace('.', ','),
    i.currency,
    ENTITY_LABELS[i.entity] ?? i.entity,
    i.payment_method ? PAYMENT_LABELS[i.payment_method] : '',
    i.due_date ?? '',
    i.received_at ?? '',
    i.paid_at ?? '',
    i.receipt_attached ? 'Ja' : 'Nein',
    i.datev_exported ? 'Ja' : 'Nein',
    STATUS_LABELS[i.status] ?? i.status,
    (i.notes ?? '').replace(/[\n\r]+/g, ' '),
  ]);

  const bom = '\uFEFF';
  const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Default form ────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  vendor: '',
  invoice_number: '',
  amount: '',
  currency: 'EUR' as Currency,
  entity: 'thiocyn' as Entity,
  payment_method: '' as string,
  due_date: '',
  notes: '',
  received_at: new Date().toISOString().slice(0, 10),
  paid_at: '',
  receipt_attached: false,
  datev_exported: false,
};

// ─── Component ───────────────────────────────────────────────────────────────

function FinancePipelineTab() {
  const [items, setItems] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | 'all'>('all');
  const [filterEntity, setFilterEntity] = useState<Entity | 'all'>('all');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_pipeline')
      .select('*')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (!error && data) setItems(data as PipelineItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Filtered list
  const filtered = items.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterEntity !== 'all' && i.entity !== filterEntity) return false;
    return true;
  });

  // Summary stats
  const offen = items.filter((i) => i.status === 'offen' || i.status === 'ueberfaellig');
  const belegFehlt = items.filter((i) => i.status === 'beleg_fehlt');
  const erledigt = items.filter((i) => i.status === 'erledigt');

  const sumEUR = (arr: PipelineItem[]) =>
    arr.filter((i) => i.currency === 'EUR').reduce((s, i) => s + i.amount, 0);
  const sumUSD = (arr: PipelineItem[]) =>
    arr.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.amount, 0);

  const fmtSum = (arr: PipelineItem[]) => {
    const parts: string[] = [];
    const eur = sumEUR(arr);
    const usd = sumUSD(arr);
    if (eur > 0) parts.push(formatAmount(eur, 'EUR'));
    if (usd > 0) parts.push(formatAmount(usd, 'USD'));
    return parts.length > 0 ? parts.join(' + ') : '0,00 €';
  };

  // Add handler
  const handleAdd = async () => {
    if (!form.vendor.trim() || !form.amount) {
      setError('Lieferant und Betrag sind Pflichtfelder.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from('finance_pipeline').insert({
      vendor: form.vendor.trim(),
      invoice_number: form.invoice_number.trim() || null,
      amount: parseFloat(form.amount),
      currency: form.currency,
      entity: form.entity,
      payment_method: form.payment_method || null,
      due_date: form.due_date || null,
      notes: form.notes.trim() || null,
      received_at: form.received_at || null,
      paid_at: form.paid_at || null,
      receipt_attached: form.receipt_attached,
      datev_exported: form.datev_exported,
    });
    if (error) {
      setError(error.message);
    } else {
      setForm(DEFAULT_FORM);
      setShowAddForm(false);
      await fetchItems();
    }
    setSubmitting(false);
  };

  // Inline toggle for checkpoints
  const toggleField = async (id: string, field: 'receipt_attached' | 'datev_exported', current: boolean) => {
    await supabase.from('finance_pipeline').update({ [field]: !current }).eq('id', id);
    await fetchItems();
  };

  const setDate = async (id: string, field: 'received_at' | 'paid_at', value: string | null) => {
    await supabase.from('finance_pipeline').update({ [field]: value || null }).eq('id', id);
    await fetchItems();
  };

  // Quick mark paid
  const markPaid = async (id: string) => {
    await supabase.from('finance_pipeline').update({ paid_at: new Date().toISOString().slice(0, 10) }).eq('id', id);
    await fetchItems();
  };

  // Inline status change (with rollback)
  const updateStatus = async (id: string, status: PipelineStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    const { error } = await supabase.from('finance_pipeline').update({ status }).eq('id', id);
    if (error) fetchItems();
  };

  // Inline notes edit (with rollback)
  const updateNotes = async (id: string, notes: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, notes: notes || null } : i));
    const { error } = await supabase.from('finance_pipeline').update({ notes: notes || null }).eq('id', id);
    if (error) fetchItems();
  };

  // Delete (with rollback)
  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase.from('finance_pipeline').delete().eq('id', id);
    if (error) fetchItems();
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <SummaryBar
        items={[
          { label: 'Offen', value: `${offen.length} (${fmtSum(offen)})`, color: offen.length > 0 ? 'text-amber-400' : 'text-green-400' },
          { label: 'Beleg fehlt', value: String(belegFehlt.length), color: belegFehlt.length > 0 ? 'text-orange-400' : 'text-green-400' },
          { label: 'Erledigt', value: String(erledigt.length), color: 'text-green-400' },
          { label: 'Gesamt', value: String(items.length), color: 'text-white' },
        ]}
      />

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <select
            className="bg-surface-800 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PipelineStatus | 'all')}
          >
            <option value="all">Alle Status</option>
            {PIPELINE_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select
            className="bg-surface-800 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value as Entity | 'all')}
          >
            <option value="all">Alle Firmen</option>
            {ENTITIES.map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-800 border border-white/[0.06] text-slate-300 text-sm font-semibold rounded-xl hover:bg-white/[0.06] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV Export
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-semibold rounded-xl hover:bg-amber-500/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Rechnung hinzufugen
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Neue Rechnung erfassen</h3>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Lieferant *</label>
              <input
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="z.B. Klaviyo, Meta"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Rechnungsnr.</label>
              <input
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="INV-2026-04"
                value={form.invoice_number}
                onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Betrag *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Wahrung</label>
              <select
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Firma</label>
              <select
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                value={form.entity}
                onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value as Entity }))}
              >
                {ENTITIES.map((e) => <option key={e} value={e}>{ENTITY_LABELS[e]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Zahlungsweg</label>
              <select
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                value={form.payment_method}
                onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              >
                <option value="">-- auswahlen --</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Fallig am</label>
              <input
                type="date"
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Eingang (GMI)</label>
              <input
                type="date"
                className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                value={form.received_at}
                onChange={(e) => setForm((f) => ({ ...f, received_at: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notizen</label>
            <textarea
              rows={2}
              className="w-full bg-surface-900 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
              placeholder="Optional..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-slate-400 font-medium hover:bg-white/[0.06] rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState message="Keine Rechnungen gefunden." />
      ) : (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-surface-900/60">
                  {['Firma', 'Lieferant', 'Rechnungsnr.', 'Betrag', 'Fallig', 'Eingang', 'Bezahlt', 'Beleg', 'DATEV', 'Status', 'Notizen', ''].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filtered.map((item) => {
                  const days = daysUntil(item.due_date);
                  const isOverdue = days !== null && days < 0 && !item.paid_at;
                  return (
                    <tr key={item.id} className={`group hover:bg-white/[0.03] transition-colors ${isOverdue ? 'bg-red-500/[0.04]' : ''}`}>
                      <td className="px-3 py-3 text-slate-300 whitespace-nowrap text-xs">
                        {ENTITY_LABELS[item.entity]}
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-100 whitespace-nowrap">{item.vendor}</td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap text-xs">{item.invoice_number ?? '—'}</td>
                      <td className="px-3 py-3 font-semibold text-slate-100 whitespace-nowrap">
                        {formatAmount(item.amount, item.currency)}
                      </td>
                      <td className={`px-3 py-3 whitespace-nowrap text-xs ${isOverdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                        {formatDate(item.due_date)}
                        {days !== null && !item.paid_at && (
                          <span className="ml-1 opacity-70">({days}d)</span>
                        )}
                      </td>

                      {/* Checkpoint: Eingang */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.received_at ? (
                          <span className="text-green-400 text-xs font-medium">{formatDate(item.received_at)}</span>
                        ) : (
                          <button
                            onClick={() => setDate(item.id, 'received_at', new Date().toISOString().slice(0, 10))}
                            className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
                          >
                            + setzen
                          </button>
                        )}
                      </td>

                      {/* Checkpoint: Bezahlt */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {item.paid_at ? (
                          <span className="text-green-400 text-xs font-medium">{formatDate(item.paid_at)}</span>
                        ) : (
                          <button
                            onClick={() => markPaid(item.id)}
                            className="text-xs text-slate-500 hover:text-green-400 transition-colors"
                          >
                            + bezahlt
                          </button>
                        )}
                      </td>

                      {/* Checkpoint: Beleg */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleField(item.id, 'receipt_attached', item.receipt_attached)}
                          className={`w-5 h-5 rounded border transition-colors ${
                            item.receipt_attached
                              ? 'bg-green-500/20 border-green-500/40 text-green-400'
                              : 'border-white/[0.12] text-transparent hover:border-amber-500/40'
                          }`}
                        >
                          {item.receipt_attached && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>

                      {/* Checkpoint: DATEV */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleField(item.id, 'datev_exported', item.datev_exported)}
                          className={`w-5 h-5 rounded border transition-colors ${
                            item.datev_exported
                              ? 'bg-green-500/20 border-green-500/40 text-green-400'
                              : 'border-white/[0.12] text-transparent hover:border-amber-500/40'
                          }`}
                        >
                          {item.datev_exported && (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      </td>

                      {/* Status — inline dropdown */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) => updateStatus(item.id, e.target.value as PipelineStatus)}
                          className="text-[10px] font-bold bg-transparent border-none outline-none cursor-pointer text-slate-300 hover:text-amber-400 transition-colors"
                        >
                          {PIPELINE_STATUSES.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </td>

                      {/* Notes — inline editable */}
                      <td className="px-3 py-3 max-w-[150px]">
                        <input
                          type="text"
                          value={item.notes ?? ''}
                          onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i))}
                          onBlur={(e) => updateNotes(item.id, e.target.value)}
                          placeholder="Notiz..."
                          className="w-full text-xs bg-transparent border-none outline-none text-slate-500 placeholder-slate-700 hover:text-slate-300 focus:text-slate-200 transition-colors"
                        />
                      </td>

                      {/* Delete */}
                      <td className="px-2 py-3 whitespace-nowrap">
                        <button
                          onClick={() => { if (confirm('Rechnung löschen?')) deleteItem(item.id); }}
                          className="text-slate-600 hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100"
                          title="Löschen"
                        >
                          🗑
                        </button>
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

export default FinancePipelineTab;
