import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  BRANDS,
  PLATFORMS,
  CURRENCIES,
  DISPUTE_STATUSES,
  type Brand,
  type Platform,
  type Currency,
  type DisputeStatus,
  type Dispute,
} from './financeTypes';
import { daysUntil, formatDate, formatAmount } from './financeHelpers';
import {
  Section,
  Card,
  Button,
  Input,
  Select,
  StatCard,
  Pill,
  Table,
  IconPlus,
  IconCheck,
} from '@/components/ui/light';

// ─── Disputes Tab ─────────────────────────────────────────────────────────────
// Welle 3 Stage 3 — Light Glass refactor.

const DEFAULT_DISPUTE_FORM = {
  brand: BRANDS[0] as Brand,
  case_id: '',
  platform: PLATFORMS[0] as Platform,
  amount: '',
  currency: 'EUR' as Currency,
  deadline: '',
  notes: '',
};

const STATUS_VARIANT: Record<DisputeStatus, 'danger' | 'warning' | 'neutral' | 'success'> = {
  open: 'danger',
  escalated: 'warning',
  resolved: 'neutral',
  won: 'success',
  lost: 'danger',
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('disputes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setDisputes(data as Dispute[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDisputes = disputes.filter((d) => d.status === 'open' || d.status === 'escalated');
  const atRiskLabel = openDisputes.length > 0
    ? openDisputes.reduce((groups: Record<Currency, number>, d) => {
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
      setError('Case ID und Amount sind Pflicht.');
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
      await fetchData();
    }
    setSubmitting(false);
  };

  const handleMarkResolved = async (id: string) => {
    await supabase.from('disputes').update({ status: 'resolved' }).eq('id', id);
    await fetchData();
  };

  const handleEditSave = async (id: string) => {
    const payload: Partial<Dispute> = { ...editForm };
    if (payload.amount !== undefined) payload.amount = parseFloat(String(payload.amount));
    await supabase.from('disputes').update(payload).eq('id', id);
    setEditingId(null);
    setEditForm({});
    await fetchData();
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
    <Section className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Open disputes"
          value={String(openDisputes.length)}
          variant={openDisputes.length > 0 ? 'danger' : 'success'}
        />
        <StatCard label="Total at risk" value={atRiskStr} variant="warning" />
        <StatCard label="Total disputes" value={String(disputes.length)} />
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button variant="primary" icon={<IconPlus />} onClick={() => setShowAddForm((v) => !v)}>
          Dispute hinzufügen
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card padding="md">
          <h3 className="lt-text-h1 mb-4">Neuer Dispute</h3>
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
              label="Brand"
              value={form.brand}
              onChange={(v) => setForm((f) => ({ ...f, brand: v as Brand }))}
              options={BRANDS.map((b) => ({ value: b, label: b }))}
            />
            <Input
              label="Case ID"
              required
              placeholder="PP-12345-XXXXX"
              value={form.case_id}
              onChange={(v) => setForm((f) => ({ ...f, case_id: v }))}
            />
            <Select
              label="Platform"
              value={form.platform}
              onChange={(v) => setForm((f) => ({ ...f, platform: v as Platform }))}
              options={PLATFORMS.map((p) => ({ value: p, label: p }))}
            />
            <Input
              label="Amount"
              required
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            />
            <Select
              label="Currency"
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
            />
          </div>
          <div className="mt-3">
            <label className="lt-label">Notes</label>
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
              {submitting ? 'Speichere…' : 'Save Dispute'}
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
      ) : disputes.length === 0 ? (
        <Card padding="lg">
          <div className="lt-empty">Noch keine Disputes erfasst.</div>
        </Card>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>Case ID</th>
              <th>Platform</th>
              <th>Amount</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => {
              const isEditing = editingId === d.id;
              const isResolved = d.status === 'resolved' || d.status === 'won' || d.status === 'lost';
              return (
                <React.Fragment key={d.id}>
                  <tr
                    onClick={() => !isEditing && startEdit(d)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="lt-td-meta capitalize">{d.brand}</td>
                    <td className="lt-td-meta" style={{ fontFamily: 'monospace' }}>{d.case_id}</td>
                    <td className="lt-td-meta">{d.platform}</td>
                    <td className="lt-td-amount">{formatAmount(d.amount, d.currency)}</td>
                    <td className="lt-td-meta">
                      {formatDate(d.deadline)}
                      {!isResolved && daysUntil(d.deadline) !== null && (
                        <span style={{ marginLeft: '0.375rem', opacity: 0.7, fontSize: '0.75rem' }}>
                          ({daysUntil(d.deadline)}d)
                        </span>
                      )}
                    </td>
                    <td>
                      <Pill variant={STATUS_VARIANT[d.status]}>{d.status}</Pill>
                    </td>
                    <td className="lt-td-meta" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {d.notes ?? '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {!isResolved && (
                        <Button variant="success" size="sm" icon={<IconCheck />} onClick={() => handleMarkResolved(d.id)}>
                          Resolve
                        </Button>
                      )}
                    </td>
                  </tr>
                  {isEditing && (
                    <tr>
                      <td colSpan={8} style={{ background: 'rgba(51,79,180,0.04)', borderTop: '1px solid rgba(51,79,180,0.15)', padding: '1rem' }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <Select
                            label="Brand"
                            value={editForm.brand ?? d.brand}
                            onChange={(v) => setEditForm((f) => ({ ...f, brand: v as Brand }))}
                            options={BRANDS.map((b) => ({ value: b, label: b }))}
                          />
                          <Input
                            label="Case ID"
                            value={String(editForm.case_id ?? d.case_id)}
                            onChange={(v) => setEditForm((f) => ({ ...f, case_id: v }))}
                          />
                          <Select
                            label="Status"
                            value={editForm.status ?? d.status}
                            onChange={(v) => setEditForm((f) => ({ ...f, status: v as DisputeStatus }))}
                            options={DISPUTE_STATUSES.map((s) => ({ value: s, label: s }))}
                          />
                          <Input
                            label="Amount"
                            type="number"
                            step="0.01"
                            min={0}
                            value={String(editForm.amount ?? d.amount)}
                            onChange={(v) => setEditForm((f) => ({ ...f, amount: parseFloat(v) }))}
                          />
                          <Select
                            label="Platform"
                            value={editForm.platform ?? d.platform}
                            onChange={(v) => setEditForm((f) => ({ ...f, platform: v as Platform }))}
                            options={PLATFORMS.map((p) => ({ value: p, label: p }))}
                          />
                          <Select
                            label="Currency"
                            value={editForm.currency ?? d.currency}
                            onChange={(v) => setEditForm((f) => ({ ...f, currency: v as Currency }))}
                            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                          />
                          <Input
                            label="Deadline"
                            type="date"
                            value={String(editForm.deadline ?? d.deadline ?? '')}
                            onChange={(v) => setEditForm((f) => ({ ...f, deadline: v }))}
                          />
                          <Input
                            label="Notes"
                            value={String(editForm.notes ?? d.notes ?? '')}
                            onChange={(v) => setEditForm((f) => ({ ...f, notes: v }))}
                          />
                        </div>
                        <div className="flex gap-2 mt-3 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditForm({}); }}>
                            Abbrechen
                          </Button>
                          <Button variant="primary" size="sm" onClick={() => handleEditSave(d.id)}>
                            Save Changes
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
    </Section>
  );
}

export default DisputesTab;
