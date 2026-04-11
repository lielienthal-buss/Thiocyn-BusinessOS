import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PipelineItem, CashSnapshot, Currency } from './financeTypes';
import { formatAmount, formatDate } from './financeHelpers';
import { optimizePayments, generatePeterBrief } from '@/lib/payment-optimizer';
import type { ScheduledPayment, OptimizerOutput } from '@/lib/payment-optimizer';
import {
  Section,
  Card,
  Button,
  StatCard,
  Pill,
  IconDocument,
  IconClose,
} from '@/components/ui/light';

// ─── Payment Plan Tab ─────────────────────────────────────────────────────────
// Welle 2 Code-Block 2 — Optimizer + 30d Forecast + Peter-Brief Generator.
// Welle 3 Stage 3 — Light Glass refactor.

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

  const optimizerOutput: OptimizerOutput = useMemo(() => {
    return optimizePayments({
      invoices,
      available_cash_eur: availableCashEur,
      reserve_eur: reserveBuffer,
    });
  }, [invoices, availableCashEur, reserveBuffer]);

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
      <Section>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
        </div>
      </Section>
    );
  }

  const stats = optimizerOutput.stats;
  const overrun = optimizerOutput.budget_overrun_eur;

  return (
    <Section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="lt-text-h1" style={{ fontSize: '1.25rem' }}>Payment Plan</h2>
        <p className="lt-text-meta mt-1">
          Optimizer-Vorschlag basierend auf Mahnstufe, Priority-Tier und Cash-Position.
          UI schreibt nicht in DB — du entscheidest manuell.
        </p>
      </div>

      {/* Cash + Reserve Controls */}
      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="lt-label">Verfügbares Cash (EUR)</label>
            <input
              type="number"
              step="100"
              className="lt-input lt-tabular"
              placeholder={availableCashEur.toFixed(2)}
              value={manualCashOverride}
              onChange={(e) => setManualCashOverride(e.target.value)}
            />
            <p className="lt-text-meta lt-text-muted mt-1">
              {manualCashOverride ? 'Manueller Override' : `Aus latest cash_snapshots: ${formatAmount(availableCashEur, 'EUR')}`}
            </p>
          </div>
          <div>
            <label className="lt-label">Reserve-Buffer (EUR)</label>
            <input
              type="number"
              step="500"
              className="lt-input lt-tabular"
              value={reserveBuffer}
              onChange={(e) => setReserveBuffer(parseFloat(e.target.value) || 0)}
            />
            <p className="lt-text-meta lt-text-muted mt-1">
              Nicht antasten — Polster für unerwartete Lastschriften
            </p>
          </div>
          <div>
            <label className="lt-label">Budget für Plan</label>
            <p
              className="lt-tabular"
              style={{
                fontSize: '1.625rem',
                fontWeight: 800,
                color: overrun > 0 ? '#dc2626' : '#1a8a2e',
                lineHeight: 1.1,
                marginTop: '0.25rem',
              }}
            >
              {formatAmount(Math.max(0, availableCashEur - reserveBuffer), 'EUR')}
            </p>
            {overrun > 0 && (
              <p className="lt-text-meta lt-text-danger mt-1" style={{ fontWeight: 700 }}>
                ⚠️ Über-Budget: {formatAmount(overrun, 'EUR')}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Offen total"
          value={String(stats.total_open)}
          sub={formatAmount(stats.total_eur, 'EUR')}
          size="md"
        />
        <StatCard
          label="Sofort"
          value={String(stats.sofort_count)}
          sub="heute"
          variant={stats.sofort_count > 0 ? 'danger' : 'success'}
          size="md"
        />
        <StatCard
          label="Diese Woche"
          value={String(stats.next_7d_count)}
          sub="≤ 7 Tage"
          variant="warning"
          size="md"
        />
        <StatCard
          label="Auto-paid"
          value={String(stats.auto_paid_count)}
          sub="Lastschrift/Card"
          size="md"
        />
      </div>

      {/* USD Posten Warning */}
      {optimizerOutput.foreign_currency_items.length > 0 && (
        <Card padding="md">
          <div className="lt-text-label">{optimizerOutput.foreign_currency_items.length} Fremdwährungs-Posten</div>
          <p className="lt-text-body lt-text-secondary mt-1">
            ${stats.total_usd.toFixed(2)} USD nicht im EUR-Cash-Plan. Manuell zahlen oder über separates USD-Konto.
          </p>
          <ul className="lt-text-meta mt-2 space-y-0.5">
            {optimizerOutput.foreign_currency_items.map((i) => (
              <li key={i.id}>
                • {i.vendor} — {formatAmount(Number(i.amount), i.currency as Currency)} ({ENTITY_LABELS[i.entity] ?? i.entity})
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Peter Brief Action */}
      <Card padding="md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="lt-text-h1" style={{ color: 'var(--tc-gold)' }}>
              Peter-Approval-Brief
            </h3>
            <p className="lt-text-meta mt-1">
              Generiert WhatsApp-fertigen 5-Punkt-Brief für Peter mit allen sofort-fälligen Posten.
              Format: max 5 Bullets, frage am Ende — per peter-hart.md preference.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="ghost" onClick={() => setShowBriefModal(true)}>
              Vorschau
            </Button>
            <Button variant="primary" icon={<IconDocument />} onClick={handleCopyBrief}>
              {briefCopied ? 'Kopiert!' : 'Kopieren'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Brief Modal */}
      {showBriefModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowBriefModal(false)}
        >
          <div
            className="lt-card-plain max-w-lg w-full max-h-[80vh] overflow-y-auto"
            style={{ padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="lt-text-h1" style={{ color: '#1d1d1f', fontSize: '1.125rem' }}>
                Peter-Brief Vorschau
              </h3>
              <button
                onClick={() => setShowBriefModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6e6e73',
                  padding: '0.25rem',
                }}
                aria-label="Schließen"
              >
                <IconClose />
              </button>
            </div>
            <pre
              className="whitespace-pre-wrap font-mono"
              style={{
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '0.625rem',
                padding: '1rem',
                fontSize: '0.8125rem',
                color: '#1d1d1f',
                maxHeight: '50vh',
                overflowY: 'auto',
                lineHeight: 1.5,
              }}
            >
              {peterBrief}
            </pre>
            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="ghost" onClick={() => setShowBriefModal(false)}>
                Schließen
              </Button>
              <Button variant="primary" icon={<IconDocument />} onClick={handleCopyBrief}>
                {briefCopied ? 'Kopiert!' : 'In Zwischenablage'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Day Buckets — 30d Forecast */}
      <div>
        <h3 className="lt-text-label mb-3">
          30-Tage-Plan ({dayBuckets.length} Tage mit Zahlungen)
        </h3>
        {dayBuckets.length === 0 ? (
          <Card padding="lg">
            <div className="lt-empty">Keine offenen Posten — alles bezahlt</div>
          </Card>
        ) : (
          <div className="space-y-3">
            {dayBuckets.slice(0, 30).map((bucket) => {
              const isToday = bucket.daysFromToday <= 0;
              const isThisWeek = bucket.daysFromToday >= 0 && bucket.daysFromToday <= 7;
              return (
                <Card key={bucket.date} padding="none">
                  <div className="px-5 py-3 flex items-center justify-between lt-header-divider">
                    <div className="flex items-center gap-2">
                      <span className="lt-text-body">{formatDate(bucket.date)}</span>
                      {isToday && (
                        <Pill variant="danger">HEUTE / ÜBERFÄLLIG</Pill>
                      )}
                      {!isToday && (
                        <span className="lt-text-meta">(in {bucket.daysFromToday}d)</span>
                      )}
                      <Pill variant={isThisWeek ? 'warning' : 'neutral'}>
                        {bucket.items.length} Posten
                      </Pill>
                    </div>
                    <span className="lt-text-body lt-tabular">
                      {formatAmount(bucket.sumEur, 'EUR')}
                    </span>
                  </div>
                  <ul className="lt-divide">
                    {bucket.items.map((sp) => (
                      <li
                        key={sp.invoice.id}
                        className="flex items-center gap-3 px-5 py-2.5 hover:bg-black/[0.02] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="lt-text-body truncate">
                              {sp.invoice.vendor}
                            </span>
                            <span className="lt-text-meta">
                              {ENTITY_LABELS[sp.invoice.entity] ?? sp.invoice.entity}
                            </span>
                            {sp.invoice.mahnstufe > 0 && (
                              <Pill
                                variant={
                                  sp.invoice.mahnstufe === 4 ? 'stufe-4'
                                  : sp.invoice.mahnstufe === 3 ? 'stufe-3'
                                  : sp.invoice.mahnstufe === 2 ? 'stufe-2'
                                  : 'stufe-1'
                                }
                              >
                                Mahnstufe {sp.invoice.mahnstufe}
                              </Pill>
                            )}
                            {sp.auto_paid && <Pill variant="blue">Auto</Pill>}
                          </div>
                          <p className="lt-text-meta mt-1 truncate">{sp.rationale}</p>
                        </div>
                        <span className="lt-text-body lt-tabular flex-shrink-0">
                          {formatAmount(Number(sp.invoice.amount), sp.invoice.currency as Currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}

export default PaymentPlanTab;
