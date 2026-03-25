import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANDS = [
  'thiocyn',
  'take-a-shot',
  'dr-severin',
  'paigh',
  'wristr',
  'timber-john',
] as const;

const PLATFORMS = ['PayPal', 'Stripe', 'Amazon', 'Klarna', 'Other'] as const;
const CURRENCIES = ['EUR', 'USD'] as const;

const DISPUTE_STATUSES = ['open', 'escalated', 'resolved', 'won', 'lost'] as const;
const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'disputed'] as const;
const INVOICE_CATEGORIES = ['invoice', 'mahnung', 'subscription'] as const;

type Brand = typeof BRANDS[number];
type Platform = typeof PLATFORMS[number];
type Currency = typeof CURRENCIES[number];
type DisputeStatus = typeof DISPUTE_STATUSES[number];
type InvoiceStatus = typeof INVOICE_STATUSES[number];
type InvoiceCategory = typeof INVOICE_CATEGORIES[number];
type FinanceTab = 'disputes' | 'invoices' | 'overview';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dispute {
  id: string;
  brand: Brand;
  case_id: string;
  platform: Platform;
  amount: number;
  currency: Currency;
  deadline: string | null;
  status: DisputeStatus;
  notes: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  brand: Brand;
  vendor: string;
  amount: number;
  currency: Currency;
  invoice_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  category: InvoiceCategory;
  notes: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function deadlineColor(
  dateStr: string | null,
  resolved = false,
): string {
  if (resolved) return 'text-gray-400';
  const days = daysUntil(dateStr);
  if (days === null) return 'text-gray-400';
  if (days <= 7) return 'text-red-600 font-semibold';
  if (days <= 30) return 'text-amber-600 font-semibold';
  return 'text-green-600';
}

function deadlineBg(dateStr: string | null, resolved = false): string {
  if (resolved) return 'bg-gray-50';
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days <= 7) return 'bg-red-50';
  if (days <= 30) return 'bg-amber-50';
  return 'bg-green-50';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// ─── Badge components ─────────────────────────────────────────────────────────

const DISPUTE_STATUS_STYLES: Record<DisputeStatus, string> = {
  open: 'bg-red-100 text-red-700 border border-red-200',
  escalated: 'bg-orange-100 text-orange-700 border border-orange-200',
  resolved: 'bg-gray-100 text-gray-500 border border-gray-200',
  won: 'bg-green-100 text-green-700 border border-green-200',
  lost: 'bg-red-100 text-red-600 border border-red-200',
};

const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  paid: 'bg-green-100 text-green-700 border border-green-200',
  overdue: 'bg-red-100 text-red-700 border border-red-200',
  disputed: 'bg-orange-100 text-orange-700 border border-orange-200',
};

const CATEGORY_STYLES: Record<InvoiceCategory, string> = {
  invoice: 'bg-blue-50 text-blue-600 border border-blue-100',
  mahnung: 'bg-red-50 text-red-600 border border-red-100',
  subscription: 'bg-purple-50 text-purple-600 border border-purple-100',
};

function StatusBadge({
  status,
  styles,
}: {
  status: string;
  styles: Record<string, string>;
}) {
  const cls = styles[status] ?? 'bg-gray-100 text-gray-500';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg
        className="w-10 h-10 mb-3 opacity-40"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm"
        >
          <span className="text-xs text-gray-500 font-medium">{item.label}</span>
          <span className={`text-sm font-bold ${item.color ?? 'text-gray-800'}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

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
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800">New Dispute</h3>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value as Brand }))}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Case ID *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="PP-12345-XXXXX"
                value={form.case_id}
                onChange={(e) => setForm((f) => ({ ...f, case_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as Platform }))}
              >
                {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
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
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Brand', 'Case ID', 'Platform', 'Amount', 'Deadline', 'Status', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {disputes.map((d) => {
                  const isEditing = editingId === d.id;
                  const isResolved = d.status === 'resolved' || d.status === 'won' || d.status === 'lost';
                  return (
                    <React.Fragment key={d.id}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${deadlineBg(d.deadline, isResolved)}`}
                        onClick={() => !isEditing && startEdit(d)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 capitalize whitespace-nowrap">{d.brand}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">{d.case_id}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.platform}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{formatAmount(d.amount, d.currency)}</td>
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
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">{d.notes ?? '—'}</td>
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
                          <td colSpan={8} className="px-4 py-4 bg-blue-50 border-t border-blue-100">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                                <select
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.brand ?? d.brand}
                                  onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value as Brand }))}
                                >
                                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Case ID</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.case_id ?? d.case_id}
                                  onChange={(e) => setEditForm((f) => ({ ...f, case_id: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                                <select
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.status ?? d.status}
                                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as DisputeStatus }))}
                                >
                                  {DISPUTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.amount ?? d.amount}
                                  onChange={(e) => setEditForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Platform</label>
                                <select
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.platform ?? d.platform}
                                  onChange={(e) => setEditForm((f) => ({ ...f, platform: e.target.value as Platform }))}
                                >
                                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                                <select
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.currency ?? d.currency}
                                  onChange={(e) => setEditForm((f) => ({ ...f, currency: e.target.value as Currency }))}
                                >
                                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Deadline</label>
                                <input
                                  type="date"
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.deadline ?? d.deadline ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                                  value={editForm.notes ?? d.notes ?? ''}
                                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 justify-end">
                              <button
                                onClick={() => { setEditingId(null); setEditForm({}); }}
                                className="px-3 py-1.5 text-xs text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
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

// ─── Invoices Tab ─────────────────────────────────────────────────────────────

const DEFAULT_INVOICE_FORM = {
  brand: BRANDS[0] as Brand,
  vendor: '',
  amount: '',
  currency: 'EUR' as Currency,
  invoice_date: '',
  due_date: '',
  status: 'pending' as InvoiceStatus,
  category: 'invoice' as InvoiceCategory,
  notes: '',
};

function InvoicesTab() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(DEFAULT_INVOICE_FORM);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [filterBrand, setFilterBrand] = useState<Brand | 'all'>('all');

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('due_date', { ascending: true });
    if (!error && data) setInvoices(data as Invoice[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = invoices.filter((inv) => {
    if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
    if (filterBrand !== 'all' && inv.brand !== filterBrand) return false;
    return true;
  });

  const outstanding = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue');
  const overdueOnly = invoices.filter((inv) => inv.status === 'overdue');

  const sumByCurrency = (items: Invoice[]) =>
    items.reduce((groups: Record<Currency, number>, inv) => {
      groups[inv.currency] = (groups[inv.currency] ?? 0) + inv.amount;
      return groups;
    }, {} as Record<Currency, number>);

  const fmtSum = (items: Invoice[]) => {
    const groups = sumByCurrency(items);
    const entries = Object.entries(groups);
    if (entries.length === 0) return '—';
    return entries.map(([cur, val]) => formatAmount(val, cur as Currency)).join(' + ');
  };

  const handleAdd = async () => {
    if (!form.vendor.trim() || !form.amount) {
      setError('Vendor and amount are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error } = await supabase.from('invoices').insert({
      brand: form.brand,
      vendor: form.vendor.trim(),
      amount: parseFloat(form.amount),
      currency: form.currency,
      invoice_date: form.invoice_date || null,
      due_date: form.due_date || null,
      status: form.status,
      category: form.category,
      notes: form.notes || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setForm(DEFAULT_INVOICE_FORM);
      setShowAddForm(false);
      await fetch();
    }
    setSubmitting(false);
  };

  const handleMarkPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
    await fetch();
  };

  return (
    <div className="space-y-5">
      {/* Summary */}
      <SummaryBar
        items={[
          { label: 'Outstanding', value: fmtSum(outstanding), color: outstanding.length > 0 ? 'text-amber-600' : 'text-green-600' },
          { label: 'Overdue', value: fmtSum(overdueOnly), color: overdueOnly.length > 0 ? 'text-red-600' : 'text-green-600' },
          { label: 'Total invoices', value: String(invoices.length) },
        ]}
      />

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <select
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
          >
            <option value="all">All statuses</option>
            {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value as Brand | 'all')}
          >
            <option value="all">All brands</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Invoice
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800">New Invoice / Mahnung</h3>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value as Brand }))}
              >
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendor *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="e.g. Shopify, Meta"
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as InvoiceCategory }))}
              >
                {INVOICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}
              >
                {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.invoice_date}
                onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowAddForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving…' : 'Save Invoice'}
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
        <EmptyState message="No invoices match the current filters." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Brand', 'Vendor', 'Category', 'Amount', 'Invoice Date', 'Due Date', 'Status', 'Notes', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-gray-50 transition-colors ${deadlineBg(inv.due_date, isPaid)}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800 capitalize whitespace-nowrap">{inv.brand}</td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{inv.vendor}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={inv.category} styles={CATEGORY_STYLES} />
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{formatAmount(inv.amount, inv.currency)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap ${deadlineColor(inv.due_date, isPaid)}`}>
                        {formatDate(inv.due_date)}
                        {!isPaid && daysUntil(inv.due_date) !== null && (
                          <span className="ml-1 text-xs opacity-70">({daysUntil(inv.due_date)}d)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={inv.status} styles={INVOICE_STATUS_STYLES} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">{inv.notes ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {!isPaid && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            className="text-xs text-green-600 font-semibold hover:text-green-700 hover:underline"
                          >
                            Mark Paid
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [dResult, iResult] = await Promise.all([
        supabase.from('disputes').select('*'),
        supabase.from('invoices').select('*'),
      ]);
      if (dResult.data) setDisputes(dResult.data as Dispute[]);
      if (iResult.data) setInvoices(iResult.data as Invoice[]);
      setLoading(false);
    };
    load();
  }, []);

  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'escalated');
  const outstandingInvoices = invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue');
  const overdueInvoices = invoices.filter((inv) => inv.status === 'overdue');

  const sumByCurrency = (items: { amount: number; currency: Currency }[]) => {
    const groups = items.reduce((acc: Record<Currency, number>, item) => {
      acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
      return acc;
    }, {} as Record<Currency, number>);
    const entries = Object.entries(groups);
    if (entries.length === 0) return '—';
    return entries.map(([cur, val]) => formatAmount(val, cur as Currency)).join(' + ');
  };

  // Items due within 7 days (combined)
  interface DueItem {
    type: 'dispute' | 'invoice';
    label: string;
    amount: string;
    deadline: string | null;
    status: string;
    brand: string;
    daysLeft: number | null;
  }

  const urgentItems: DueItem[] = [
    ...openDisputes
      .filter((d) => {
        const days = daysUntil(d.deadline);
        return days !== null && days <= 7;
      })
      .map((d) => ({
        type: 'dispute' as const,
        label: `Dispute: ${d.case_id}`,
        amount: formatAmount(d.amount, d.currency),
        deadline: d.deadline,
        status: d.status,
        brand: d.brand,
        daysLeft: daysUntil(d.deadline),
      })),
    ...outstandingInvoices
      .filter((inv) => {
        const days = daysUntil(inv.due_date);
        return days !== null && days <= 7;
      })
      .map((inv) => ({
        type: 'invoice' as const,
        label: `Invoice: ${inv.vendor}`,
        amount: formatAmount(inv.amount, inv.currency),
        deadline: inv.due_date,
        status: inv.status,
        brand: inv.brand,
        daysLeft: daysUntil(inv.due_date),
      })),
  ].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  const statCards = [
    {
      label: 'Open Disputes',
      value: String(openDisputes.length),
      sub: sumByCurrency(openDisputes),
      color: openDisputes.length > 0 ? 'text-red-600' : 'text-green-600',
      bg: openDisputes.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: 'Outstanding Invoices',
      value: sumByCurrency(outstandingInvoices),
      sub: `${outstandingInvoices.length} items`,
      color: outstandingInvoices.length > 0 ? 'text-amber-600' : 'text-green-600',
      bg: outstandingInvoices.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Overdue Invoices',
      value: sumByCurrency(overdueInvoices),
      sub: `${overdueInvoices.length} items`,
      color: overdueInvoices.length > 0 ? 'text-red-600' : 'text-green-600',
      bg: overdueInvoices.length > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`flex items-start gap-4 p-5 border rounded-2xl ${card.bg}`}
          >
            <div className={`mt-0.5 ${card.color}`}>{card.icon}</div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className={`text-xl font-black mt-0.5 ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Urgent items */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-800">Due within 7 days</h3>
          {urgentItems.length > 0 && (
            <span className="ml-auto text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              {urgentItems.length} item{urgentItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {urgentItems.length === 0 ? (
          <EmptyState message="No items due within 7 days." />
        ) : (
          <ul className="divide-y divide-gray-50">
            {urgentItems.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    item.type === 'dispute' ? 'bg-orange-400' : 'bg-amber-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                    <p className="text-xs text-gray-400 capitalize">{item.brand} · {item.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="text-sm font-bold text-gray-700">{item.amount}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    (item.daysLeft ?? 0) <= 0
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}>
                    {item.daysLeft !== null
                      ? item.daysLeft <= 0
                        ? 'Today / Overdue'
                        : `${item.daysLeft}d left`
                      : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: FinanceTab; label: string }[] = [
  { id: 'disputes', label: 'Disputes' },
  { id: 'invoices', label: 'Invoices & Mahnungen' },
  { id: 'overview', label: 'Overview' },
];

const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceTab>('disputes');

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Finance</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Disputes, invoices, and financial overview across all brands
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'disputes' && <DisputesTab />}
        {activeTab === 'invoices' && <InvoicesTab />}
        {activeTab === 'overview' && <OverviewTab />}
      </div>
    </div>
  );
};

export default FinanceView;
