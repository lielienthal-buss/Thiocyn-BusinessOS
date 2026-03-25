import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  BRANDS,
  CURRENCIES,
  INVOICE_STATUSES,
  INVOICE_CATEGORIES,
  INVOICE_STATUS_STYLES,
  CATEGORY_STYLES,
  type Brand,
  type Currency,
  type InvoiceStatus,
  type InvoiceCategory,
  type Invoice,
} from './financeTypes';
import { daysUntil, deadlineColor, deadlineBg, formatDate, formatAmount } from './financeHelpers';
import { StatusBadge, EmptyState, SummaryBar } from './StatusBadge';

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

export default InvoicesTab;
