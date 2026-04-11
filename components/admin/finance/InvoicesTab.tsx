import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ENTITIES,
  CURRENCIES,
  PIPELINE_STATUSES,
  type Entity,
  type Currency,
  type PipelineStatus,
  type PipelineItem,
} from './financeTypes';
import { daysUntil, formatDate, formatAmount } from './financeHelpers';
import MahnungenBanner from './MahnungenBanner';
import {
  Section,
  StatCard,
  Button,
  Input,
  Select,
  Card,
  Table,
  Pill,
  IconPlus,
  IconCheck,
} from '@/components/ui/light';

// ─── Invoices & Mahnungen Tab ─────────────────────────────────────────────────
// Welle 3 Stage 2 — Light Glass + Bento layout pilot.
// Layout: Mahnungen-Banner (groß) + StatCard-Stack (rechts) → Filter Bar →
// Pipeline Table.
// Reads finance_pipeline. Mahnungen sind in eigener Tabelle (finance_mahnungen).

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

const STATUS_VARIANT: Record<PipelineStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  offen: 'warning',
  bezahlt: 'success',
  beleg_fehlt: 'warning',
  erledigt: 'success',
  ueberfaellig: 'danger',
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
    <Section className="space-y-5">
      {/* ─── Top Row: Mahnungen Banner (left) + StatCard Stack (right) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MahnungenBanner onChange={load} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <StatCard
            label="Offen"
            value={fmtSum(outstanding)}
            sub={`${outstanding.length} Posten`}
            variant={outstanding.length > 0 ? 'warning' : 'success'}
            size="md"
          />
          <StatCard
            label="Überfällig"
            value={fmtSum(overdueOnly)}
            sub={`${overdueOnly.length} Posten`}
            variant={overdueOnly.length > 0 ? 'danger' : 'success'}
            size="md"
          />
          <StatCard
            label="Gesamt"
            value={items.length}
            sub="alle Posten"
            size="md"
          />
        </div>
      </div>

      {/* ─── Filter Bar + Add Button ─── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Select
            width="auto"
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as PipelineStatus | 'all')}
            options={[
              { value: 'all', label: 'Alle Status' },
              ...PIPELINE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
            ]}
          />
          <Select
            width="auto"
            value={filterEntity}
            onChange={(v) => setFilterEntity(v as Entity | 'all')}
            options={[
              { value: 'all', label: 'Alle Firmen' },
              ...ENTITIES.map((e) => ({ value: e, label: ENTITY_LABELS[e] })),
            ]}
          />
        </div>
        <Button
          variant="primary"
          icon={<IconPlus />}
          onClick={() => setShowAddForm((v) => !v)}
        >
          Rechnung hinzufügen
        </Button>
      </div>

      {/* ─── Add Form ─── */}
      {showAddForm && (
        <Card padding="md">
          <h3 className="lt-text-h1 mb-4">Neue Rechnung</h3>
          {error && (
            <p
              className="lt-text-meta lt-text-danger mb-3"
              style={{
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.625rem',
              }}
            >
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Select
              label="Firma"
              value={form.entity}
              onChange={(v) => setForm((f) => ({ ...f, entity: v as Entity }))}
              options={ENTITIES.map((e) => ({ value: e, label: ENTITY_LABELS[e] }))}
            />
            <Input
              label="Lieferant"
              required
              placeholder="z.B. Shopify, Meta"
              value={form.vendor}
              onChange={(v) => setForm((f) => ({ ...f, vendor: v }))}
            />
            <Input
              label="Betrag"
              required
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            />
            <Select
              label="Währung"
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v as PipelineStatus }))}
              options={PIPELINE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
            />
            <Input
              label="Fällig am"
              type="date"
              value={form.due_date}
              onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
            />
          </div>
          <div className="mt-3">
            <label className="lt-label">Notizen</label>
            <textarea
              rows={2}
              className="lt-input resize-none"
              placeholder="Optionale Notizen..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="ghost" onClick={() => { setShowAddForm(false); setError(null); }}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Speichere…' : 'Speichern'}
            </Button>
          </div>
        </Card>
      )}

      {/* ─── Pipeline Table ─── */}
      {loading ? (
        <Card padding="lg">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <div className="lt-empty">Keine Rechnungen für diese Filter.</div>
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Firma</th>
              <th>Lieferant</th>
              <th>Betrag</th>
              <th>Eingang</th>
              <th>Fällig</th>
              <th>Status</th>
              <th>Notizen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const isPaid = item.status === 'bezahlt' || item.status === 'erledigt';
              const days = daysUntil(item.due_date);
              const isOverdue = days !== null && days < 0 && !isPaid;
              return (
                <tr key={item.id}>
                  <td className="lt-td-meta">{ENTITY_LABELS[item.entity] ?? item.entity}</td>
                  <td className="lt-td-vendor">{item.vendor}</td>
                  <td className="lt-td-amount">{formatAmount(item.amount, item.currency)}</td>
                  <td className="lt-td-meta">{formatDate(item.received_at)}</td>
                  <td className="lt-td-meta" style={isOverdue ? { color: '#dc2626', fontWeight: 600 } : undefined}>
                    {formatDate(item.due_date)}
                    {!isPaid && days !== null && (
                      <span style={{ marginLeft: '0.375rem', opacity: 0.7, fontSize: '0.75rem' }}>
                        ({days}d)
                      </span>
                    )}
                  </td>
                  <td>
                    <Pill variant={STATUS_VARIANT[item.status]}>{STATUS_LABELS[item.status]}</Pill>
                  </td>
                  <td className="lt-td-meta" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.notes ?? '—'}
                  </td>
                  <td>
                    {!isPaid && (
                      <Button
                        variant="success"
                        size="sm"
                        icon={<IconCheck />}
                        onClick={() => handleMarkPaid(item.id)}
                      >
                        Bezahlt
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Section>
  );
}

export default InvoicesTab;
