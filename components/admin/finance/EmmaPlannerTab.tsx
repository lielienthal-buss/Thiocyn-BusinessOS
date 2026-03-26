import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

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
  action: 'forward_vanessa' | 'urgent_luis' | 'no_action';
  category: 'invoice' | 'reminder' | 'dispute' | 'info' | 'other';
  priority: 'high' | 'normal' | 'low';
}

interface EmmaPlan {
  blocks: TimeBlock[];
  mailActions: MailAction[];
  summary: string;
}

const BLOCK_STYLES: Record<TimeBlock['type'], string> = {
  'deep-work': 'bg-blue-50 border-blue-200 text-blue-700',
  admin: 'bg-gray-50 border-gray-200 text-gray-600',
  call: 'bg-green-50 border-green-200 text-green-700',
  review: 'bg-yellow-50 border-yellow-200 text-yellow-700',
};

const BLOCK_BADGE: Record<TimeBlock['type'], string> = {
  'deep-work': 'bg-blue-100 text-blue-700',
  admin: 'bg-gray-100 text-gray-600',
  call: 'bg-green-100 text-green-700',
  review: 'bg-yellow-100 text-yellow-700',
};

const BLOCK_LABELS: Record<TimeBlock['type'], string> = {
  'deep-work': 'Deep Work',
  admin: 'Admin',
  call: 'Call',
  review: 'Review',
};

const ACTION_STYLES: Record<MailAction['action'], string> = {
  forward_vanessa: 'bg-green-50 text-green-700 border-green-200',
  urgent_luis: 'bg-red-50 text-red-700 border-red-200',
  no_action: 'bg-gray-50 text-gray-500 border-gray-200',
};

const ACTION_LABELS: Record<MailAction['action'], string> = {
  forward_vanessa: '→ Vanessa',
  urgent_luis: 'Dringend (Luis)',
  no_action: 'Keine Aktion',
};

const PRIORITY_BADGE: Record<MailAction['priority'], string> = {
  high: 'bg-red-100 text-red-600',
  normal: 'bg-gray-100 text-gray-500',
  low: 'bg-gray-50 text-gray-400',
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Emma · Tagesplan</h3>
          <p className="text-xs text-gray-500 mt-0.5">KI-generierter Tagesplan + Finance-Mail-Klassifikation</p>
        </div>
        <button
          onClick={generatePlan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors shadow-sm"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Neu generieren
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-sm font-medium">Emma denkt nach…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Plan */}
      {!loading && plan && (
        <div className="space-y-6">
          {/* Summary */}
          {plan.summary && (
            <div className="bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3">
              <p className="text-sm font-medium text-primary-800">{plan.summary}</p>
            </div>
          )}

          {/* Time blocks */}
          {plan.blocks && plan.blocks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Zeitblöcke</h4>
              <div className="space-y-2">
                {plan.blocks.map((block, i) => (
                  <div
                    key={i}
                    className={`border rounded-xl px-4 py-3 ${BLOCK_STYLES[block.type] ?? 'bg-gray-50 border-gray-200 text-gray-600'}`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">
                          {block.start}–{block.end}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BLOCK_BADGE[block.type] ?? 'bg-gray-100 text-gray-600'}`}>
                          {BLOCK_LABELS[block.type] ?? block.type}
                        </span>
                      </div>
                      <span className="text-sm font-semibold">{block.title}</span>
                    </div>
                    {block.tasks && block.tasks.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {block.tasks.map((task, j) => (
                          <li key={j} className="text-xs opacity-80 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-current inline-block shrink-0" />
                            {task}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mail actions */}
          {plan.mailActions && plan.mailActions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emma schlägt vor:</h4>
              <div className="space-y-2">
                {plan.mailActions.map((action, i) => (
                  <div
                    key={i}
                    className={`border rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 ${ACTION_STYLES[action.action] ?? 'bg-gray-50 border-gray-200 text-gray-500'}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{action.subject}</p>
                      <p className="text-xs opacity-70 mt-0.5 capitalize">{action.category}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[action.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                        {action.priority}
                      </span>
                      <span className="text-xs font-semibold">
                        {ACTION_LABELS[action.action] ?? action.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty states */}
          {(!plan.blocks || plan.blocks.length === 0) && (!plan.mailActions || plan.mailActions.length === 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm font-medium">Kein Plan generiert. Versuche es erneut.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
