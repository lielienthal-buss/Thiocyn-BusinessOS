import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  type Currency,
  type Dispute,
  type PipelineItem,
} from './financeTypes';
import { daysUntil, formatDate, formatAmount } from './financeHelpers';
import {
  Section,
  Card,
  StatCard,
  Pill,
  IconAlert,
  IconDocument,
  IconClock,
} from '@/components/ui/light';

// ─── Overview Tab ─────────────────────────────────────────────────────────────
// Reads disputes + finance_pipeline (canonical Eingangsrechnungen).
// Welle 3 Stage 3 — Light Glass refactor.

function OverviewTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [dResult, pResult] = await Promise.all([
        supabase.from('disputes').select('*'),
        supabase.from('finance_pipeline').select('*'),
      ]);
      if (dResult.data) setDisputes(dResult.data as Dispute[]);
      if (pResult.data) setPipeline(pResult.data as PipelineItem[]);
      setLoading(false);
    };
    load();
  }, []);

  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'escalated');
  const outstandingItems = pipeline.filter((item) => item.paid_at === null);
  const overdueItems = pipeline.filter((item) => item.status === 'ueberfaellig');

  const sumByCurrency = (items: { amount: number; currency: Currency }[]) => {
    const groups = items.reduce((acc: Record<string, number>, item) => {
      acc[item.currency] = (acc[item.currency] ?? 0) + item.amount;
      return acc;
    }, {});
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
    entity: string;
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
        entity: d.brand,
        daysLeft: daysUntil(d.deadline),
      })),
    ...outstandingItems
      .filter((item) => {
        const days = daysUntil(item.due_date);
        return days !== null && days <= 7;
      })
      .map((item) => ({
        type: 'invoice' as const,
        label: `Rechnung: ${item.vendor}`,
        amount: formatAmount(item.amount, item.currency),
        deadline: item.due_date,
        status: item.status,
        entity: item.entity,
        daysLeft: daysUntil(item.due_date),
      })),
  ].sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  if (loading) {
    return (
      <Section>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
        </div>
      </Section>
    );
  }

  return (
    <Section className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Open Disputes"
          value={String(openDisputes.length)}
          sub={sumByCurrency(openDisputes)}
          variant={openDisputes.length > 0 ? 'danger' : 'success'}
          icon={<IconAlert size={18} />}
          size="lg"
        />
        <StatCard
          label="Offene Rechnungen"
          value={sumByCurrency(outstandingItems)}
          sub={`${outstandingItems.length} Posten`}
          variant={outstandingItems.length > 0 ? 'warning' : 'success'}
          icon={<IconDocument size={18} />}
          size="lg"
        />
        <StatCard
          label="Überfällig"
          value={sumByCurrency(overdueItems)}
          sub={`${overdueItems.length} Posten`}
          variant={overdueItems.length > 0 ? 'danger' : 'success'}
          icon={<IconClock size={18} />}
          size="lg"
        />
      </div>

      {/* Urgent items */}
      <Card padding="none">
        <div className="px-5 py-4 lt-header-divider flex items-center gap-2">
          <span className="lt-text-danger">
            <IconClock size={18} />
          </span>
          <h3 className="lt-text-h1">Fällig in 7 Tagen</h3>
          {urgentItems.length > 0 && (
            <Pill variant="danger" className="ml-auto">
              {urgentItems.length} Posten
            </Pill>
          )}
        </div>
        {urgentItems.length === 0 ? (
          <div className="lt-empty">Keine fälligen Posten in 7 Tagen.</div>
        ) : (
          <ul className="lt-divide">
            {urgentItems.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: item.type === 'dispute' ? '#d97706' : '#b35900' }}
                  />
                  <div className="min-w-0">
                    <p className="lt-text-body truncate">{item.label}</p>
                    <p className="lt-text-meta capitalize">{item.entity} · {item.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="lt-text-body lt-tabular">{item.amount}</span>
                  <Pill variant={(item.daysLeft ?? 0) <= 0 ? 'danger' : 'warning'}>
                    {item.daysLeft !== null
                      ? item.daysLeft <= 0
                        ? 'Heute / Überfällig'
                        : `${item.daysLeft}d`
                      : '—'}
                  </Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Section>
  );
}

export default OverviewTab;
