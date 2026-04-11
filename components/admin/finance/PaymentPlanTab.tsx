import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PipelineItem, CashSnapshot, Currency } from './financeTypes';
import { formatAmount, formatDate, daysUntil } from './financeHelpers';
import { EmptyState } from './StatusBadge';
import { optimizePayments, generatePeterBrief } from '@/lib/payment-optimizer';
import type { ScheduledPayment, OptimizerOutput } from '@/lib/payment-optimizer';

// ─── Payment Plan Tab ─────────────────────────────────────────────────────────
// Welle 2 Code-Block 2 — Optimizer + 30d Forecast + Peter-Brief Generator.
// Pure client-side. Schreibt NICHT in DB. UI zeigt was der Optimizer empfiehlt;
// Luis entscheidet ob er das übernimmt.

const ENTITY_LABELS: Record<string, string> = {
  'thiocyn': 'Thiocyn',
  'hart-limes': 'Hart Limes',
  'paigh': 'Paigh',
  'dr-severin': 'Dr. Severin',
  'take-a-shot': 'Take A Shot',
  'wristr': 'Wristr',
  'timber-john': 'Timber & John',
};

interface DayBucket {
  date: string;
  daysFromToday: number;
  items: ScheduledPayment[];
  sumEur: number;
}

function PaymentPlanTab() {
  const [invoices, setInvoices] = useState<PipelineItem[]>([]);
  const [snapshots, setSnapshots] = useState<CashSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveBuffer, setReserveBuffer] = useState(5000);
  const [manualCashOverride, setManualCashOverride] = useState<string>('');
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [iRes, cRes] = await Promise.all([
      supabase.from('finance_pipeline').select('*').is('paid_at', null),
      supabase.from('cash_snapshots').select('*').order('snapshot_date', { ascending: false }),
    ]);
    if (iRes.data) setInvoices(iRes.data as PipelineItem[]);
    if (cRes.data) setSnapshots(cRes.data as CashSnapshot[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute available cash from latest snapshot per account, EUR only
  const availableCashEur = useMemo(() => {
    if (manualCashOverride && !isNaN(parseFloat(manualCashOverride))) {
      return parseFloat(manualCashOverride);
    }
    const latest: Record<string, CashSnapshot> = {};
    for (const s of snapshots) {
      if (!latest[s.account]) latest[s.account] = s;
    }
    return Object.values(latest)
      .filter((s) => s.currency === 'EUR')
      .reduce((sum, s) => sum + Number(s.balance), 0);
  }, [snapshots, manualCashOverride]);

  // Run optimizer
  const optimizerOutput: OptimizerOutput = useMemo(() => {
    return optimizePayments({
      invoices,
      available_cash_eur: availableCashEur,
      reserve_eur: reserveBuffer,
    });
  }, [invoices, availableCashEur, reserveBuffer]);

  // Group by date for the calendar view
  const dayBuckets: DayBucket[] = useMemo(() => {
    const buckets: Record<string, DayBucket> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const sp of optimizerOutput.schedule) {
      if (!buckets[sp.scheduled_pay_date]) {
        buckets[sp.scheduled_pay_date] = {
          date: sp.scheduled_pay_date,
          daysFromToday: sp.days_from_today,
          items: [],
          sumEur: 0,
        };
      }
      buckets[sp.scheduled_pay_date].items.push(sp);
      if (sp.invoice.currency === 'EUR') {
        buckets[sp.scheduled_pay_date].sumEur += Number(sp.invoice.amount);
      }
    }
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [optimizerOutput]);

  const peterBrief = useMemo(
    () => generatePeterBrief(optimizerOutput),
    [optimizerOutput]
  );

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(peterBrief);
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = peterBrief;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const stats = optimizerOutput.stats;
  const overrun = optimizerOutput.budget_overrun_eur;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Payment Plan</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Optimizer-Vorschlag basierend auf Mahnstufe, Priority-Tier und Cash-Position.
          UI schreibt nicht in DB — du entscheidest manuell.
        </p>
      </div>

      {/* Cash + Reserve Controls */}
      <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              Verfügbares Cash (EUR)
            </label>
            <input
              type="number"
              step="100"
              className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100 tabular-nums"
              placeholder={availableCashEur.toFixed(2)}
              value={manualCashOverride}
              onChange={(e) => setManualCashOverride(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {manualCashOverride ? 'Manueller Override' : `Aus latest cash_snapshots: ${formatAmount(availableCashEur, 'EUR')}`}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              Reserve-Buffer (EUR)
            </label>
            <input
              type="number"
              step="500"
              className="w-full border border-white/[0.06] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-surface-900/60 text-slate-100 tabular-nums"
              value={reserveBuffer}
              onChange={(e) => setReserveBuffer(parseFloat(e.target.value) || 0)}
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Nicht antasten — Polster für unerwartete Lastschriften
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
              Budget für Plan
            </label>
            <p
              className={`text-2xl font-black tabular-nums ${
                overrun > 0 ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {formatAmount(Math.max(0, availableCashEur - reserveBuffer), 'EUR')}
            </p>
            {overrun > 0 && (
              <p className="text-[10px] text-red-400 font-bold mt-1">
                ⚠️ Über-Budget: {formatAmount(overrun, 'EUR')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Offen total" value={String(stats.total_open)} sub={formatAmount(stats.total_eur, 'EUR')} color="text-slate-100" />
        <StatCard label="🔥 Sofort" value={String(stats.sofort_count)} sub="heute" color={stats.sofort_count > 0 ? 'text-red-400' : 'text-emerald-400'} />
        <StatCard label="Diese Woche" value={String(stats.next_7d_count)} sub="≤ 7 Tage" color="text-amber-400" />
        <StatCard label="Auto-paid" value={String(stats.auto_paid_count)} sub="Lastschrift/Card" color="text-blue-400" />
      </div>

      {/* USD Posten Warning */}
      {optimizerOutput.foreign_currency_items.length > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4">
          <p className="text-xs font-bold text-purple-300 uppercase tracking-wide">
            💱 {optimizerOutput.foreign_currency_items.length} Fremdwährungs-Posten
          </p>
          <p className="text-sm text-slate-300 mt-1">
            ${stats.total_usd.toFixed(2)} USD nicht im EUR-Cash-Plan. Manuell zahlen oder über separates USD-Konto.
          </p>
          <ul className="text-xs text-slate-400 mt-2 space-y-0.5">
            {optimizerOutput.foreign_currency_items.map((i) => (
              <li key={i.id}>
                • {i.vendor} — {formatAmount(Number(i.amount), i.currency as Currency)} ({ENTITY_LABELS[i.entity] ?? i.entity})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Peter Brief Action */}
      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-amber-300">📋 Peter-Approval-Brief</h3>
          <p className="text-xs text-slate-400 mt-1">
            Generiert WhatsApp-fertigen 5-Punkt-Brief für Peter mit allen sofort-fälligen Posten.
            Format: max 5 Bullets, frage am Ende — per peter-hart.md preference.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowBriefModal(true)}
            className="px-4 py-2 text-sm font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl hover:bg-amber-500/25 transition-colors"
          >
            Vorschau
          </button>
          <button
            onClick={handleCopyBrief}
            className="px-4 py-2 text-sm font-semibold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400 transition-colors"
          >
            {briefCopied ? '✓ Kopiert!' : '📋 Kopieren'}
          </button>
        </div>
      </div>

      {/* Brief Modal */}
      {showBriefModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowBriefModal(false)}
        >
          <div
            className="bg-surface-900 border border-white/[0.1] rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-white">📋 Peter-Brief Vorschau</h3>
              <button
                onClick={() => setShowBriefModal(false)}
                className="text-slate-500 hover:text-slate-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono bg-surface-800/60 border border-white/[0.06] rounded-xl p-4 max-h-[50vh] overflow-y-auto">
              {peterBrief}
            </pre>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowBriefModal(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:bg-white/[0.06] rounded-xl"
              >
                Schließen
              </button>
              <button
                onClick={handleCopyBrief}
                className="px-4 py-2 text-sm font-semibold bg-amber-500 text-slate-900 rounded-xl hover:bg-amber-400"
              >
                {briefCopied ? '✓ Kopiert!' : '📋 In Zwischenablage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Buckets — 30d Forecast */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          30-Tage-Plan ({dayBuckets.length} Tage mit Zahlungen)
        </h3>
        {dayBuckets.length === 0 ? (
          <EmptyState message="Keine offenen Posten — alles bezahlt 🎉" />
        ) : (
          <div className="space-y-3">
            {dayBuckets.slice(0, 30).map((bucket) => {
              const isToday = bucket.daysFromToday <= 0;
              const isThisWeek = bucket.daysFromToday >= 0 && bucket.daysFromToday <= 7;
              return (
                <div
                  key={bucket.date}
                  className={`border rounded-2xl overflow-hidden ${
                    isToday
                      ? 'bg-red-500/[0.04] border-red-500/30'
                      : isThisWeek
                      ? 'bg-amber-500/[0.03] border-amber-500/20'
                      : 'bg-surface-800/60 border-white/[0.06]'
                  }`}
                >
                  <div
                    className={`px-5 py-3 flex items-center justify-between ${
                      isToday ? 'bg-red-500/10' : isThisWeek ? 'bg-amber-500/5' : 'bg-surface-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        {formatDate(bucket.date)}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                          HEUTE / ÜBERFÄLLIG
                        </span>
                      )}
                      {!isToday && (
                        <span className="text-[10px] text-slate-500">
                          (in {bucket.daysFromToday}d)
                        </span>
                      )}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400 border border-slate-500/20">
                        {bucket.items.length} Posten
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-100 tabular-nums">
                      {formatAmount(bucket.sumEur, 'EUR')}
                    </span>
                  </div>
                  <ul className="divide-y divide-white/[0.04]">
                    {bucket.items.map((sp) => (
                      <li
                        key={sp.invoice.id}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-100 truncate">
                              {sp.invoice.vendor}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {ENTITY_LABELS[sp.invoice.entity] ?? sp.invoice.entity}
                            </span>
                            {sp.invoice.mahnstufe > 0 && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                  sp.invoice.mahnstufe >= 3
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                    : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                                }`}
                              >
                                Mahnstufe {sp.invoice.mahnstufe}
                              </span>
                            )}
                            {sp.auto_paid && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                Auto
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{sp.rationale}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-300 tabular-nums flex-shrink-0">
                          {formatAmount(Number(sp.invoice.amount), sp.invoice.currency as Currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl p-4">
      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

export default PaymentPlanTab;
