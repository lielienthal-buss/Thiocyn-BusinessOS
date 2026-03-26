import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type MailStatus = 'new' | 'forwarded_vanessa' | 'needs_clarification' | 'no_action';
type MailCategory = 'invoice' | 'reminder' | 'dispute' | 'info' | 'other';

interface FinanceMail {
  id: string;
  sender: string;
  subject: string;
  preview: string | null;
  received_at: string;
  status: MailStatus;
  category: MailCategory | null;
  ai_priority: 'high' | 'normal' | 'low' | null;
  ai_analysis: Record<string, string> | null;
  handoff_note: string | null;
}

interface Tool {
  id: string;
  name: string;
  category: string;
  status: string;
  monthly_cost: number | null;
  currency: string;
  url: string | null;
  renewal_date: string | null;
  owner: string | null;
}

interface AccessRequest {
  id: string;
  tool_or_service: string;
  description: string | null;
  status: 'open' | 'requested' | 'granted' | 'denied';
  responsible_person: string | null;
  priority: 'high' | 'normal' | 'low';
  requested_at: string;
  granted_at: string | null;
  notes: string | null;
}

interface TeamTask {
  id: string;
  title: string;
  brand: string;
  status: string;
  priority: number;
  due_date: string | null;
  assigned_to_email: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAIL_STATUS_STYLES: Record<MailStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  forwarded_vanessa: 'bg-green-100 text-green-700',
  needs_clarification: 'bg-yellow-100 text-yellow-700',
  no_action: 'bg-gray-100 text-gray-500',
};

const MAIL_STATUS_LABELS: Record<MailStatus, string> = {
  new: 'Neu',
  forwarded_vanessa: 'Weitergeleitet',
  needs_clarification: 'Klären',
  no_action: 'Keine Aktion',
};

const MAIL_CATEGORY_STYLES: Record<MailCategory, string> = {
  invoice: 'bg-purple-100 text-purple-700',
  reminder: 'bg-orange-100 text-orange-700',
  dispute: 'bg-red-100 text-red-700',
  info: 'bg-gray-100 text-gray-500',
  other: 'bg-gray-100 text-gray-500',
};

const MAIL_CATEGORY_LABELS: Record<MailCategory, string> = {
  invoice: 'Rechnung', reminder: 'Mahnung', dispute: 'Einspruch', info: 'Info', other: 'Sonstiges',
};

const ACCESS_STATUS_STYLES: Record<AccessRequest['status'], string> = {
  open: 'bg-gray-100 text-gray-600',
  requested: 'bg-blue-100 text-blue-700',
  granted: 'bg-green-100 text-green-700',
  denied: 'bg-red-100 text-red-600',
};

const ACCESS_STATUS_LABELS: Record<AccessRequest['status'], string> = {
  open: 'Offen', requested: 'Beantragt', granted: 'Erteilt', denied: 'Abgelehnt',
};

const PRIORITY_STYLES: Record<'high' | 'normal' | 'low', string> = {
  high: 'bg-red-50 text-red-600',
  normal: 'bg-gray-50 text-gray-500',
  low: 'bg-gray-50 text-gray-400',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function formatDateShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return iso; }
}

// ─── Mails Tab ────────────────────────────────────────────────────────────────

function MailsTab() {
  const [mails, setMails] = useState<FinanceMail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | MailStatus>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ inserted: number; total: number } | null>(null);

  const loadMails = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('finance_mails')
      .select('*')
      .order('received_at', { ascending: false });
    if (data) {
      setMails(data as FinanceMail[]);
      const notes: Record<string, string> = {};
      for (const m of data as FinanceMail[]) notes[m.id] = m.handoff_note ?? '';
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
    } catch { /* silent */ }
    await loadMails();
    setSyncing(false);
  }, [loadMails]);

  useEffect(() => { loadMails(); }, [loadMails]);

  const updateStatus = async (id: string, status: MailStatus) => {
    await supabase.from('finance_mails').update({ status }).eq('id', id);
    setMails((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  };

  const deleteMail = async (id: string) => {
    if (!confirm('Mail aus dem System entfernen?')) return;
    setDeletingId(id);
    await supabase.from('finance_mails').delete().eq('id', id);
    setMails((prev) => prev.filter((m) => m.id !== id));
    setDeletingId(null);
  };

  const analyzeMail = async (id: string) => {
    setAnalyzingId(id);
    try {
      const { data } = await supabase.functions.invoke('analyze-finance-mail', { body: { mail_id: id } });
      if (data) {
        setMails((prev) => prev.map((m) => (m.id === id ? { ...m, ai_analysis: data } : m)));
        setExpandedId(id);
      }
    } catch { /* silent */ }
    setAnalyzingId(null);
  };

  const saveNote = async (id: string) => {
    setSavingNote(id);
    await supabase.from('finance_mails').update({ handoff_note: noteValues[id] || null }).eq('id', id);
    setSavingNote(null);
  };

  const filtered = filter === 'all' ? mails : mails.filter((m) => m.status === filter);

  const FILTERS: { id: 'all' | MailStatus; label: string }[] = [
    { id: 'all', label: `Alle (${mails.length})` },
    { id: 'new', label: `Neu (${mails.filter(m => m.status === 'new').length})` },
    { id: 'forwarded_vanessa', label: 'Weitergeleitet' },
    { id: 'needs_clarification', label: 'Klären' },
    { id: 'no_action', label: 'Archiv' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={syncMails} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors shadow-sm">
          {syncing ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Sync
        </button>
      </div>

      {syncResult && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Sync: <strong>{syncResult.inserted}</strong> neue Mails ({syncResult.total} geprüft)
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-sm font-medium">Keine Mails.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((mail) => (
            <div key={mail.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800 truncate">{mail.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{mail.sender}</p>
                  {mail.preview && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{mail.preview}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <span className="text-xs text-gray-400">{formatDate(mail.received_at)}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${MAIL_STATUS_STYLES[mail.status]}`}>
                    {MAIL_STATUS_LABELS[mail.status]}
                  </span>
                  {mail.category && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${MAIL_CATEGORY_STYLES[mail.category]}`}>
                      {MAIL_CATEGORY_LABELS[mail.category]}
                    </span>
                  )}
                  {mail.ai_priority === 'high' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Dringend</span>
                  )}
                  {/* Delete */}
                  <button onClick={() => deleteMail(mail.id)} disabled={deletingId === mail.id}
                    className="ml-1 p-1 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50"
                    title="Löschen">
                    {deletingId === mail.id
                      ? <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Analysis panel */}
              {mail.ai_analysis && expandedId === mail.id && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">KI-Analyse</p>
                    <button onClick={() => setExpandedId(null)} className="text-blue-400 hover:text-blue-600 text-xs">✕</button>
                  </div>
                  {mail.ai_analysis.summary && <p className="text-xs text-blue-800 font-medium">{mail.ai_analysis.summary}</p>}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {mail.ai_analysis.sender_company && <div><span className="text-blue-500">Unternehmen</span><p className="text-blue-900 font-medium">{mail.ai_analysis.sender_company}</p></div>}
                    {mail.ai_analysis.invoice_number && <div><span className="text-blue-500">Rechnungs-Nr.</span><p className="text-blue-900 font-medium">{mail.ai_analysis.invoice_number}</p></div>}
                    {mail.ai_analysis.amount && <div><span className="text-blue-500">Betrag</span><p className="text-blue-900 font-medium">{mail.ai_analysis.amount} {mail.ai_analysis.currency ?? ''}</p></div>}
                    {mail.ai_analysis.due_date && <div><span className="text-blue-500">Fälligkeit</span><p className="text-blue-900 font-medium">{formatDateShort(mail.ai_analysis.due_date)}</p></div>}
                  </div>
                  {mail.ai_analysis.action_reason && <p className="text-xs text-blue-600 border-t border-blue-100 pt-2">💡 {mail.ai_analysis.action_reason}</p>}
                </div>
              )}
              {mail.ai_analysis && expandedId !== mail.id && (
                <button onClick={() => setExpandedId(mail.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <span>📊</span> Analyse
                  {mail.ai_analysis.amount && <span className="ml-1 text-blue-400">· {mail.ai_analysis.amount} {mail.ai_analysis.currency ?? ''}</span>}
                </button>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                <button onClick={() => updateStatus(mail.id, 'forwarded_vanessa')} disabled={mail.status === 'forwarded_vanessa'}
                  className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-40 transition-colors">
                  → Weiterleiten
                </button>
                <button onClick={() => updateStatus(mail.id, 'needs_clarification')} disabled={mail.status === 'needs_clarification'}
                  className="px-3 py-1.5 text-xs font-semibold bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-40 transition-colors">
                  Klären
                </button>
                <button onClick={() => updateStatus(mail.id, 'no_action')} disabled={mail.status === 'no_action'}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  Archivieren
                </button>
                <button onClick={() => analyzeMail(mail.id)} disabled={analyzingId === mail.id}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-40 transition-colors flex items-center gap-1">
                  {analyzingId === mail.id ? <span className="inline-block w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" /> : '🔍'}
                  {mail.ai_analysis ? 'Neu' : 'Analysieren'}
                </button>
                <div className="flex items-center gap-1.5 ml-auto">
                  <input type="text" placeholder="Notiz für Buchhalter…"
                    value={noteValues[mail.id] ?? ''}
                    onChange={(e) => setNoteValues((v) => ({ ...v, [mail.id]: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400 w-44" />
                  <button onClick={() => saveNote(mail.id)} disabled={savingNote === mail.id}
                    className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
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

// ─── Tools Tab ────────────────────────────────────────────────────────────────

function ToolsTab() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('tool_stack').select('*').order('status').order('name').then(({ data }) => {
      if (data) setTools(data as Tool[]);
      setLoading(false);
    });
  }, []);

  const active = tools.filter(t => t.status !== 'cancelled');
  const totalMonthly = active.reduce((s, t) => s + (t.monthly_cost ?? 0), 0);
  const needsReview = tools.filter(t => t.status === 'review' || t.status === 'cancelling');

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    review: 'bg-yellow-50 text-yellow-700',
    cancelling: 'bg-orange-50 text-orange-700',
    cancelled: 'bg-gray-50 text-gray-400',
    free: 'bg-blue-50 text-blue-600',
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Monatlich</p>
          <p className="text-lg font-bold text-gray-800">{totalMonthly.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">Aktive Tools</p>
          <p className="text-lg font-bold text-gray-800">{active.length}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${needsReview.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          <p className="text-xs text-gray-500 mb-1">Review nötig</p>
          <p className={`text-lg font-bold ${needsReview.length > 0 ? 'text-yellow-700' : 'text-gray-800'}`}>{needsReview.length}</p>
        </div>
      </div>

      {/* Tool list */}
      <div className="space-y-2">
        {tools.map((tool) => (
          <div key={tool.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{tool.name}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tool.status] ?? 'bg-gray-50 text-gray-500'}`}>
                  {tool.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{tool.category}{tool.owner ? ` · ${tool.owner}` : ''}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {tool.monthly_cost !== null && (
                <p className="text-sm font-semibold text-gray-700">{tool.monthly_cost.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {tool.currency}/mo</p>
              )}
              {tool.url && (
                <a href={tool.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium">Öffnen →</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Projekte Tab ─────────────────────────────────────────────────────────────

function ProjekteTab() {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('team_tasks').select('id, title, brand, status, priority, due_date, assigned_to_email')
      .neq('status', 'done').order('priority', { ascending: false }).limit(40)
      .then(({ data }) => { if (data) setTasks(data as TeamTask[]); setLoading(false); });
  }, []);

  const byBrand = tasks.reduce<Record<string, TeamTask[]>>((acc, t) => {
    if (!acc[t.brand]) acc[t.brand] = [];
    acc[t.brand].push(t);
    return acc;
  }, {});

  const PRIORITY_COLOR = (p: number) => p >= 4 ? 'text-red-500' : p >= 2 ? 'text-yellow-500' : 'text-gray-400';
  const STATUS_STYLES: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-500',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700',
    blocked: 'bg-red-100 text-red-600',
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <p className="text-sm font-medium">Keine offenen Tasks.</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {Object.entries(byBrand).sort().map(([brand, brandTasks]) => (
        <div key={brand}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{brand}</h4>
            <span className="text-xs text-gray-400">({brandTasks.length})</span>
          </div>
          <div className="space-y-1.5">
            {brandTasks.map((task) => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm ${PRIORITY_COLOR(task.priority)}`}>●</span>
                  <p className="text-sm text-gray-800 truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.due_date && (
                    <span className="text-xs text-gray-400">{formatDateShort(task.due_date)}</span>
                  )}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {task.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Zugänge Tab ──────────────────────────────────────────────────────────────

function ZugaengeTab() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<AccessRequest>>({ status: 'open', priority: 'normal' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('access_requests').select('*').order('priority').order('created_at', { ascending: false });
    if (data) setRequests(data as AccessRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: AccessRequest['status']) => {
    const update: Partial<AccessRequest> = { status };
    if (status === 'granted') update.granted_at = new Date().toISOString();
    await supabase.from('access_requests').update(update).eq('id', id);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, ...update } : r));
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    await supabase.from('access_requests').delete().eq('id', id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!form.tool_or_service) return;
    setSaving(true);
    await supabase.from('access_requests').insert({
      tool_or_service: form.tool_or_service,
      description: form.description ?? null,
      status: form.status ?? 'open',
      responsible_person: form.responsible_person ?? null,
      priority: form.priority ?? 'normal',
      notes: form.notes ?? null,
    });
    setForm({ status: 'open', priority: 'normal' });
    setShowAdd(false);
    setSaving(false);
    await load();
  };

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{requests.filter(r => r.status !== 'granted').length} offen · {requests.filter(r => r.status === 'granted').length} erteilt</p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
          + Zugang beantragen
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Neuer Zugang</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tool / Service *</label>
              <input value={form.tool_or_service ?? ''} onChange={e => setForm(f => ({ ...f, tool_or_service: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="z.B. Shopify Admin" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Verantwortlich</label>
              <input value={form.responsible_person ?? ''} onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" placeholder="z.B. Valentin" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Beschreibung</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none" rows={2} placeholder="Wofür wird der Zugang benötigt?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priorität</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as AccessRequest['priority'] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                <option value="high">Hoch</option>
                <option value="normal">Normal</option>
                <option value="low">Niedrig</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AccessRequest['status'] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
                <option value="open">Offen</option>
                <option value="requested">Beantragt</option>
                <option value="granted">Erteilt</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">Abbrechen</button>
            <button onClick={handleSave} disabled={saving || !form.tool_or_service}
              className="px-4 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {saving ? '…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {requests.map((req) => (
          <div key={req.id} className={`bg-white border rounded-2xl p-4 space-y-2 ${req.status === 'granted' ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{req.tool_or_service}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_STATUS_STYLES[req.status]}`}>
                    {ACCESS_STATUS_LABELS[req.status]}
                  </span>
                  {req.priority === 'high' && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Dringend</span>
                  )}
                </div>
                {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                {req.responsible_person && <p className="text-xs text-gray-400 mt-0.5">→ {req.responsible_person}</p>}
                {req.notes && <p className="text-xs text-gray-400 mt-0.5 font-mono">{req.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">{formatDateShort(req.requested_at)}</span>
                <button onClick={() => deleteRequest(req.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>

            {/* Status actions */}
            {req.status !== 'granted' && req.status !== 'denied' && (
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                {req.status === 'open' && (
                  <button onClick={() => updateStatus(req.id, 'requested')}
                    className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                    → Beantragt
                  </button>
                )}
                <button onClick={() => updateStatus(req.id, 'granted')}
                  className="px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                  ✓ Erteilt
                </button>
                <button onClick={() => updateStatus(req.id, 'denied')}
                  className="px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                  ✕ Abgelehnt
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

type WorkspaceTab = 'mails' | 'tools' | 'projekte' | 'zugaenge';

const TABS: { id: WorkspaceTab; label: string; emoji: string }[] = [
  { id: 'mails', label: 'Mails', emoji: '📬' },
  { id: 'tools', label: 'Tools', emoji: '🔧' },
  { id: 'projekte', label: 'Projekte', emoji: '📋' },
  { id: 'zugaenge', label: 'Zugänge', emoji: '🔑' },
];

export default function WorkspaceView() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('mails');

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'mails' && <MailsTab />}
      {activeTab === 'tools' && <ToolsTab />}
      {activeTab === 'projekte' && <ProjekteTab />}
      {activeTab === 'zugaenge' && <ZugaengeTab />}
    </div>
  );
}
