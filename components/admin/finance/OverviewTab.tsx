import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  type Currency,
  type Dispute,
  type Invoice,
} from './financeTypes';
import { daysUntil, formatDate, formatAmount } from './financeHelpers';
import { EmptyState } from './StatusBadge';

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

export default OverviewTab;
