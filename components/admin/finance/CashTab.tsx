import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { CashSnapshot, Currency } from './financeTypes';
import { CURRENCIES } from './financeTypes';
import { formatAmount, formatDate, daysUntil } from './financeHelpers';
import { EmptyState } from './StatusBadge';

// ─── Cash Position Tab ────────────────────────────────────────────────────────
// Welle 2 Code-Block 1 — Manuelle Saldo-Snapshots pro Konto.
// Phase 2 (später): Qonto API automatischer Push für Qonto-Konten.

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

const SOURCE_STYLES: Record<string, string> = {
  manual: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  qonto_api: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  paypal_api: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
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

  // Previous snapshot per account (für Delta-Anzeige)
  const previousByAccount = snapshots.reduce((acc: Record<string, CashSnapshot>, s) => {
    if (!acc[s.account]) {
      // first hit = latest, skip
      acc[`__seen_${s.account}`] = s;
    } else if (!acc[s.account]) {
      // never reached
    } else if (acc[`__seen_${s.account}`] && !acc[s.account]) {
      acc[s.account] = s;
    }
    return acc;
  }, {} as Record<string, CashSnapshot>);

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
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const accountIds = Object.keys(latestByAccount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Cash Position</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Saldo-Tracking pro Konto. Manuell oder über API-Sync (Phase 2).
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Saldo eintragen
        </button>
      </div>

      {/* Total Card */}
      {Object.keys(totalByCurrency).length > 0 && (
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Gesamt verfügbar (latest snapshots)
          </p>
          <p className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
            {Object.entries(totalByCurrency)
              .map(([cur, val]) => formatAmount(val, cur as Currency))
              .join(' + ')}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {accountIds.length} Konto{accountIds.length !== 1 ? 's' : ''} mit Snapshot
          </p>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Neuer Saldo-Snapshot</h3>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Konto</label>
              {!form.use_custom ? (
                <select
                  className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100"
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
                  className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100"
                  placeholder="z.B. wise_thiocyn"
                  value={form.custom_account}
                  onChange={(e) => setForm((f) => ({ ...f, custom_account: e.target.value }))}
                />
              )}
              <button
                onClick={() => setForm((f) => ({ ...f, use_custom: !f.use_custom }))}
                className="text-[10px] text-slate-500 hover:text-slate-300 mt-1"
              >
                {form.use_custom ? '← Vordefiniert wählen' : '+ Eigener Account-Identifier'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Saldo *</label>
              <input
                type="number"
                step="0.01"
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100"
                placeholder="0.00"
                value={form.balance}
                onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Währung</label>
              <select
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Stand vom</label>
              <input
                type="date"
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100"
                value={form.snapshot_date}
                onChange={(e) => setForm((f) => ({ ...f, snapshot_date: e.target.value }))}
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">Notiz (optional)</label>
              <input
                className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100"
                placeholder="z.B. nach Sammelüberweisung"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setError(null); }}
              className="px-4 py-2 text-sm text-slate-300 font-medium hover:bg-white/[0.06] rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Speichere…' : 'Snapshot speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Account Cards */}
      {accountIds.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Aktuelle Salden
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountIds.map((accountId) => {
              const latest = latestByAccount[accountId];
              const delta = deltaByAccount[accountId];
              const daysOld = daysUntil(latest.snapshot_date);
              const stale = daysOld !== null && daysOld < -7;

              return (
                <div
                  key={accountId}
                  className={`border rounded-2xl p-4 ${
                    stale
                      ? 'bg-amber-500/5 border-amber-500/20'
                      : 'bg-surface-800/60 border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500 truncate">
                        {latest.account_label ?? latest.account}
                      </p>
                      <p className="text-lg font-black text-slate-100 mt-1 tabular-nums">
                        {formatAmount(latest.balance, latest.currency as Currency)}
                      </p>
                    </div>
                    {delta !== undefined && delta !== 0 && (
                      <span
                        className={`text-xs font-bold tabular-nums whitespace-nowrap ${
                          delta > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {delta > 0 ? '+' : ''}
                        {formatAmount(delta, latest.currency as Currency)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-slate-500">
                      Stand: {formatDate(latest.snapshot_date)}
                    </span>
                    {stale && (
                      <span className="text-[10px] font-bold text-amber-400">
                        ⚠️ &gt;7d alt
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* History Table */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Snapshot-Historie ({snapshots.length})
        </h3>
        {snapshots.length === 0 ? (
          <EmptyState message="Noch keine Cash-Snapshots eingetragen." />
        ) : (
          <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-surface-900/60">
                    {['Datum', 'Konto', 'Saldo', 'Quelle', 'Notiz', ''].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {snapshots.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {formatDate(s.snapshot_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-100 font-medium whitespace-nowrap">
                        {s.account_label ?? s.account}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-100 tabular-nums whitespace-nowrap">
                        {formatAmount(s.balance, s.currency as Currency)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            SOURCE_STYLES[s.source] ?? SOURCE_STYLES.manual
                          }`}
                        >
                          {SOURCE_LABELS[s.source] ?? s.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                        {s.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deleting === s.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-red-400 hover:text-red-300 disabled:opacity-30"
                          title="Löschen"
                        >
                          {deleting === s.id ? '…' : '🗑'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CashTab;
