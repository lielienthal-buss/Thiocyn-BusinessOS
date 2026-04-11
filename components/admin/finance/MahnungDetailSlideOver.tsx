import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Mahnung, PipelineItem, Currency } from './financeTypes';
import { formatAmount, formatDate, daysUntil } from './financeHelpers';
import { SlideOver, Button, Pill, IconFlame, IconCheck, IconExternalLink } from '@/components/ui/light';

// ─── Mahnung Detail SlideOver ─────────────────────────────────────────────────
// Right-side panel showing full details for a single Mahnung:
// - Vendor + Entity + Beträge
// - Mahnstufe + Status
// - Linked Pipeline-Eintrag (wenn vorhanden) mit Notes
// - Zeitachse (received_at, deadline, days since)
// - Action: Mark as paid (updates both finance_mahnungen + finance_pipeline)

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
  open: boolean;
  mahnung: Mahnung | null;
  onClose: () => void;
  onPaid: () => void;
}

function MahnungDetailSlideOver({ open, mahnung, onClose, onPaid }: Props) {
  const [pipelineItem, setPipelineItem] = useState<PipelineItem | null>(null);
  const [loadingPipeline, setLoadingPipeline] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Load linked pipeline-Eintrag when mahnung changes
  useEffect(() => {
    if (!mahnung?.pipeline_id) {
      setPipelineItem(null);
      return;
    }
    setLoadingPipeline(true);
    supabase
      .from('finance_pipeline')
      .select('*')
      .eq('id', mahnung.pipeline_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPipelineItem(data as PipelineItem);
        setLoadingPipeline(false);
      });
  }, [mahnung?.pipeline_id]);

  if (!mahnung) return null;

  const stufe = mahnung.stufe as 1 | 2 | 3 | 4;
  const isUrgent = stufe >= 3;
  const daysSince = daysUntil(mahnung.received_at);
  const daysSinceLabel =
    daysSince !== null && daysSince <= 0 ? `vor ${Math.abs(daysSince)} Tagen` : '—';

  const handleMarkPaid = async () => {
    setUpdating(true);
    const today = new Date().toISOString().slice(0, 10);

    await supabase.from('finance_mahnungen').update({ status: 'paid' }).eq('id', mahnung.id);

    if (mahnung.pipeline_id) {
      await supabase
        .from('finance_pipeline')
        .update({ status: 'bezahlt', paid_at: today, mahnstufe: 0 })
        .eq('id', mahnung.pipeline_id);
    }

    setUpdating(false);
    onPaid();
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={mahnung.vendor}
      subtitle={`${ENTITY_LABELS[mahnung.entity] ?? mahnung.entity} · ${STUFEN_LABELS[stufe]}`}
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Schließen
          </Button>
          <Button
            variant={isUrgent ? 'danger' : 'success'}
            onClick={handleMarkPaid}
            disabled={updating}
            icon={isUrgent ? <IconFlame /> : <IconCheck />}
          >
            {updating ? 'Markiere…' : isUrgent ? 'Sofort bezahlt' : 'Bezahlt markieren'}
          </Button>
        </>
      }
    >
      {/* Stufe + Status Header */}
      <div className="flex items-center gap-2 mb-6">
        <Pill variant={STUFEN_VARIANT[stufe]}>Stufe {stufe}</Pill>
        {isUrgent && (
          <Pill variant="alert" pulse>
            SOFORT
          </Pill>
        )}
        <Pill variant="neutral">{mahnung.status === 'open' ? 'Offen' : mahnung.status}</Pill>
      </div>

      {/* Amount — big number */}
      <div className="mb-6">
        <div className="lt-text-label">Forderung</div>
        <div
          className="lt-tabular"
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: isUrgent ? '#dc2626' : '#1d1d1f',
            lineHeight: 1.1,
            marginTop: '0.25rem',
          }}
        >
          {formatAmount(mahnung.amount, mahnung.currency as Currency)}
        </div>
        {mahnung.mahngebuehren > 0 && (
          <div className="lt-text-meta" style={{ marginTop: '0.5rem' }}>
            + {formatAmount(mahnung.mahngebuehren, mahnung.currency as Currency)} Mahngebühren
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <div className="lt-text-label" style={{ marginBottom: '0.75rem' }}>
          Zeitachse
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="lt-text-secondary">Eingang</span>
            <span className="lt-text-body">
              {formatDate(mahnung.received_at)} <span className="lt-text-secondary">({daysSinceLabel})</span>
            </span>
          </div>
          {mahnung.deadline && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="lt-text-secondary">Deadline</span>
              <span className="lt-text-body lt-text-danger">{formatDate(mahnung.deadline)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {mahnung.notes && (
        <div className="mb-6">
          <div className="lt-text-label" style={{ marginBottom: '0.5rem' }}>
            Notizen
          </div>
          <p
            className="lt-text-body lt-text-secondary"
            style={{
              background: 'rgba(0,0,0,0.03)',
              padding: '0.875rem 1rem',
              borderRadius: '0.625rem',
              lineHeight: 1.6,
            }}
          >
            {mahnung.notes}
          </p>
        </div>
      )}

      {/* Linked Pipeline Item */}
      <div>
        <div className="lt-text-label" style={{ marginBottom: '0.75rem' }}>
          Verknüpfte Eingangsrechnung
        </div>
        {!mahnung.pipeline_id ? (
          <div
            className="lt-text-meta"
            style={{
              padding: '1rem',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: '0.625rem',
              border: '1px dashed rgba(0,0,0,0.12)',
            }}
          >
            ⚠️ Keine Pipeline-Zuordnung vorhanden ("orphan"). Bitte verifizieren ob die
            Mahnung zu einer existierenden Rechnung gehört.
          </div>
        ) : loadingPipeline ? (
          <div className="lt-text-meta">Lade…</div>
        ) : pipelineItem ? (
          <div
            style={{
              padding: '1rem',
              background: 'rgba(0,0,0,0.025)',
              borderRadius: '0.625rem',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="lt-text-body">{pipelineItem.vendor}</span>
              <span className="lt-text-body lt-tabular">
                {formatAmount(Number(pipelineItem.amount), pipelineItem.currency as Currency)}
              </span>
            </div>
            <div className="lt-text-meta">
              Status: <span style={{ fontWeight: 600 }}>{pipelineItem.status}</span>
              {pipelineItem.due_date && <> · Fällig: {formatDate(pipelineItem.due_date)}</>}
              {pipelineItem.payment_method && <> · {pipelineItem.payment_method}</>}
            </div>
            {pipelineItem.notes && (
              <p
                className="lt-text-meta"
                style={{ marginTop: '0.625rem', lineHeight: 1.5, color: '#6e6e73' }}
              >
                {pipelineItem.notes}
              </p>
            )}
          </div>
        ) : (
          <div className="lt-text-meta">Pipeline-Eintrag nicht gefunden.</div>
        )}
      </div>
    </SlideOver>
  );
}

export default MahnungDetailSlideOver;
