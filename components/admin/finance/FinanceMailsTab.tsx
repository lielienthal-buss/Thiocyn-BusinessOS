import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

const STATUS_STYLES: Record<MailStatus, string> = {
  new: 'bg-blue-500/15 text-blue-400',
  forwarded_vanessa: 'bg-emerald-500/15 text-emerald-400',
  needs_clarification: 'bg-amber-500/15 text-amber-400',
  no_action: 'bg-slate-500/15 text-slate-400',
};

const STATUS_LABELS: Record<MailStatus, string> = {
  new: 'Neu',
  forwarded_vanessa: 'Weitergeleitet',
  needs_clarification: 'Klären',
  no_action: 'Keine Aktion',
};

const CATEGORY_STYLES: Record<MailCategory, string> = {
  invoice: 'bg-violet-500/15 text-violet-400',
  reminder: 'bg-amber-500/15 text-amber-400',
  dispute: 'bg-red-500/15 text-red-400',
  info: 'bg-slate-500/15 text-slate-400',
  other: 'bg-slate-500/15 text-slate-400',
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
    if (error) loadMails(); // rollback
  };

  const bulkUpdateStatus = async (status: MailStatus) => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setMails(prev => prev.map(m => ids.includes(m.id) ? { ...m, status } : m));
    setSelected(new Set());
    const { error } = await supabase.from('finance_mails').update({ status }).in('id', ids);
    if (error) loadMails(); // rollback
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setMails(prev => prev.filter(m => !ids.includes(m.id)));
    setSelected(new Set());
    const { error } = await supabase.from('finance_mails').delete().in('id', ids);
    if (error) loadMails(); // rollback
  };

  const filtered = filter === 'all' ? mails : mails.filter((m) => m.status === filter);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-white/[0.05] border border-white/[0.06] p-1 rounded-xl w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === f.id ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={syncMails}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors shadow-sm"
        >
          {syncing ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Alle aktualisieren
        </button>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-xl px-4 py-2">
          <span className="text-xs font-bold text-amber-400">{selected.size} ausgewählt</span>
          <select
            defaultValue=""
            onChange={e => {
              if (e.target.value === '__delete__') { if (confirm(`${selected.size} Mails löschen?`)) bulkDelete(); }
              else if (e.target.value) bulkUpdateStatus(e.target.value as MailStatus);
              e.target.value = '';
            }}
            className="text-xs bg-surface-800 border border-white/[0.06] rounded-lg px-2 py-1 text-slate-300 cursor-pointer"
          >
            <option value="" disabled>Aktion...</option>
            <option value="forwarded_vanessa">→ Weiterleiten</option>
            <option value="needs_clarification">Klären</option>
            <option value="no_action">Keine Aktion</option>
            <option value="__delete__">Löschen</option>
          </select>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-500 hover:text-slate-300 ml-1">Auswahl aufheben</button>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <p className="text-xs text-slate-400 bg-surface-900/60 border border-white/[0.06] rounded-lg px-3 py-2">
          Sync abgeschlossen: <strong>{syncResult.inserted}</strong> neue Mails importiert ({syncResult.total} geprüft)
        </p>
      )}

      {/* Mail list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium">Keine Mails gefunden.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((mail) => (
            <div
              key={mail.id}
              className={`bg-surface-800/60 border rounded-2xl p-4 shadow-sm space-y-3 ${
                selected.has(mail.id) ? 'border-amber-500/30 bg-amber-500/[0.03]' : 'border-white/[0.06]'
              }`}
            >
              {/* Top row */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selected.has(mail.id)}
                    onChange={e => {
                      setSelected(prev => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(mail.id) : next.delete(mail.id);
                        return next;
                      });
                    }}
                    className="mt-1 w-3.5 h-3.5 rounded border-white/20 accent-amber-500 cursor-pointer shrink-0"
                  />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{mail.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{mail.sender}</p>
                  {mail.preview && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{mail.preview}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <span className="text-xs text-slate-500 whitespace-nowrap">{formatDate(mail.received_at)}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[mail.status]}`}>
                    {STATUS_LABELS[mail.status]}
                  </span>
                  {mail.category && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[mail.category]}`}>
                      {CATEGORY_LABELS[mail.category]}
                    </span>
                  )}
                  {mail.ai_priority === 'high' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">
                      Dringend
                    </span>
                  )}
                  <button
                    onClick={() => { if (confirm('Mail löschen?')) deleteMail(mail.id); }}
                    className="text-slate-600 hover:text-red-400 transition-colors text-xs ml-1"
                    title="Löschen"
                  >
                    🗑
                  </button>
                </div>
                </div>
              </div>

              {/* AI Analysis panel */}
              {mail.ai_analysis && expandedId === mail.id && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">KI-Analyse</p>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  {mail.ai_analysis.summary && (
                    <p className="text-xs text-blue-300 font-medium">{mail.ai_analysis.summary}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mail.ai_analysis.sender_company && (
                      <div>
                        <span className="text-blue-400">Unternehmen</span>
                        <p className="text-blue-200 font-medium">{mail.ai_analysis.sender_company}</p>
                      </div>
                    )}
                    {mail.ai_analysis.invoice_number && (
                      <div>
                        <span className="text-blue-400">Rechnungs-Nr.</span>
                        <p className="text-blue-200 font-medium">{mail.ai_analysis.invoice_number}</p>
                      </div>
                    )}
                    {mail.ai_analysis.amount && (
                      <div>
                        <span className="text-blue-400">Betrag</span>
                        <p className="text-blue-200 font-medium">
                          {mail.ai_analysis.amount} {mail.ai_analysis.currency ?? ''}
                        </p>
                      </div>
                    )}
                    {mail.ai_analysis.due_date && (
                      <div>
                        <span className="text-blue-400">Fälligkeit</span>
                        <p className="text-blue-200 font-medium">{formatDueDate(mail.ai_analysis.due_date)}</p>
                      </div>
                    )}
                    {mail.ai_analysis.service_description && (
                      <div className="col-span-2">
                        <span className="text-blue-400">Leistung</span>
                        <p className="text-blue-200 font-medium">{mail.ai_analysis.service_description}</p>
                      </div>
                    )}
                  </div>
                  {mail.ai_analysis.action_reason && (
                    <p className="text-xs text-blue-400 border-t border-blue-500/20 pt-2">
                      💡 {mail.ai_analysis.action_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Show collapsed analysis indicator */}
              {mail.ai_analysis && expandedId !== mail.id && (
                <button
                  onClick={() => setExpandedId(mail.id)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <span>📊</span> KI-Analyse anzeigen
                  {mail.ai_analysis.amount && (
                    <span className="ml-1 text-slate-500">· {mail.ai_analysis.amount} {mail.ai_analysis.currency ?? ''}</span>
                  )}
                </button>
              )}

              {/* Actions + note */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.06]">
                <button
                  onClick={() => updateStatus(mail.id, 'forwarded_vanessa')}
                  disabled={mail.status === 'forwarded_vanessa'}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 disabled:opacity-40 transition-colors"
                >
                  → Weiterleiten
                </button>
                <button
                  onClick={() => updateStatus(mail.id, 'needs_clarification')}
                  disabled={mail.status === 'needs_clarification'}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-500/15 text-amber-400 rounded-lg hover:bg-amber-500/25 disabled:opacity-40 transition-colors"
                >
                  Klären
                </button>
                <button
                  onClick={() => updateStatus(mail.id, 'no_action')}
                  disabled={mail.status === 'no_action'}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-500/15 text-slate-400 rounded-lg hover:bg-slate-500/25 disabled:opacity-40 transition-colors"
                >
                  Keine Aktion
                </button>

                {/* Analyze button */}
                <button
                  onClick={() => analyzeMail(mail.id)}
                  disabled={analyzingId === mail.id}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-500/15 text-blue-400 rounded-lg hover:bg-blue-500/25 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {analyzingId === mail.id ? (
                    <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>🔍</span>
                  )}
                  {mail.ai_analysis ? 'Neu analysieren' : 'Analysieren'}
                </button>

                {/* Handoff note */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <input
                    type="text"
                    placeholder="Notiz für Buchhalter…"
                    value={noteValues[mail.id] ?? ''}
                    onChange={(e) => setNoteValues((v) => ({ ...v, [mail.id]: e.target.value }))}
                    className="border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400 w-52"
                  />
                  <button
                    onClick={() => saveNote(mail.id)}
                    disabled={savingNote === mail.id}
                    className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {savingNote === mail.id ? '…' : 'Speichern'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
