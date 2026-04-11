import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CashSnapshot, Currency } from './financeTypes';
import { CURRENCIES } from './financeTypes';
import { formatAmount, formatDate, daysUntil } from './financeHelpers';
import {
  Section,
  Card,
  Button,
  Input,
  Select,
  Pill,
  Table,
  IconPlus,
  IconTrash,
} from '@/components/ui/light';

// ─── Cash Position Tab ────────────────────────────────────────────────────────
// Welle 2 — Manuelle Saldo-Snapshots pro Konto.
// Welle 3 Stage 3 — Light Glass refactor.

interface AccountConfig {
  id: string;
  label: string;
  currency: Currency;
}

const PREDEFINED_ACCOUNTS: AccountConfig[] = [
  { id: 'qonto_thiocyn',  label: 'Qonto Thiocyn',  currency: 'EUR' },
  { id: 'qonto_paigh',    label: 'Qonto Paigh',    currency: 'EUR' },
  { id: 'dipq_postbank',  label: 'DIPQ Postbank',  currency: 'EUR' },
  { id: 'paypal_thiocyn', label: 'PayPal Thiocyn', currency: 'EUR' },
  { id: 'paypal_paigh',   label: 'PayPal Paigh',   currency: 'EUR' },
  { id: 'paypal_hart_limes', label: 'PayPal Hart Limes', currency: 'EUR' },
];

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manuell',
  qonto_api: 'Qonto API',
  paypal_api: 'PayPal API',
};

const SOURCE_VARIANT: Record<string, 'neutral' | 'blue' | 'gold'> = {
  manual: 'neutral',
  qonto_api: 'blue',
  paypal_api: 'gold',
};

const DEFAULT_FORM = {
  account: PREDEFINED_ACCOUNTS[0].id,
  custom_account: '',
  account_label: '',
  balance: '',
  currency: 'EUR' as Currency,
  snapshot_date: new Date().toISOString().slice(0, 10),
  notes: '',
  use_custom: false,
};

function CashTab() {
  const [snapshots, setSnapshots] = useState<CashSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cash_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (!error && data) setSnapshots(data as CashSnapshot[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group: latest snapshot per account
  const latestByAccount = snapshots.reduce((acc: Record<string, CashSnapshot>, s) => {
    if (!acc[s.account]) acc[s.account] = s;
    return acc;
  }, {});

  // Cleaner delta calc: get the second-most-recent per account
  const deltaByAccount: Record<string, number> = {};
  const seen: Record<string, number> = {};
  for (const s of snapshots) {
    seen[s.account] = (seen[s.account] ?? 0) + 1;
    if (seen[s.account] === 2 && latestByAccount[s.account]) {
      deltaByAccount[s.account] = latestByAccount[s.account].balance - s.balance;
    }
  }

  // Total per currency (latest only)
  const totalByCurrency = Object.values(latestByAccount).reduce(
    (acc: Record<string, number>, s) => {
      acc[s.currency] = (acc[s.currency] ?? 0) + s.balance;
      return acc;
    },
    {}
  );

  const handleAdd = async () => {
    const accountId = form.use_custom ? form.custom_account.trim() : form.account;
    if (!accountId) {
      setError('Account ist Pflicht.');
      return;
    }
    if (!form.balance || isNaN(parseFloat(form.balance))) {
      setError('Saldo muss eine gültige Zahl sein.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const predefined = PREDEFINED_ACCOUNTS.find((a) => a.id === accountId);
    const label = form.account_label.trim() || predefined?.label || accountId;

    const { error } = await supabase.from('cash_snapshots').insert({
      account: accountId,
      account_label: label,
      balance: parseFloat(form.balance),
      currency: form.currency,
      snapshot_date: form.snapshot_date,
      source: 'manual',
      notes: form.notes.trim() || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setForm({
        ...DEFAULT_FORM,
        snapshot_date: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
      await load();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('cash_snapshots').delete().eq('id', id);
    await load();
    setDeleting(null);
  };

  if (loading) {
    return (
      <Section>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
        </div>
      </Section>
    );
  }

  const accountIds = Object.keys(latestByAccount);

  return (
    <Section className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="lt-text-h1" style={{ fontSize: '1.25rem' }}>Cash Position</h2>
          <p className="lt-text-meta mt-1">
            Saldo-Tracking pro Konto. Manuell oder über API-Sync (Phase 2).
          </p>
        </div>
        <Button variant="primary" icon={<IconPlus />} onClick={() => setShowForm((v) => !v)}>
          Saldo eintragen
        </Button>
      </div>

      {/* Total Card */}
      {Object.keys(totalByCurrency).length > 0 && (
        <Card padding="lg" className="lt-card-total">
          <div className="lt-text-label">Gesamt verfügbar (latest snapshots)</div>
          <div
            className="lt-tabular mt-1"
            style={{ fontSize: '2rem', fontWeight: 800, color: '#1a8a2e', letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            {Object.entries(totalByCurrency)
              .map(([cur, val]) => formatAmount(val, cur as Currency))
              .join(' + ')}
          </div>
          <div className="lt-text-meta mt-1">
            {accountIds.length} Konto{accountIds.length !== 1 ? 's' : ''} mit Snapshot
          </div>
        </Card>
      )}

      {/* Add Form */}
      {showForm && (
        <Card padding="md">
          <h3 className="lt-text-h1 mb-4">Neuer Saldo-Snapshot</h3>
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
            <div className="col-span-2">
              <label className="lt-label">Konto</label>
              {!form.use_custom ? (
                <select
                  className="lt-select"
                  value={form.account}
                  onChange={(e) => {
                    const acc = PREDEFINED_ACCOUNTS.find((a) => a.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      account: e.target.value,
                      currency: acc?.currency ?? f.currency,
                    }));
                  }}
                >
                  {PREDEFINED_ACCOUNTS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="lt-input"
                  placeholder="z.B. wise_thiocyn"
                  value={form.custom_account}
                  onChange={(e) => setForm((f) => ({ ...f, custom_account: e.target.value }))}
                />
              )}
              <button
                onClick={() => setForm((f) => ({ ...f, use_custom: !f.use_custom }))}
                className="lt-text-meta mt-1"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {form.use_custom ? '← Vordefiniert wählen' : '+ Eigener Account-Identifier'}
              </button>
            </div>
            <Input
              label="Saldo"
              required
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.balance}
              onChange={(v) => setForm((f) => ({ ...f, balance: v }))}
            />
            <Select
              label="Währung"
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            <Input
              label="Stand vom"
              type="date"
              value={form.snapshot_date}
              onChange={(v) => setForm((f) => ({ ...f, snapshot_date: v }))}
            />
            <div className="col-span-2 sm:col-span-3">
              <Input
                label="Notiz (optional)"
                placeholder="z.B. nach Sammelüberweisung"
                value={form.notes}
                onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="ghost" onClick={() => { setShowForm(false); setError(null); }}>
              Abbrechen
            </Button>
            <Button variant="primary" onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Speichere…' : 'Snapshot speichern'}
            </Button>
          </div>
        </Card>
      )}

      {/* Account Cards */}
      {accountIds.length > 0 && (
        <div>
          <h3 className="lt-text-label mb-3">Aktuelle Salden</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountIds.map((accountId) => {
              const latest = latestByAccount[accountId];
              const delta = deltaByAccount[accountId];
              const daysOld = daysUntil(latest.snapshot_date);
              const stale = daysOld !== null && daysOld < -7;

              return (
                <Card key={accountId} padding="md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="lt-text-meta truncate">
                        {latest.account_label ?? latest.account}
                      </p>
                      <p className="lt-text-h1 lt-tabular mt-1" style={{ fontSize: '1.25rem' }}>
                        {formatAmount(latest.balance, latest.currency as Currency)}
                      </p>
                    </div>
                    {delta !== undefined && delta !== 0 && (
                      <span
                        className="lt-text-body lt-tabular whitespace-nowrap"
                        style={{ color: delta > 0 ? '#1a8a2e' : '#dc2626' }}
                      >
                        {delta > 0 ? '+' : ''}
                        {formatAmount(delta, latest.currency as Currency)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="lt-text-meta lt-text-muted">
                      Stand: {formatDate(latest.snapshot_date)}
                    </span>
                    {stale && <Pill variant="warning">&gt;7d alt</Pill>}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* History Table */}
      <div>
        <h3 className="lt-text-label mb-3">
          Snapshot-Historie ({snapshots.length})
        </h3>
        {snapshots.length === 0 ? (
          <Card padding="lg">
            <div className="lt-empty">Noch keine Cash-Snapshots eingetragen.</div>
          </Card>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Konto</th>
                <th>Saldo</th>
                <th>Quelle</th>
                <th>Notiz</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id} className="group">
                  <td className="lt-td-meta">{formatDate(s.snapshot_date)}</td>
                  <td className="lt-td-vendor">{s.account_label ?? s.account}</td>
                  <td className="lt-td-amount">
                    {formatAmount(s.balance, s.currency as Currency)}
                  </td>
                  <td>
                    <Pill variant={SOURCE_VARIANT[s.source] ?? 'neutral'}>
                      {SOURCE_LABELS[s.source] ?? s.source}
                    </Pill>
                  </td>
                  <td className="lt-td-meta" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.notes ?? '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
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
                      {deleting === s.id ? '…' : <IconTrash />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Section>
  );
}

export default CashTab;
