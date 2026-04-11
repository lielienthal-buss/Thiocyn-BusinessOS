import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ENTITIES,
  CURRENCIES,
  PAYMENT_METHODS,
  PIPELINE_STATUSES,
  type Entity,
  type Currency,
  type PaymentMethod,
  type PipelineStatus,
  type PipelineItem,
} from './financeTypes';
import { formatDate, formatAmount, daysUntil } from './financeHelpers';
import {
  Section,
  Card,
  Button,
  Input,
  Select,
  StatCard,
  Table,
  IconPlus,
  IconCheck,
  IconTrash,
  IconDocument,
} from '@/components/ui/light';

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

  const filtered = items.filter((i) => {
    if (filterStatus !== 'all' && i.status !== filterStatus) return false;
    if (filterEntity !== 'all' && i.entity !== filterEntity) return false;
    return true;
  });

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

  const toggleField = async (id: string, field: 'receipt_attached' | 'datev_exported', current: boolean) => {
    await supabase.from('finance_pipeline').update({ [field]: !current }).eq('id', id);
    await fetchItems();
  };

  const setDate = async (id: string, field: 'received_at' | 'paid_at', value: string | null) => {
    await supabase.from('finance_pipeline').update({ [field]: value || null }).eq('id', id);
    await fetchItems();
  };

  const markPaid = async (id: string) => {
    await supabase.from('finance_pipeline').update({ paid_at: new Date().toISOString().slice(0, 10) }).eq('id', id);
    await fetchItems();
  };

  const updateStatus = async (id: string, status: PipelineStatus) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    const { error } = await supabase.from('finance_pipeline').update({ status }).eq('id', id);
    if (error) fetchItems();
  };

  const updateNotes = async (id: string, notes: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, notes: notes || null } : i));
    const { error } = await supabase.from('finance_pipeline').update({ notes: notes || null }).eq('id', id);
    if (error) fetchItems();
  };

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    const { error } = await supabase.from('finance_pipeline').delete().eq('id', id);
    if (error) fetchItems();
  };

  return (
    <Section className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Offen"
          value={`${offen.length}`}
          sub={fmtSum(offen)}
          variant={offen.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Beleg fehlt"
          value={String(belegFehlt.length)}
          sub="ohne Beleg"
          variant={belegFehlt.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Erledigt"
          value={String(erledigt.length)}
          sub="DATEV ready"
          variant="success"
        />
        <StatCard label="Gesamt" value={String(items.length)} sub="alle Posten" />
      </div>

      {/* Filters + Actions */}
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
        <div className="flex items-center gap-2">
          <Button variant="neutral" icon={<IconDocument />} onClick={() => exportCSV(filtered)}>
            CSV Export
          </Button>
          <Button variant="primary" icon={<IconPlus />} onClick={() => setShowAddForm((v) => !v)}>
            Rechnung hinzufügen
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card padding="md">
          <h3 className="lt-text-h1 mb-4">Neue Rechnung erfassen</h3>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Input
              label="Lieferant"
              required
              placeholder="z.B. Klaviyo, Meta"
              value={form.vendor}
              onChange={(v) => setForm((f) => ({ ...f, vendor: v }))}
            />
            <Input
              label="Rechnungsnr."
              placeholder="INV-2026-04"
              value={form.invoice_number}
              onChange={(v) => setForm((f) => ({ ...f, invoice_number: v }))}
            />
            <Input
              label="Betrag"
              required
              type="number"
              step="0.01"
              min={0}
              placeholder="0,00"
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
              label="Firma"
              value={form.entity}
              onChange={(v) => setForm((f) => ({ ...f, entity: v as Entity }))}
              options={ENTITIES.map((e) => ({ value: e, label: ENTITY_LABELS[e] }))}
            />
            <Select
              label="Zahlungsweg"
              value={form.payment_method}
              onChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}
              options={[
                { value: '', label: '— auswählen —' },
                ...PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_LABELS[m] })),
              ]}
            />
            <Input
              label="Fällig am"
              type="date"
              value={form.due_date}
              onChange={(v) => setForm((f) => ({ ...f, due_date: v }))}
            />
            <Input
              label="Eingang (GMI)"
              type="date"
              value={form.received_at}
              onChange={(v) => setForm((f) => ({ ...f, received_at: v }))}
            />
          </div>
          <div className="mt-3">
            <label className="lt-label">Notizen</label>
            <textarea
              rows={2}
              className="lt-input resize-none"
              placeholder="Optional..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="ghost" onClick={() => { setShowAddForm(false); setError(null); }}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <Card padding="lg">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <div className="lt-empty">Keine Rechnungen gefunden.</div>
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Firma</th>
              <th>Lieferant</th>
              <th>Rg-Nr</th>
              <th>Betrag</th>
              <th>Fällig</th>
              <th>Eingang</th>
              <th>Bezahlt</th>
              <th style={{ textAlign: 'center' }}>Beleg</th>
              <th style={{ textAlign: 'center' }}>DATEV</th>
              <th>Status</th>
              <th>Notizen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const days = daysUntil(item.due_date);
              const isOverdue = days !== null && days < 0 && !item.paid_at;
              return (
                <tr key={item.id} className="group">
                  <td className="lt-td-meta">{ENTITY_LABELS[item.entity]}</td>
                  <td className="lt-td-vendor">{item.vendor}</td>
                  <td className="lt-td-meta">{item.invoice_number ?? '—'}</td>
                  <td className="lt-td-amount">
                    {formatAmount(item.amount, item.currency)}
                  </td>
                  <td className="lt-td-meta" style={isOverdue ? { color: '#dc2626', fontWeight: 600 } : undefined}>
                    {formatDate(item.due_date)}
                    {days !== null && !item.paid_at && (
                      <span style={{ marginLeft: '0.375rem', opacity: 0.7, fontSize: '0.75rem' }}>
                        ({days}d)
                      </span>
                    )}
                  </td>

                  <td>
                    {item.received_at ? (
                      <span className="lt-text-success" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {formatDate(item.received_at)}
                      </span>
                    ) : (
                      <button
                        onClick={() => setDate(item.id, 'received_at', new Date().toISOString().slice(0, 10))}
                        className="lt-text-meta lt-text-muted"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                      >
                        + setzen
                      </button>
                    )}
                  </td>

                  <td>
                    {item.paid_at ? (
                      <span className="lt-text-success" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {formatDate(item.paid_at)}
                      </span>
                    ) : (
                      <button
                        onClick={() => markPaid(item.id)}
                        className="lt-text-meta lt-text-muted"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem' }}
                      >
                        + bezahlt
                      </button>
                    )}
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleField(item.id, 'receipt_attached', item.receipt_attached)}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '0.25rem',
                        border: item.receipt_attached ? '1px solid #1a8a2e' : '1px solid rgba(0,0,0,0.15)',
                        background: item.receipt_attached ? 'rgba(26,138,46,0.15)' : 'transparent',
                        color: '#1a8a2e',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.receipt_attached && <IconCheck size={14} />}
                    </button>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => toggleField(item.id, 'datev_exported', item.datev_exported)}
                      style={{
                        width: '1.25rem',
                        height: '1.25rem',
                        borderRadius: '0.25rem',
                        border: item.datev_exported ? '1px solid #1a8a2e' : '1px solid rgba(0,0,0,0.15)',
                        background: item.datev_exported ? 'rgba(26,138,46,0.15)' : 'transparent',
                        color: '#1a8a2e',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.datev_exported && <IconCheck size={14} />}
                    </button>
                  </td>

                  <td>
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value as PipelineStatus)}
                      className="lt-select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', width: 'auto' }}
                    >
                      {PIPELINE_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>

                  <td style={{ maxWidth: '150px' }}>
                    <input
                      type="text"
                      value={item.notes ?? ''}
                      onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes: e.target.value } : i))}
                      onBlur={(e) => updateNotes(item.id, e.target.value)}
                      placeholder="Notiz..."
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.75rem',
                        color: 'var(--light-text-secondary)',
                      }}
                    />
                  </td>

                  <td>
                    <button
                      onClick={() => { if (confirm('Rechnung löschen?')) deleteItem(item.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#dc2626',
                        padding: '0.25rem',
                      }}
                      title="Löschen"
                    >
                      <IconTrash />
                    </button>
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

export default FinancePipelineTab;
