import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Mahnung, Currency } from './financeTypes';
import { formatAmount, formatDate, daysUntil } from './financeHelpers';
import { Card, Pill, IconAlert, IconFlame, IconChevronRight } from '@/components/ui/light';
import MahnungDetailSlideOver from './MahnungDetailSlideOver';

// ─── Mahnungen Banner ─────────────────────────────────────────────────────────
// Welle 2 Code-Block 1 — listet alle offenen Mahnungen aus finance_mahnungen.
// Welle 3 Code-Block 1 — Light Glass + Click-to-Detail SlideOver.

const STUFEN_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Erinnerung',
  2: '1. Mahnung',
  3: '2./Letzte Mahnung',
  4: 'Inkasso',
};

const STUFEN_VARIANT: Record<1 | 2 | 3 | 4, 'stufe-1' | 'stufe-2' | 'stufe-3' | 'stufe-4'> = {
  1: 'stufe-1',
  2: 'stufe-2',
  3: 'stufe-3',
  4: 'stufe-4',
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
  const [selected, setSelected] = useState<Mahnung | null>(null);

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

  if (loading) return null;
  if (mahnungen.length === 0) return null;

  // Sum totals per currency
  const sumByCurrency = mahnungen.reduce((groups: Record<string, number>, m) => {
    groups[m.currency] = (groups[m.currency] ?? 0) + m.amount;
    return groups;
  }, {} as Record<string, number>);

  const totalLabel = Object.entries(sumByCurrency)
    .map(([cur, val]: [string, number]) => formatAmount(val, cur as Currency))
    .join(' + ');

  const hasInkasso = mahnungen.some((m) => m.stufe === 4);
  const hasLetzte = mahnungen.some((m) => m.stufe === 3);

  return (
    <>
      <Card padding="none">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between gap-4 lt-header-divider">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`lt-icon-pill ${hasInkasso ? 'lt-icon-pill-danger' : 'lt-icon-pill-warning'}`}>
              {hasInkasso ? <IconFlame /> : <IconAlert />}
            </span>
            <h3 className="lt-text-h1">
              Offene Mahnungen
              <span className="lt-text-meta lt-text-muted ml-2">({mahnungen.length})</span>
            </h3>
            {(hasInkasso || hasLetzte) && (
              <Pill variant="alert" pulse>
                {hasInkasso ? 'INKASSO' : 'STUFE 3'} — SOFORT zahlen
              </Pill>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="lt-text-label">Gesamt offen</div>
            <div className="lt-text-h1 lt-text-danger lt-tabular mt-0.5">{totalLabel}</div>
          </div>
        </div>

        {/* List */}
        <ul className="lt-divide">
          {mahnungen.map((m) => {
            const stufe = m.stufe as 1 | 2 | 3 | 4;
            const daysSince = daysUntil(m.received_at);
            const daysSinceLabel =
              daysSince !== null && daysSince <= 0 ? `vor ${Math.abs(daysSince)}d` : '—';

            return (
              <li
                key={m.id}
                onClick={() => setSelected(m)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-black/[0.025] transition-colors cursor-pointer group"
              >
                {/* Stufe Badge */}
                <Pill variant={STUFEN_VARIANT[stufe]} title={STUFEN_LABELS[stufe]}>
                  Stufe {stufe}
                </Pill>

                {/* Vendor + Entity */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="lt-text-body truncate">{m.vendor}</span>
                    <span className="lt-text-meta">
                      {ENTITY_LABELS[m.entity] ?? m.entity}
                    </span>
                    {!m.pipeline_id && (
                      <Pill variant="neutral" title="Keine Pipeline-Zuordnung — bitte verifizieren">
                        orphan
                      </Pill>
                    )}
                  </div>
                  {m.notes && (
                    <p className="lt-text-meta mt-1 truncate">{m.notes}</p>
                  )}
                </div>

                {/* Eingang */}
                <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                  <span className="lt-text-meta">{formatDate(m.received_at)}</span>
                  <span className="lt-text-meta lt-text-muted">{daysSinceLabel}</span>
                </div>

                {/* Amount */}
                <span className="lt-text-body lt-tabular flex-shrink-0">
                  {formatAmount(m.amount, m.currency as Currency)}
                </span>

                {/* Chevron — affordance to indicate clickable */}
                <span
                  className="lt-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-hidden="true"
                >
                  <IconChevronRight />
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <MahnungDetailSlideOver
        open={selected !== null}
        mahnung={selected}
        onClose={() => setSelected(null)}
        onPaid={() => {
          load();
          onChange?.();
        }}
      />
    </>
  );
}

export default MahnungenBanner;
