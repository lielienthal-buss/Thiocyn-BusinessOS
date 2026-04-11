import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Section, Card, Button, Pill } from '@/components/ui/light';

// ─── Emma Planner Tab ─────────────────────────────────────────────────────────
// Welle 3 Stage 3 — Light Glass refactor.

interface TimeBlock {
  start: string;
  end: string;
  title: string;
  type: 'deep-work' | 'admin' | 'call' | 'review';
  tasks: string[];
}

interface MailAction {
  mailId: string;
  subject: string;
  action: 'forward_vanessa' | 'urgent_owner' | 'no_action';
  category: 'invoice' | 'reminder' | 'dispute' | 'info' | 'other';
  priority: 'high' | 'normal' | 'low';
}

interface EmmaPlan {
  blocks: TimeBlock[];
  mailActions: MailAction[];
  summary: string;
}

const BLOCK_VARIANT: Record<TimeBlock['type'], 'blue' | 'neutral' | 'success' | 'warning'> = {
  'deep-work': 'blue',
  admin: 'neutral',
  call: 'success',
  review: 'warning',
};

const BLOCK_LABELS: Record<TimeBlock['type'], string> = {
  'deep-work': 'Deep Work',
  admin: 'Admin',
  call: 'Call',
  review: 'Review',
};

const ACTION_VARIANT: Record<MailAction['action'], 'success' | 'danger' | 'neutral'> = {
  forward_vanessa: 'success',
  urgent_owner: 'danger',
  no_action: 'neutral',
};

const ACTION_LABELS: Record<MailAction['action'], string> = {
  forward_vanessa: '→ Weiterleiten',
  urgent_owner: 'Dringend',
  no_action: 'Keine Aktion',
};

const PRIORITY_VARIANT: Record<MailAction['priority'], 'danger' | 'neutral'> = {
  high: 'danger',
  normal: 'neutral',
  low: 'neutral',
};

export default function EmmaPlannerTab() {
  const [plan, setPlan] = useState<EmmaPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('emma-work-plan');
      if (fnError) throw new Error(fnError.message);
      setPlan(data as EmmaPlan);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    generatePlan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Section className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="lt-text-h1">Emma · Tagesplan</h3>
          <p className="lt-text-meta mt-1">KI-generierter Tagesplan + Finance-Mail-Klassifikation</p>
        </div>
        <Button variant="primary" onClick={generatePlan} disabled={loading}>
          {loading ? 'Lädt…' : 'Neu generieren'}
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <Card padding="lg">
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
            <p className="lt-text-meta">Emma denkt nach…</p>
          </div>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card padding="md">
          <p className="lt-text-meta lt-text-danger">{error}</p>
        </Card>
      )}

      {/* Plan */}
      {!loading && plan && (
        <div className="space-y-6">
          {/* Summary */}
          {plan.summary && (
            <Card padding="md">
              <p className="lt-text-body">{plan.summary}</p>
            </Card>
          )}

          {/* Time blocks */}
          {plan.blocks && plan.blocks.length > 0 && (
            <div>
              <h4 className="lt-text-label mb-3">Zeitblöcke</h4>
              <div className="space-y-2">
                {plan.blocks.map((block, i) => (
                  <Card key={i} padding="md">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="lt-text-body lt-tabular">
                          {block.start}–{block.end}
                        </span>
                        <Pill variant={BLOCK_VARIANT[block.type]}>
                          {BLOCK_LABELS[block.type] ?? block.type}
                        </Pill>
                      </div>
                      <span className="lt-text-body">{block.title}</span>
                    </div>
                    {block.tasks && block.tasks.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {block.tasks.map((task, j) => (
                          <li key={j} className="lt-text-meta flex items-center gap-1.5">
                            <span
                              className="w-1 h-1 rounded-full inline-block shrink-0"
                              style={{ background: 'var(--light-text-muted)' }}
                            />
                            {task}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Mail actions */}
          {plan.mailActions && plan.mailActions.length > 0 && (
            <div>
              <h4 className="lt-text-label mb-3">Emma schlägt vor:</h4>
              <div className="space-y-2">
                {plan.mailActions.map((action, i) => (
                  <Card key={i} padding="md">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="lt-text-body truncate">{action.subject}</p>
                        <p className="lt-text-meta mt-1 capitalize">{action.category}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Pill variant={PRIORITY_VARIANT[action.priority]}>{action.priority}</Pill>
                        <Pill variant={ACTION_VARIANT[action.action]}>
                          {ACTION_LABELS[action.action] ?? action.action}
                        </Pill>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty states */}
          {(!plan.blocks || plan.blocks.length === 0) && (!plan.mailActions || plan.mailActions.length === 0) && (
            <Card padding="lg">
              <div className="lt-empty">Kein Plan generiert. Versuche es erneut.</div>
            </Card>
          )}
        </div>
      )}
    </Section>
  );
}
