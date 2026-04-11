import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Currency, Dispute, Entity, PipelineItem, PipelineStatus } from './financeTypes';
import { ENTITIES } from './financeTypes';
import { daysUntil, formatDate, formatAmount } from './financeHelpers';
import {
  Section,
  Card,
  Button,
  Pill,
  IconCheck,
  IconChevronDown,
} from '@/components/ui/light';

// ─── ActionCenterTab ──────────────────────────────────────────────────────────
// Unified view of disputes + finance_pipeline (Eingangsrechnungen).
// Welle 3 Stage 3 — Light Glass refactor.

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  type: 'dispute' | 'invoice';
  label: string;
  entity: Entity | string;
  amount: number;
  currency: Currency;
  daysLeft: number | null;
  status: string;
  notes?: string | null;
  deadlineStr?: string | null;
  raw: Dispute | PipelineItem;
}

interface SectionDef {
  key: string;
  label: string;
  emptyMsg: string;
  dotColor: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_DEFS: SectionDef[] = [
  {
    key: 'overdue',
    label: 'Overdue / Heute',
    emptyMsg: 'Keine überfälligen Posten.',
    dotColor: '#dc2626',
  },
  {
    key: 'week',
    label: 'Diese Woche',
    emptyMsg: 'Nichts diese Woche fällig.',
    dotColor: '#d97706',
  },
  {
    key: 'month',
    label: 'Diesen Monat',
    emptyMsg: 'Nichts diesen Monat fällig.',
    dotColor: '#334FB4',
  },
  {
    key: 'pending',
    label: 'Ohne Deadline',
    emptyMsg: 'Keine Posten ohne Deadline.',
    dotColor: '#86868b',
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
  if (daysLeft === null) return <span className="lt-text-meta lt-text-muted">No date</span>;
  if (daysLeft <= 0)
    return (
      <Pill variant="danger">
        {daysLeft === 0 ? 'Today' : `${Math.abs(daysLeft)}d overdue`}
      </Pill>
    );
  if (daysLeft <= 7)
    return <Pill variant="warning">{daysLeft}d left</Pill>;
  return <Pill variant="blue">{daysLeft}d</Pill>;
}

function TypePill({ type, status }: { type: 'dispute' | 'invoice'; status?: string }) {
  if (type === 'dispute') return <Pill variant="warning">Dispute</Pill>;
  const label = (status && STATUS_LABELS[status as PipelineStatus]) ?? 'Rechnung';
  return <Pill variant="neutral">{label}</Pill>;
}

// ─── ActionCenterTab ──────────────────────────────────────────────────────────

function ActionCenterTab() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<Entity | 'all'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, pRes] = await Promise.all([
      supabase.from('disputes').select('*').in('status', ['open', 'escalated']),
      supabase.from('finance_pipeline').select('*').is('paid_at', null),
    ]);
    if (dRes.data) setDisputes(dRes.data as Dispute[]);
    if (pRes.data) setPipeline(pRes.data as PipelineItem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build unified action items
  const allItems: ActionItem[] = [
    ...disputes.map((d): ActionItem => ({
      id: d.id,
      type: 'dispute',
      label: d.case_id,
      entity: d.brand,
      amount: d.amount,
      currency: d.currency,
      daysLeft: daysUntil(d.deadline),
      status: d.status,
      notes: d.notes,
      deadlineStr: d.deadline,
      raw: d,
    })),
    ...pipeline.map((item): ActionItem => ({
      id: item.id,
      type: 'invoice',
      label: item.vendor,
      entity: item.entity,
      amount: item.amount,
      currency: item.currency,
      daysLeft: daysUntil(item.due_date),
      status: item.status,
      notes: item.notes,
      deadlineStr: item.due_date,
      raw: item,
    })),
  ].filter((item) => entityFilter === 'all' || item.entity === entityFilter)
   .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

  const bySection = SECTION_DEFS.reduce((acc, s) => {
    acc[s.key] = allItems.filter((item) => classify(item.daysLeft) === s.key);
    return acc;
  }, {} as Record<string, ActionItem[]>);

  const laterItems = allItems.filter((item) => classify(item.daysLeft) === 'later');

  const totalOpen = allItems.length + laterItems.length;
  const urgentCount = (bySection['overdue']?.length ?? 0) + (bySection['week']?.length ?? 0);

  async function markResolved(item: ActionItem) {
    setUpdating(item.id);
    if (item.type === 'dispute') {
      await supabase.from('disputes').update({ status: 'resolved' }).eq('id', item.id);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from('finance_pipeline')
        .update({ status: 'bezahlt', paid_at: today })
        .eq('id', item.id);
    }
    await load();
    setUpdating(null);
  }

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

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
    <Section className="space-y-4">
      {/* Summary header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="lt-text-h1">{totalOpen} open items</span>
          {urgentCount > 0 && (
            <Pill variant="danger" pulse>{urgentCount} urgent</Pill>
          )}
        </div>

        {/* Entity filter */}
        <div className="flex flex-wrap gap-1">
          {(['all', ...ENTITIES] as const).map((e) => (
            <button
              key={e}
              onClick={() => setEntityFilter(e as Entity | 'all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                entityFilter === e ? 'lt-btn-primary' : 'lt-btn-ghost'
              }`}
              style={{ fontSize: '0.75rem', fontWeight: 600 }}
            >
              {e === 'all' ? 'Alle' : ENTITY_LABELS[e as Entity]}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTION_DEFS.map((section) => {
        const items = bySection[section.key] ?? [];
        const isCollapsed = collapsed[section.key];

        return (
          <Card key={section.key} padding="none">
            {/* Section header */}
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors lt-header-divider"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: section.dotColor }}
                />
                <h3 className="lt-text-h1">{section.label}</h3>
                {items.length > 0 && (
                  <Pill variant="neutral">{items.length}</Pill>
                )}
              </div>
              <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 200ms', color: 'var(--light-text-muted)' }}>
                <IconChevronDown />
              </span>
            </button>

            {/* Items */}
            {!isCollapsed && (
              items.length === 0 ? (
                <div className="px-5 py-4 lt-text-meta italic">{section.emptyMsg}</div>
              ) : (
                <ul className="lt-divide">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-black/[0.02] transition-colors group"
                    >
                      {/* Dot */}
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: section.dotColor }}
                      />

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="lt-text-body truncate">{item.label}</span>
                          <TypePill type={item.type} status={item.type === 'invoice' ? item.status : undefined} />
                          <span className="lt-text-meta">
                            {ENTITY_LABELS[item.entity as Entity] ?? item.entity}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="lt-text-meta mt-1 truncate">{item.notes}</p>
                        )}
                      </div>

                      {/* Amount + date + actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {item.amount > 0 && (
                          <span className="lt-text-body lt-tabular">
                            {formatAmount(item.amount, item.currency)}
                          </span>
                        )}
                        {item.deadlineStr && (
                          <span className="lt-text-meta hidden sm:block">
                            {formatDate(item.deadlineStr)}
                          </span>
                        )}
                        <DueBadge daysLeft={item.daysLeft} />
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="success"
                            size="sm"
                            icon={<IconCheck />}
                            onClick={() => markResolved(item)}
                            disabled={updating === item.id}
                          >
                            {updating === item.id ? '...' : item.type === 'dispute' ? 'Resolve' : 'Bezahlt'}
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </Card>
        );
      })}

      {/* Later items (collapsed by default) */}
      {laterItems.length > 0 && (
        <Card padding="none">
          <button
            onClick={() => toggleSection('later')}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-black/[0.02] transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="lt-text-h1">Später (&gt;30 Tage)</h3>
              <Pill variant="neutral">{laterItems.length}</Pill>
            </div>
            <span style={{ transform: collapsed['later'] ? 'rotate(-90deg)' : 'none', transition: 'transform 200ms', color: 'var(--light-text-muted)' }}>
              <IconChevronDown />
            </span>
          </button>
          {!collapsed['later'] && (
            <div className="px-5 py-4 lt-text-meta italic">
              {laterItems.length} Posten in &gt;30 Tagen — keine sofortige Aktion nötig.
            </div>
          )}
        </Card>
      )}

      {totalOpen === 0 && laterItems.length === 0 && (
        <Card padding="lg">
          <div className="lt-empty">All clear — keine offenen Finance Items.</div>
        </Card>
      )}
    </Section>
  );
}

export default ActionCenterTab;
