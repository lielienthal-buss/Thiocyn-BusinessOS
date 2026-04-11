import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Mahnung, Currency } from './financeTypes';
import { formatAmount, formatDate, daysUntil } from './financeHelpers';

// ─── Mahnungen Banner ─────────────────────────────────────────────────────────
// Welle 2 Code-Block 1 — listet alle offenen Mahnungen (status='open') aus
// finance_mahnungen, sortiert nach Stufe DESC (Inkasso zuerst).
// Beim "Bezahlt"-Klick wird sowohl die Mahnung als auch der gelinkte
// finance_pipeline-Eintrag aktualisiert.

const STUFEN_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Erinnerung',
  2: '1. Mahnung',
  3: '2./Letzte Mahnung',
  4: 'Inkasso',
};

const STUFEN_STYLES: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  2: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  3: 'bg-red-500/15 text-red-400 border-red-500/30',
  4: 'bg-red-500/30 text-red-300 border-red-500/50',
};

const ENTITY_LABELS: Record<string, string> = {
  'thiocyn': 'Thiocyn',
  'hart-limes': 'Hart Limes',
  'paigh': 'Paigh',
  'dr-severin': 'Dr. Severin',
  'take-a-shot': 'Take A Shot',
  'wristr': 'Wristr',
  'timber-john': 'Timber & John',
};

interface Props {
  /** Optional callback fired after a mahnung is marked paid (so parent can reload) */
  onChange?: () => void;
}

function MahnungenBanner({ onChange }: Props) {
  const [mahnungen, setMahnungen] = useState<Mahnung[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('finance_mahnungen')
      .select('*')
      .eq('status', 'open')
      .order('stufe', { ascending: false })
      .order('amount', { ascending: false });
    if (!error && data) setMahnungen(data as Mahnung[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (m: Mahnung) => {
    setUpdating(m.id);
    const today = new Date().toISOString().slice(0, 10);

    // 1) Mahnung als bezahlt markieren
    await supabase
      .from('finance_mahnungen')
      .update({ status: 'paid' })
      .eq('id', m.id);

    // 2) Gelinkten Pipeline-Eintrag auch als bezahlt markieren
    if (m.pipeline_id) {
      await supabase
        .from('finance_pipeline')
        .update({ status: 'bezahlt', paid_at: today, mahnstufe: 0 })
        .eq('id', m.pipeline_id);
    }

    await load();
    onChange?.();
    setUpdating(null);
  };

  if (loading) return null;
  if (mahnungen.length === 0) return null;

  // Sum totals per currency
  const sumByCurrency = mahnungen.reduce((groups: Record<string, number>, m) => {
    groups[m.currency] = (groups[m.currency] ?? 0) + m.amount;
    return groups;
  }, {});

  const totalLabel = Object.entries(sumByCurrency)
    .map(([cur, val]) => formatAmount(val, cur as Currency))
    .join(' + ');

  const hasInkasso = mahnungen.some((m) => m.stufe === 4);
  const hasLetzte = mahnungen.some((m) => m.stufe === 3);

  return (
    <div
      className={`bg-surface-800/60 border-2 rounded-2xl shadow-sm overflow-hidden ${
        hasInkasso ? 'border-red-500/40' : hasLetzte ? 'border-red-500/25' : 'border-orange-500/25'
      }`}
    >
      {/* Header */}
      <div
        className={`px-5 py-3.5 flex items-center justify-between ${
          hasInkasso ? 'bg-red-500/10' : hasLetzte ? 'bg-red-500/5' : 'bg-orange-500/5'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{hasInkasso ? '🔥' : '🚨'}</span>
          <h3 className="text-sm font-bold text-slate-100">
            Offene Mahnungen ({mahnungen.length})
          </h3>
          {(hasInkasso || hasLetzte) && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-red-500/20 text-red-300 border-red-500/40 animate-pulse">
              {hasInkasso ? 'INKASSO' : 'STUFE 3'} — SOFORT zahlen
            </span>
          )}
        </div>
        <span className="text-sm font-bold text-red-400 tabular-nums">{totalLabel}</span>
      </div>

      {/* List */}
      <ul className="divide-y divide-white/[0.04]">
        {mahnungen.map((m) => {
          const stufe = m.stufe as 1 | 2 | 3 | 4;
          const isUrgent = stufe >= 3;
          const daysSince = daysUntil(m.received_at);
          const daysSinceLabel =
            daysSince !== null && daysSince <= 0 ? `vor ${Math.abs(daysSince)}d` : '—';

          return (
            <li
              key={m.id}
              className={`flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors ${
                isUrgent ? 'bg-red-500/[0.03]' : ''
              }`}
            >
              {/* Stufe Badge */}
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STUFEN_STYLES[stufe]}`}
                title={STUFEN_LABELS[stufe]}
              >
                Stufe {stufe}
              </span>

              {/* Vendor + Entity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100 truncate">
                    {m.vendor}
                  </span>
                  <span className="text-xs text-slate-500">
                    {ENTITY_LABELS[m.entity] ?? m.entity}
                  </span>
                  {!m.pipeline_id && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/20"
                      title="Keine Pipeline-Zuordnung — bitte verifizieren"
                    >
                      orphan
                    </span>
                  )}
                </div>
                {m.notes && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{m.notes}</p>
                )}
              </div>

              {/* Eingang */}
              <div className="hidden sm:flex flex-col items-end text-xs text-slate-500 flex-shrink-0">
                <span>{formatDate(m.received_at)}</span>
                <span className="text-[10px] opacity-70">{daysSinceLabel}</span>
              </div>

              {/* Amount */}
              <span className="text-sm font-bold text-slate-100 tabular-nums flex-shrink-0">
                {formatAmount(m.amount, m.currency as Currency)}
              </span>

              {/* Mark Paid */}
              <button
                onClick={() => handleMarkPaid(m)}
                disabled={updating === m.id}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                  isUrgent
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25'
                } disabled:opacity-50`}
              >
                {updating === m.id ? '…' : isUrgent ? '🔥 Sofort zahlen' : '✓ Bezahlt'}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default MahnungenBanner;
