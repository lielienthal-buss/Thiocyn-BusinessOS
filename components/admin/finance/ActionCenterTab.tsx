import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Brand, Currency, Dispute, Invoice } from './financeTypes';
import { BRANDS, INVOICE_STATUS_STYLES, CATEGORY_STYLES } from './financeTypes';
import { daysUntil, formatDate, formatAmount } from './financeHelpers';
import { EmptyState } from './StatusBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  type: 'dispute' | 'invoice';
  label: string;
  brand: Brand;
  amount: number;
  currency: Currency;
  daysLeft: number | null;
  status: string;
  category?: string;
  notes?: string | null;
  deadlineStr?: string | null;
  raw: Dispute | Invoice;
}

interface Section {
  key: string;
  label: string;
  emptyMsg: string;
  badge: string;
  headerBg: string;
  dot: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    key: 'overdue',
    label: '🔴 Overdue / Today',
    emptyMsg: 'No overdue items.',
    badge: 'bg-red-500/15 text-red-400 border-red-500/20',
    headerBg: 'bg-red-500/5 border-b border-red-500/10',
    dot: 'bg-red-400',
  },
  {
    key: 'week',
    label: '🟡 This Week',
    emptyMsg: 'Nothing due this week.',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    headerBg: 'bg-amber-500/5 border-b border-amber-500/10',
    dot: 'bg-amber-400',
  },
  {
    key: 'month',
    label: '🔵 This Month',
    emptyMsg: 'Nothing due this month.',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    headerBg: 'bg-blue-500/5 border-b border-blue-500/10',
    dot: 'bg-blue-400',
  },
  {
    key: 'pending',
    label: '⚪ No Deadline',
    emptyMsg: 'No pending items without deadline.',
    badge: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    headerBg: 'bg-slate-500/5 border-b border-slate-500/10',
    dot: 'bg-slate-500',
  },
];

function classify(daysLeft: number | null): string {
  if (daysLeft === null) return 'pending';
  if (daysLeft <= 0) return 'overdue';
  if (daysLeft <= 7) return 'week';
  if (daysLeft <= 30) return 'month';
  return 'later';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DueBadge({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft === null) return <span className="text-xs text-slate-500">No date</span>;
  if (daysLeft <= 0)
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/20">
        {daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)}d overdue`}
      </span>
    );
  if (daysLeft <= 7)
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/20">
        {daysLeft}d left
      </span>
    );
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/20">
      {daysLeft}d
    </span>
  );
}

function TypePill({ type, category }: { type: 'dispute' | 'invoice'; category?: string }) {
  if (type === 'dispute')
    return (
      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/20">
        Dispute
      </span>
    );
  const cat = category ?? 'invoice';
  const cls = CATEGORY_STYLES[cat as keyof typeof CATEGORY_STYLES] ?? 'bg-slate-50 text-slate-500 border-slate-100';
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border capitalize ${cls}`}>
      {cat}
    </span>
  );
}

// ─── ActionCenterTab ──────────────────────────────────────────────────────────

function ActionCenterTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<Brand | 'all'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, iRes] = await Promise.all([
      supabase.from('disputes').select('*').in('status', ['open', 'escalated']),
      supabase.from('invoices').select('*').in('status', ['pending', 'overdue']),
    ]);
    if (dRes.data) setDisputes(dRes.data as Dispute[]);
    if (iRes.data) setInvoices(iRes.data as Invoice[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build unified action items
  const allItems: ActionItem[] = [
    ...disputes.map((d): ActionItem => ({
      id: d.id,
      type: 'dispute',
      label: d.case_id,
      brand: d.brand,
      amount: d.amount,
      currency: d.currency,
      daysLeft: daysUntil(d.deadline),
      status: d.status,
      notes: d.notes,
      deadlineStr: d.deadline,
      raw: d,
    })),
    ...invoices.map((inv): ActionItem => ({
      id: inv.id,
      type: 'invoice',
      label: inv.vendor,
      brand: inv.brand,
      amount: inv.amount,
      currency: inv.currency,
      daysLeft: daysUntil(inv.due_date),
      status: inv.status,
      category: inv.category,
      notes: inv.notes,
      deadlineStr: inv.due_date,
      raw: inv,
    })),
  ].filter((item) => brandFilter === 'all' || item.brand === brandFilter)
   .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  const bySection = SECTIONS.reduce((acc, s) => {
    acc[s.key] = allItems.filter((item) => classify(item.daysLeft) === s.key);
    return acc;
  }, {} as Record<string, ActionItem[]>);

  // Also collect items beyond 30 days and append to pending display (optional later view)
  const laterItems = allItems.filter((item) => classify(item.daysLeft) === 'later');

  const totalOpen = allItems.length + laterItems.length;
  const urgentCount = (bySection['overdue']?.length ?? 0) + (bySection['week']?.length ?? 0);

  async function markResolved(item: ActionItem) {
    setUpdating(item.id);
    if (item.type === 'dispute') {
      await supabase.from('disputes').update({ status: 'resolved' }).eq('id', item.id);
    } else {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', item.id);
    }
    await load();
    setUpdating(null);
  }

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{totalOpen} open items</span>
            {urgentCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-red-500/15 text-red-400 border-red-500/20 animate-pulse">
                {urgentCount} urgent
              </span>
            )}
          </div>
        </div>

        {/* Brand filter */}
        <div className="flex flex-wrap gap-1">
          {(['all', ...BRANDS] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBrandFilter(b)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize ${
                brandFilter === b
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {b === 'all' ? 'All Brands' : b}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const items = bySection[section.key] ?? [];
        const isCollapsed = collapsed[section.key];

        return (
          <div
            key={section.key}
            className="bg-surface-800/60 border border-white/[0.06] rounded-2xl shadow-sm overflow-hidden"
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.key)}
              className={`w-full flex items-center justify-between px-5 py-3.5 ${section.headerBg} hover:bg-white/[0.02] transition-colors`}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">{section.label}</h3>
                {items.length > 0 && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${section.badge}`}>
                    {items.length}
                  </span>
                )}
              </div>
              <svg
                className={`w-4 h-4 text-slate-500 transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Items */}
            {!isCollapsed && (
              items.length === 0 ? (
                <div className="px-5 py-4 text-sm text-slate-500 italic">{section.emptyMsg}</div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Dot */}
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${section.dot}`} />

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-100 truncate">{item.label}</span>
                          <TypePill type={item.type} category={item.category} />
                          <span className="text-xs text-slate-500 capitalize">{item.brand}</span>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{item.notes}</p>
                        )}
                      </div>

                      {/* Amount + date + actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.amount > 0 && (
                          <span className="text-sm font-bold text-slate-300 tabular-nums">
                            {formatAmount(item.amount, item.currency)}
                          </span>
                        )}
                        {item.deadlineStr && (
                          <span className="text-xs text-slate-500 hidden sm:block">
                            {formatDate(item.deadlineStr)}
                          </span>
                        )}
                        <DueBadge daysLeft={item.daysLeft} />
                        <button
                          onClick={() => markResolved(item)}
                          disabled={updating === item.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                          {updating === item.id
                            ? '...'
                            : item.type === 'dispute'
                            ? 'Resolve'
                            : 'Mark Paid'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        );
      })}

      {/* Later items (collapsed by default) */}
      {laterItems.length > 0 && (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('later')}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-500/5 border-b border-slate-500/10 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100">📅 Later (&gt;30 days)</h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-500/15 text-slate-400 border-slate-500/20">
                {laterItems.length}
              </span>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${collapsed['later'] ? '' : '-rotate-90'}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {!collapsed['later'] && (
            <div className="px-5 py-4 text-sm text-slate-500 italic">
              {laterItems.length} item{laterItems.length !== 1 ? 's' : ''} due in &gt;30 days — no immediate action needed.
            </div>
          )}
        </div>
      )}

      {totalOpen === 0 && laterItems.length === 0 && (
        <EmptyState message="All clear — no open finance items." />
      )}
    </div>
  );
}

export default ActionCenterTab;
