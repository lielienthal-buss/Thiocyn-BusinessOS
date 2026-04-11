import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Section, Card, Button, Pill, IconClose, IconTrash } from '@/components/ui/light';

// ─── Finance Mails Tab ────────────────────────────────────────────────────────
// Welle 3 Stage 3 — Light Glass refactor.

type MailStatus = 'new' | 'forwarded_vanessa' | 'needs_clarification' | 'no_action';
type MailCategory = 'invoice' | 'reminder' | 'dispute' | 'info' | 'other';
type FilterOption = 'all' | MailStatus;

interface MailAnalysis {
  sender_company?: string | null;
  invoice_number?: string | null;
  amount?: string | null;
  currency?: string | null;
  due_date?: string | null;
  service_description?: string | null;
  recommended_action?: string;
  action_reason?: string;
  summary?: string;
}

interface FinanceMail {
  id: string;
  sender: string;
  subject: string;
  preview: string | null;
  received_at: string;
  status: MailStatus;
  category: MailCategory | null;
  ai_action: string | null;
  ai_priority: 'high' | 'normal' | 'low' | null;
  ai_analysis: MailAnalysis | null;
  handoff_note: string | null;
  created_at: string;
}

const STATUS_VARIANT: Record<MailStatus, 'blue' | 'success' | 'warning' | 'neutral'> = {
  new: 'blue',
  forwarded_vanessa: 'success',
  needs_clarification: 'warning',
  no_action: 'neutral',
};

const STATUS_LABELS: Record<MailStatus, string> = {
  new: 'Neu',
  forwarded_vanessa: 'Weitergeleitet',
  needs_clarification: 'Klären',
  no_action: 'Keine Aktion',
};

const CATEGORY_VARIANT: Record<MailCategory, 'gold' | 'warning' | 'danger' | 'neutral'> = {
  invoice: 'gold',
  reminder: 'warning',
  dispute: 'danger',
  info: 'neutral',
  other: 'neutral',
};

const CATEGORY_LABELS: Record<MailCategory, string> = {
  invoice: 'Rechnung',
  reminder: 'Mahnung',
  dispute: 'Einspruch',
  info: 'Info',
  other: 'Sonstiges',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatDueDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const FILTERS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'new', label: 'Neu' },
  { id: 'forwarded_vanessa', label: 'Weitergeleitet' },
  { id: 'needs_clarification', label: 'Klären' },
];

export default function FinanceMailsTab() {
  const [mails, setMails] = useState<FinanceMail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ inserted: number; total: number } | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const loadMails = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('finance_mails')
      .select('*')
      .order('received_at', { ascending: false });
    if (data) {
      setMails(data as FinanceMail[]);
      const notes: Record<string, string> = {};
      for (const m of data as FinanceMail[]) {
        notes[m.id] = m.handoff_note ?? '';
      }
      setNoteValues(notes);
    }
    setLoading(false);
  }, []);

  const syncMails = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await supabase.functions.invoke('fetch-finance-mails');
      if (data) setSyncResult(data as { inserted: number; total: number });
    } catch {
      // silent
    }
    await loadMails();
    setSyncing(false);
  }, [loadMails]);

  useEffect(() => {
    syncMails();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: string, status: MailStatus) => {
    await supabase.from('finance_mails').update({ status }).eq('id', id);
    setMails((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  };

  const saveNote = async (id: string) => {
    setSavingNote(id);
    await supabase
      .from('finance_mails')
      .update({ handoff_note: noteValues[id] || null })
      .eq('id', id);
    setSavingNote(null);
  };

  const analyzeMail = async (id: string) => {
    setAnalyzingId(id);
    try {
      const { data } = await supabase.functions.invoke('analyze-finance-mail', {
        body: { mail_id: id },
      });
      if (data) {
        setMails((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ai_analysis: data as MailAnalysis } : m))
        );
        setExpandedId(id);
      }
    } catch {
      // silent
    }
    setAnalyzingId(null);
  };

  const deleteMail = async (id: string) => {
    setMails(prev => prev.filter(m => m.id !== id));
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    const { error } = await supabase.from('finance_mails').delete().eq('id', id);
    if (error) loadMails();
  };

  const bulkUpdateStatus = async (status: MailStatus) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setMails(prev => prev.map(m => ids.includes(m.id) ? { ...m, status } : m));
    setSelected(new Set());
    const { error } = await supabase.from('finance_mails').update({ status }).in('id', ids);
    if (error) loadMails();
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setMails(prev => prev.filter(m => !ids.includes(m.id)));
    setSelected(new Set());
    const { error } = await supabase.from('finance_mails').delete().in('id', ids);
    if (error) loadMails();
  };

  const filtered = filter === 'all' ? mails : mails.filter((m) => m.status === filter);

  return (
    <Section className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: filter === f.id ? 'var(--tc-gold)' : 'transparent',
                color: filter === f.id ? '#ffffff' : 'var(--light-text-secondary)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={syncMails} disabled={syncing}>
          {syncing ? 'Synct…' : 'Alle aktualisieren'}
        </Button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <span className="lt-text-body" style={{ color: 'var(--tc-gold)' }}>{selected.size} ausgewählt</span>
            <select
              defaultValue=""
              onChange={e => {
                if (e.target.value === '__delete__') { if (confirm(`${selected.size} Mails löschen?`)) bulkDelete(); }
                else if (e.target.value) bulkUpdateStatus(e.target.value as MailStatus);
                e.target.value = '';
              }}
              className="lt-select"
              style={{ width: 'auto' }}
            >
              <option value="" disabled>Aktion...</option>
              <option value="forwarded_vanessa">→ Weiterleiten</option>
              <option value="needs_clarification">Klären</option>
              <option value="no_action">Keine Aktion</option>
              <option value="__delete__">Löschen</option>
            </select>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Auswahl aufheben
            </Button>
          </div>
        </Card>
      )}

      {/* Sync result */}
      {syncResult && (
        <Card padding="sm">
          <p className="lt-text-meta">
            Sync abgeschlossen: <strong>{syncResult.inserted}</strong> neue Mails importiert ({syncResult.total} geprüft)
          </p>
        </Card>
      )}

      {/* Mail list */}
      {loading ? (
        <Card padding="lg">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <div className="lt-empty">Keine Mails gefunden.</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((mail) => (
            <Card key={mail.id} padding="md" className={selected.has(mail.id) ? 'lt-card-selected' : ''}>
              <div className="space-y-3">
                {/* Top row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selected.has(mail.id)}
                      onChange={e => {
                        setSelected(prev => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(mail.id); else next.delete(mail.id);
                          return next;
                        });
                      }}
                      className="mt-1 cursor-pointer shrink-0"
                      style={{ width: '0.875rem', height: '0.875rem', accentColor: 'var(--tc-gold)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="lt-text-body truncate">{mail.subject}</p>
                      <p className="lt-text-meta mt-0.5 truncate">{mail.sender}</p>
                      {mail.preview && (
                        <p className="lt-text-meta mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {mail.preview}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <span className="lt-text-meta whitespace-nowrap">{formatDate(mail.received_at)}</span>
                    <Pill variant={STATUS_VARIANT[mail.status]}>{STATUS_LABELS[mail.status]}</Pill>
                    {mail.category && (
                      <Pill variant={CATEGORY_VARIANT[mail.category]}>{CATEGORY_LABELS[mail.category]}</Pill>
                    )}
                    {mail.ai_priority === 'high' && <Pill variant="danger">Dringend</Pill>}
                    <button
                      onClick={() => { if (confirm('Mail löschen?')) deleteMail(mail.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '0.25rem' }}
                      title="Löschen"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* AI Analysis panel */}
                {mail.ai_analysis && expandedId === mail.id && (
                  <Card variant="plain" padding="md">
                    <div className="flex items-center justify-between mb-2">
                      <p className="lt-text-label" style={{ color: 'var(--tc-blue)' }}>KI-Analyse</p>
                      <button
                        onClick={() => setExpandedId(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-blue)' }}
                      >
                        <IconClose size={14} />
                      </button>
                    </div>
                    {mail.ai_analysis.summary && (
                      <p className="lt-text-body mb-2">{mail.ai_analysis.summary}</p>
                    )}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {mail.ai_analysis.sender_company && (
                        <div>
                          <span className="lt-text-label">Unternehmen</span>
                          <p className="lt-text-body">{mail.ai_analysis.sender_company}</p>
                        </div>
                      )}
                      {mail.ai_analysis.invoice_number && (
                        <div>
                          <span className="lt-text-label">Rechnungs-Nr.</span>
                          <p className="lt-text-body">{mail.ai_analysis.invoice_number}</p>
                        </div>
                      )}
                      {mail.ai_analysis.amount && (
                        <div>
                          <span className="lt-text-label">Betrag</span>
                          <p className="lt-text-body">{mail.ai_analysis.amount} {mail.ai_analysis.currency ?? ''}</p>
                        </div>
                      )}
                      {mail.ai_analysis.due_date && (
                        <div>
                          <span className="lt-text-label">Fälligkeit</span>
                          <p className="lt-text-body">{formatDueDate(mail.ai_analysis.due_date)}</p>
                        </div>
                      )}
                      {mail.ai_analysis.service_description && (
                        <div className="col-span-2">
                          <span className="lt-text-label">Leistung</span>
                          <p className="lt-text-body">{mail.ai_analysis.service_description}</p>
                        </div>
                      )}
                    </div>
                    {mail.ai_analysis.action_reason && (
                      <p className="lt-text-meta mt-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                        💡 {mail.ai_analysis.action_reason}
                      </p>
                    )}
                  </Card>
                )}

                {/* Show collapsed analysis indicator */}
                {mail.ai_analysis && expandedId !== mail.id && (
                  <button
                    onClick={() => setExpandedId(mail.id)}
                    className="lt-text-meta"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tc-blue)', padding: 0, fontWeight: 600 }}
                  >
                    KI-Analyse anzeigen
                    {mail.ai_analysis.amount && <span style={{ color: 'var(--light-text-muted)', marginLeft: '0.375rem' }}>· {mail.ai_analysis.amount} {mail.ai_analysis.currency ?? ''}</span>}
                  </button>
                )}

                {/* Actions + note */}
                <div className="flex flex-wrap items-center gap-2 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => updateStatus(mail.id, 'forwarded_vanessa')}
                    disabled={mail.status === 'forwarded_vanessa'}
                  >
                    → Weiterleiten
                  </Button>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => updateStatus(mail.id, 'needs_clarification')}
                    disabled={mail.status === 'needs_clarification'}
                  >
                    Klären
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateStatus(mail.id, 'no_action')}
                    disabled={mail.status === 'no_action'}
                  >
                    Keine Aktion
                  </Button>
                  <Button
                    variant="neutral"
                    size="sm"
                    onClick={() => analyzeMail(mail.id)}
                    disabled={analyzingId === mail.id}
                  >
                    {analyzingId === mail.id ? 'Analysiere…' : (mail.ai_analysis ? 'Neu analysieren' : 'Analysieren')}
                  </Button>

                  {/* Handoff note */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="text"
                      placeholder="Notiz für Buchhalter…"
                      value={noteValues[mail.id] ?? ''}
                      onChange={(e) => setNoteValues((v) => ({ ...v, [mail.id]: e.target.value }))}
                      className="lt-input"
                      style={{ width: '13rem' }}
                    />
                    <Button variant="primary" size="sm" onClick={() => saveNote(mail.id)} disabled={savingNote === mail.id}>
                      {savingNote === mail.id ? '…' : 'Speichern'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
