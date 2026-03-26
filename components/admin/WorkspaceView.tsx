import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/language';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceConfig {
  enabled_modules: string[];
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  enabled_modules: ['mails', 'tools', 'projekte', 'zugaenge'],
};

interface MailAccount {
  id: string;
  user_id: string;
  label: string;
  imap_host: string;
  imap_port: number;
  imap_user: string;
  created_at: string;
}

interface UserMail {
  id: string;
  user_id: string;
  account_id: string | null;
  sender: string;
  subject: string;
  preview: string | null;
  received_at: string;
  status: 'new' | 'actioned' | 'archived';
  category: string | null;
  ai_priority: 'high' | 'normal' | 'low' | null;
  ai_analysis: Record<string, string> | null;
  note: string | null;
}

interface Tool {
  id: string;
  name: string;
  category: string;
  status: string;
  monthly_cost: number | null;
  currency: string;
  url: string | null;
}

interface AccessRequest {
  id: string;
  tool_or_service: string;
  description: string | null;
  status: 'open' | 'requested' | 'granted' | 'denied';
  responsible_person: string | null;
  priority: 'high' | 'normal' | 'low';
  requested_at: string;
  notes: string | null;
}

interface TeamTask {
  id: string;
  title: string;
  brand: string;
  status: string;
  priority: number;
  due_date: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return iso; }
}

const CATEGORY_STYLES: Record<string, string> = {
  invoice: 'bg-purple-100 text-purple-700', reminder: 'bg-orange-100 text-orange-700',
  dispute: 'bg-red-100 text-red-700', info: 'bg-gray-100 text-gray-500',
  other: 'bg-gray-100 text-gray-500', task: 'bg-blue-100 text-blue-700',
  question: 'bg-teal-100 text-teal-700',
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  actioned: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-400',
};

const ACCESS_STATUS: Record<string, string> = {
  open: 'bg-gray-100 text-gray-600', requested: 'bg-blue-100 text-blue-700',
  granted: 'bg-green-100 text-green-700', denied: 'bg-red-100 text-red-600',
};

// ─── Config Panel ─────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  config: WorkspaceConfig;
  onSave: (c: WorkspaceConfig) => void;
  onClose: () => void;
}

function ConfigPanel({ config, onSave, onClose }: ConfigPanelProps) {
  const t = useT();
  const [form, setForm] = useState<WorkspaceConfig>({ ...config });
  const ALL_MODULES = ['mails', 'tools', 'projekte', 'zugaenge'];
  const MODULE_LABELS: Record<string, string> = {
    mails: '📬 Mails', tools: '🔧 Tools', projekte: '📋 Projekte', zugaenge: '🔑 Zugänge',
  };

  const toggleModule = (m: string) => {
    setForm(f => ({
      ...f,
      enabled_modules: f.enabled_modules.includes(m)
        ? f.enabled_modules.filter(x => x !== m)
        : [...f.enabled_modules, m],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{t('cp.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Module toggles */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('cp.modules')}</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES.map(m => (
              <button key={m} onClick={() => toggleModule(m)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.enabled_modules.includes(m) ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${form.enabled_modules.includes(m) ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300'}`}>
                  {form.enabled_modules.includes(m) ? '✓' : ''}
                </span>
                {MODULE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">{t('ap.cancel')}</button>
          <button onClick={() => onSave(form)}
            className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
            {t('ap.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Accounts Panel ────────────────────────────────────────────────────────────

interface AccountsPanelProps {
  userId: string;
  accounts: MailAccount[];
  sessionPasses: Record<string, string>;
  onSaved: (accounts: MailAccount[], passes: Record<string, string>) => void;
  onClose: () => void;
}

function AccountsPanel({ userId, accounts, sessionPasses, onSaved, onClose }: AccountsPanelProps) {
  const t = useT();
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState('Postfach');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!imapHost || !imapUser) return;
    setSaving(true);
    const { data, error } = await supabase.from('user_mail_accounts').insert({
      user_id: userId,
      label,
      imap_host: imapHost,
      imap_port: imapPort,
      imap_user: imapUser,
    }).select().single();

    if (!error && data) {
      const newAccount = data as MailAccount;
      const newAccounts = [...accounts, newAccount];
      const newPasses = { ...sessionPasses };
      if (imapPass) {
        sessionStorage.setItem(`ws_imap_pass_${newAccount.id}`, imapPass);
        newPasses[newAccount.id] = imapPass;
      }
      setLabel('Postfach');
      setImapHost('');
      setImapPort(993);
      setImapUser('');
      setImapPass('');
      setShowAdd(false);
      onSaved(newAccounts, newPasses);
    }
    setSaving(false);
  };

  const handleDelete = async (account: MailAccount) => {
    if (!confirm(`Konto "${account.label}" entfernen?`)) return;
    setDeletingId(account.id);
    await supabase.from('user_mail_accounts').delete().eq('id', account.id).eq('user_id', userId);
    sessionStorage.removeItem(`ws_imap_pass_${account.id}`);
    const newPasses = { ...sessionPasses };
    delete newPasses[account.id];
    const newAccounts = accounts.filter(a => a.id !== account.id);
    setDeletingId(null);
    onSaved(newAccounts, newPasses);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{t('ap.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Existing accounts */}
        {accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map(account => (
              <div key={account.id} className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{account.label}</p>
                  <p className="text-xs text-gray-400 truncate">{account.imap_user}</p>
                </div>
                <button onClick={() => handleDelete(account)} disabled={deletingId === account.id}
                  className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50 shrink-0">
                  {deletingId === account.id
                    ? <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  }
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-2">{t('ap.noAccounts')}</p>
        )}

        {/* Add form */}
        {showAdd ? (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('ap.addAccount')}</p>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('ap.label')}</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="z.B. CS Support, Mein Postfach" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">{t('ap.host')}</label>
                <input value={imapHost} onChange={e => setImapHost(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="mail.domain.de" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">{t('ap.port')}</label>
                <input type="number" value={imapPort} onChange={e => setImapPort(parseInt(e.target.value) || 993)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('ap.user')}</label>
              <input value={imapUser} onChange={e => setImapUser(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="name@domain.de" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                {t('ap.password')} <span className="text-gray-400 font-normal">({t('ap.passwordHint')})</span>
              </label>
              <input type="password" value={imapPass} onChange={e => setImapPass(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="App-Passwort eingeben" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">{t('ap.cancel')}</button>
              <button onClick={handleAdd} disabled={saving || !imapHost || !imapUser}
                className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? '…' : t('ap.save')}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            className="w-full py-2.5 border border-dashed border-gray-300 text-xs font-semibold text-gray-500 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-colors">
            + {t('ap.addAccount')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mails Tab ────────────────────────────────────────────────────────────────

interface MailsTabProps {
  userId: string;
  accounts: MailAccount[];
  sessionPasses: Record<string, string>;
  onNeedAccounts: () => void;
  onPasswordNeeded: (account: MailAccount) => void;
}

function MailsTab({ userId, accounts, sessionPasses, onNeedAccounts, onPasswordNeeded }: MailsTabProps) {
  const t = useT();
  const [activeAccount, setActiveAccount] = useState<string | 'all'>('all');
  const [mails, setMails] = useState<UserMail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'actioned' | 'archived'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteValues, setNoteValues] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ inserted: number; total: number } | null>(null);

  const loadMails = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('user_mails')
      .select('*')
      .eq('user_id', userId)
      .order('received_at', { ascending: false });

    const { data } = await query;
    if (data) {
      setMails(data as UserMail[]);
      const notes: Record<string, string> = {};
      for (const m of data as UserMail[]) notes[m.id] = m.note ?? '';
      setNoteValues(notes);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadMails(); }, [loadMails]);

  const syncAccount = async (account: MailAccount) => {
    const pass = sessionPasses[account.id];
    if (!pass) { onPasswordNeeded(account); return null; }
    const { data, error } = await supabase.functions.invoke('fetch-user-mails', {
      body: {
        imap_host: account.imap_host,
        imap_port: account.imap_port,
        imap_user: account.imap_user,
        imap_pass: pass,
        user_id: userId,
        account_id: account.id,
      },
    });
    if (error) {
      let detail = error.message ?? 'Verbindungsfehler';
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body = await (error as any).context?.json?.();
        if (body?.error) detail = body.error;
      } catch { /* ignore */ }
      setSyncError(`${account.label}: ${detail}`);
      return null;
    }
    if (data?.error) {
      setSyncError(`${account.label}: ${data.error}`);
      return null;
    }
    return data as { inserted: number; total: number } | null;
  };

  const syncMails = async () => {
    if (accounts.length === 0) { onNeedAccounts(); return; }
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    if (activeAccount !== 'all') {
      const account = accounts.find(a => a.id === activeAccount);
      if (account) {
        const result = await syncAccount(account);
        if (result) setSyncResult(result);
      }
    } else {
      let totalInserted = 0;
      let totalChecked = 0;
      for (const account of accounts) {
        const result = await syncAccount(account);
        if (result) {
          totalInserted += result.inserted;
          totalChecked += result.total;
        }
      }
      setSyncResult({ inserted: totalInserted, total: totalChecked });
    }

    await loadMails();
    setSyncing(false);
  };

  const updateStatus = async (id: string, status: UserMail['status']) => {
    await supabase.from('user_mails').update({ status }).eq('id', id).eq('user_id', userId);
    setMails(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const deleteMail = async (id: string) => {
    if (!confirm('Mail aus dem System entfernen?')) return;
    setDeletingId(id);
    await supabase.from('user_mails').delete().eq('id', id).eq('user_id', userId);
    setMails(prev => prev.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const saveNote = async (id: string) => {
    setSavingNote(id);
    await supabase.from('user_mails').update({ note: noteValues[id] || null }).eq('id', id).eq('user_id', userId);
    setSavingNote(null);
  };

  // No accounts configured — SOP onboarding
  if (accounts.length === 0) {
    const steps = [
      {
        num: '1',
        title: t('mt.step1Title'),
        body: t('mt.step1Body'),
        tip: t('mt.step1Tip'),
      },
      {
        num: '2',
        title: t('mt.step2Title'),
        body: t('mt.step2Body'),
        tip: t('mt.step2Tip'),
      },
      {
        num: '3',
        title: t('mt.step3Title'),
        body: t('mt.step3Body'),
        tip: t('mt.step3Tip'),
      },
    ];
    return (
      <div className="max-w-lg mx-auto py-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center text-xl">📬</div>
          <div>
            <p className="text-sm font-bold text-gray-800">{t('mt.setupTitle')}</p>
            <p className="text-xs text-gray-400">{t('mt.setupSubtitle')}</p>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map(s => (
            <div key={s.num} className="bg-white border border-gray-200 rounded-2xl p-4 flex gap-4 shadow-sm">
              <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {s.num}
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.body}</p>
                <p className="text-xs text-primary-600 bg-primary-50 rounded-lg px-2.5 py-1 inline-block mt-1">{s.tip}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={onNeedAccounts}
          className="w-full py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors">
          {t('mt.setupBtn')}
        </button>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = {
    new: t('mt.new'), actioned: t('mt.actioned'), archived: t('mt.archived'),
  };

  const accountMailsAll = activeAccount === 'all' ? mails : mails.filter(m => m.account_id === activeAccount);
  const filtered = filter === 'all' ? accountMailsAll : accountMailsAll.filter(m => m.status === filter);

  return (
    <div className="space-y-4">
      {/* Account filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setActiveAccount('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${activeAccount === 'all' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
          {t('mt.all')}
        </button>
        {accounts.map(account => (
          <button key={account.id} onClick={() => setActiveAccount(account.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${activeAccount === account.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
            {account.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'new', 'actioned', 'archived'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'all' ? `${t('mt.all')} (${accountMailsAll.length})` : f === 'new' ? `${t('mt.new')} (${accountMailsAll.filter(m => m.status === 'new').length})` : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <button onClick={syncMails} disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-colors">
          {syncing ? <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {t('mt.sync')}
        </button>
      </div>

      {syncError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠️ {syncError}
        </p>
      )}
      {syncResult && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Sync: <strong>{syncResult.inserted}</strong> {t('mt.syncResult')} ({syncResult.total} {t('mt.syncChecked')})
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <p className="text-sm">{t('mt.noMails')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(mail => {
            const mailAccount = accounts.find(a => a.id === mail.account_id);
            return (
              <div key={mail.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{mail.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{mail.sender}</p>
                    {mail.preview && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{mail.preview}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <span className="text-xs text-gray-400">{fmt(mail.received_at)}</span>
                    {mailAccount && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                        {mailAccount.label}
                      </span>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[mail.status]}`}>
                      {STATUS_LABELS[mail.status]}
                    </span>
                    {mail.category && (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[mail.category] ?? 'bg-gray-100 text-gray-500'}`}>
                        {mail.category}
                      </span>
                    )}
                    {mail.ai_priority === 'high' && (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">{t('mt.urgent')}</span>
                    )}
                    <button onClick={() => deleteMail(mail.id)} disabled={deletingId === mail.id}
                      className="ml-1 p-1 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors rounded-lg hover:bg-red-50" title={t('zt.delete')}>
                      {deletingId === mail.id
                        ? <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Analysis panel */}
                {mail.ai_analysis && expandedId === mail.id && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{t('mt.analysisTitle')}</p>
                      <button onClick={() => setExpandedId(null)} className="text-blue-400 hover:text-blue-600 text-xs">✕</button>
                    </div>
                    {mail.ai_analysis.summary && <p className="text-xs text-blue-800">{mail.ai_analysis.summary}</p>}
                    {mail.ai_analysis.action_reason && <p className="text-xs text-blue-600">💡 {mail.ai_analysis.action_reason}</p>}
                  </div>
                )}
                {mail.ai_analysis && expandedId !== mail.id && (
                  <button onClick={() => setExpandedId(mail.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{t('mt.showAnalysis')}</button>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                  <button onClick={() => updateStatus(mail.id, 'actioned')} disabled={mail.status === 'actioned'}
                    className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 disabled:opacity-40 transition-colors">
                    {t('mt.markDone')}
                  </button>
                  <button onClick={() => updateStatus(mail.id, 'archived')} disabled={mail.status === 'archived'}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                    {t('mt.archive')}
                  </button>
                  <button onClick={() => updateStatus(mail.id, 'new')} disabled={mail.status === 'new'}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-40 transition-colors">
                    {t('mt.markNew')}
                  </button>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <input type="text" placeholder={t('mt.notePlaceholder')}
                      value={noteValues[mail.id] ?? ''}
                      onChange={e => setNoteValues(v => ({ ...v, [mail.id]: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-400 w-36" />
                    <button onClick={() => saveNote(mail.id)} disabled={savingNote === mail.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                      {savingNote === mail.id ? '…' : t('mt.noteSave')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Password Prompt Modal ─────────────────────────────────────────────────────

interface PasswordPromptProps {
  label: string;
  user: string;
  accountId?: string;
  onSubmit: (pass: string) => void;
  onClose: () => void;
}

function PasswordPrompt({ label, user, onSubmit, onClose }: PasswordPromptProps) {
  const t = useT();
  const [pass, setPass] = useState('');
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">{t('pp.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div>
          <p className="text-xs text-gray-600 font-medium">{label}</p>
          <p className="text-xs text-gray-400">{user}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">
            {t('pp.label')} <span className="text-gray-400">({t('pp.hint')})</span>
          </label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && pass && onSubmit(pass)}
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100">{t('pp.cancel')}</button>
          <button onClick={() => pass && onSubmit(pass)} disabled={!pass}
            className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50">
            {t('pp.connect')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tools Tab ────────────────────────────────────────────────────────────────

function ToolsTab() {
  const t = useT();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('tool_stack').select('id,name,category,status,monthly_cost,currency,url')
      .order('status').order('name').then(({ data }) => {
        if (data) setTools(data as Tool[]);
        setLoading(false);
      });
  }, []);

  const active = tools.filter(t => t.status !== 'cancelled');
  const total = active.reduce((s, t) => s + (t.monthly_cost ?? 0), 0);
  const review = tools.filter(t => t.status === 'review' || t.status === 'cancelling');

  const STATUS: Record<string, string> = {
    active: 'bg-green-50 text-green-700', review: 'bg-yellow-50 text-yellow-700',
    cancelling: 'bg-orange-50 text-orange-700', cancelled: 'bg-gray-50 text-gray-400', free: 'bg-blue-50 text-blue-600',
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('tt.monthly'), value: `${total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €` },
          { label: t('tt.active'), value: String(active.length) },
          { label: t('tt.review'), value: String(review.length), warn: review.length > 0 },
        ].map(s => (
          <div key={s.label} className={`border rounded-2xl p-4 ${s.warn ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.warn ? 'text-yellow-700' : 'text-gray-800'}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {tools.map(tool => (
          <div key={tool.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-800">{tool.name}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[tool.status] ?? 'bg-gray-50 text-gray-500'}`}>{tool.status}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{tool.category}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {tool.monthly_cost !== null && <p className="text-sm font-semibold text-gray-700">{tool.monthly_cost.toLocaleString('de-DE', { minimumFractionDigits: 2 })} {tool.currency}/mo</p>}
              {tool.url && <a href={tool.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:text-primary-800 font-medium">{t('tt.open')}</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Projekte Tab ─────────────────────────────────────────────────────────────

function ProjekteTab() {
  const t = useT();
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('team_tasks').select('id,title,brand,status,priority,due_date')
      .neq('status', 'done').order('priority', { ascending: false }).limit(40)
      .then(({ data }) => { if (data) setTasks(data as TeamTask[]); setLoading(false); });
  }, []);

  const byBrand = tasks.reduce<Record<string, TeamTask[]>>((acc, task) => {
    if (!acc[task.brand]) acc[task.brand] = [];
    acc[task.brand].push(task);
    return acc;
  }, {});

  const PRIO = (p: number) => p >= 4 ? 'text-red-500' : p >= 2 ? 'text-yellow-500' : 'text-gray-400';
  const ST: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-500', in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-yellow-100 text-yellow-700', blocked: 'bg-red-100 text-red-600',
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" /></div>;
  if (!tasks.length) return <div className="flex flex-col items-center py-12 text-gray-400"><p className="text-sm">{t('pt.noTasks')}</p></div>;

  return (
    <div className="space-y-5">
      {(Object.entries(byBrand) as [string, TeamTask[]][]).sort().map(([brand, bt]) => (
        <div key={brand}>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{brand}</h4>
            <span className="text-xs text-gray-400">({bt.length})</span>
          </div>
          <div className="space-y-1.5">
            {bt.map(task => (
              <div key={task.id} className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm ${PRIO(task.priority)}`}>●</span>
                  <p className="text-sm text-gray-800 truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.due_date && <span className="text-xs text-gray-400">{fmtDate(task.due_date)}</span>}
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ST[task.status] ?? 'bg-gray-100 text-gray-500'}`}>{task.status}</span>
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
  const t = useT();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<Partial<AccessRequest>>({ status: 'open', priority: 'normal' });
  const [saving, setSaving] = useState(false);

  const ACCESS_LABELS: Record<string, string> = {
    open: t('zt.statusOpen'), requested: t('zt.statusRequested'), granted: t('zt.statusGranted'), denied: t('zt.statusDenied'),
  };

  const load = useCallback(async () => {
    const { data } = await supabase.from('access_requests').select('*').order('priority').order('created_at', { ascending: false });
    if (data) setRequests(data as AccessRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: AccessRequest['status']) => {
    const update: Partial<AccessRequest> = { status };
    if (status === 'granted') (update as Record<string, unknown>).granted_at = new Date().toISOString();
    await supabase.from('access_requests').update(update).eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...update } : r));
  };

  const deleteReq = async (id: string) => {
    if (!confirm('Eintrag löschen?')) return;
    await supabase.from('access_requests').delete().eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
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

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{requests.filter(r => r.status !== 'granted' && r.status !== 'denied').length} {t('zt.open')}</p>
        <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
          {t('zt.addBtn')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('zt.tool')} *</label>
              <input value={form.tool_or_service ?? ''} onChange={e => setForm(f => ({ ...f, tool_or_service: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('zt.responsible')}</label>
              <input value={form.responsible_person ?? ''} onChange={e => setForm(f => ({ ...f, responsible_person: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('zt.description')}</label>
            <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as AccessRequest['priority'] }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              <option value="high">{t('zt.highPrio')}</option>
              <option value="normal">{t('zt.normal')}</option>
              <option value="low">{t('zt.low')}</option>
            </select>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AccessRequest['status'] }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none">
              <option value="open">{t('zt.statusOpen')}</option>
              <option value="requested">{t('zt.statusRequested')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs font-semibold text-gray-600 rounded-xl hover:bg-gray-100">{t('zt.cancel')}</button>
            <button onClick={handleSave} disabled={saving || !form.tool_or_service}
              className="px-4 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50">
              {saving ? '…' : t('zt.save')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {requests.map(req => (
          <div key={req.id} className={`bg-white border rounded-2xl p-4 space-y-2 ${req.status === 'granted' ? 'border-gray-100 opacity-60' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{req.tool_or_service}</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACCESS_STATUS[req.status]}`}>{ACCESS_LABELS[req.status]}</span>
                  {req.priority === 'high' && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">{t('zt.urgent')}</span>}
                </div>
                {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                {req.responsible_person && <p className="text-xs text-gray-400 mt-0.5">→ {req.responsible_person}</p>}
                {req.notes && <p className="text-xs text-gray-300 mt-0.5 font-mono text-[10px]">{req.notes}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">{fmtDate(req.requested_at)}</span>
                <button onClick={() => deleteReq(req.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            {req.status !== 'granted' && req.status !== 'denied' && (
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                {req.status === 'open' && (
                  <button onClick={() => updateStatus(req.id, 'requested')}
                    className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">{t('zt.markRequested')}</button>
                )}
                <button onClick={() => updateStatus(req.id, 'granted')}
                  className="px-3 py-1 text-xs font-semibold bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">{t('zt.markGranted')}</button>
                <button onClick={() => updateStatus(req.id, 'denied')}
                  className="px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">{t('zt.markDenied')}</button>
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

const ALL_TABS: { id: WorkspaceTab; emoji: string }[] = [
  { id: 'mails', emoji: '📬' },
  { id: 'tools', emoji: '🔧' },
  { id: 'projekte', emoji: '📋' },
  { id: 'zugaenge', emoji: '🔑' },
];

export default function WorkspaceView() {
  const t = useT();
  const [config, setConfig] = useState<WorkspaceConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('mails');
  const [showConfig, setShowConfig] = useState(false);
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [sessionPasses, setSessionPasses] = useState<Record<string, string>>({});
  const [passwordTarget, setPasswordTarget] = useState<MailAccount | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load user + config + accounts
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      // Load workspace config
      supabase.from('user_workspace_config').select('enabled_modules').eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) setConfig(data as WorkspaceConfig);
          setConfigLoaded(true);
        });

      // Load mail accounts + restore session passwords
      supabase.from('user_mail_accounts').select('*').eq('user_id', user.id).order('created_at')
        .then(({ data }) => {
          if (data) {
            const loadedAccounts = data as MailAccount[];
            setAccounts(loadedAccounts);
            // Restore session passes for each account
            const passes: Record<string, string> = {};
            for (const account of loadedAccounts) {
              const stored = sessionStorage.getItem(`ws_imap_pass_${account.id}`);
              if (stored) passes[account.id] = stored;
            }
            setSessionPasses(passes);
          }
        });
    });
  }, []);

  const saveConfig = async (newConfig: WorkspaceConfig) => {
    if (!userId) return;
    await supabase.from('user_workspace_config').upsert({
      user_id: userId,
      enabled_modules: newConfig.enabled_modules,
      updated_at: new Date().toISOString(),
    });
    setConfig(newConfig);
    setShowConfig(false);
  };

  const handlePasswordSubmit = (pass: string) => {
    if (!passwordTarget) return;
    sessionStorage.setItem(`ws_imap_pass_${passwordTarget.id}`, pass);
    setSessionPasses(prev => ({ ...prev, [passwordTarget.id]: pass }));
    setPasswordTarget(null);
  };

  if (!configLoaded) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  const visibleTabs = ALL_TABS.filter(tab => config.enabled_modules.includes(tab.id));
  const currentTab = visibleTabs.find(tab => tab.id === activeTab) ? activeTab : (visibleTabs[0]?.id ?? 'mails');

  const TAB_LABELS: Record<string, string> = {
    mails: t('tab.mails'),
    tools: t('tab.tools'),
    projekte: t('tab.projekte'),
    zugaenge: t('tab.zugaenge'),
  };

  return (
    <>
      {/* Config modal */}
      {showConfig && (
        <ConfigPanel config={config} onSave={saveConfig} onClose={() => setShowConfig(false)} />
      )}

      {/* Accounts panel */}
      {showAccountsPanel && userId && (
        <AccountsPanel
          userId={userId}
          accounts={accounts}
          sessionPasses={sessionPasses}
          onSaved={(newAccounts, newPasses) => {
            setAccounts(newAccounts);
            setSessionPasses(newPasses);
          }}
          onClose={() => setShowAccountsPanel(false)}
        />
      )}

      {/* Password prompt */}
      {passwordTarget && (
        <PasswordPrompt
          label={passwordTarget.label}
          user={passwordTarget.imap_user}
          accountId={passwordTarget.id}
          onSubmit={handlePasswordSubmit}
          onClose={() => setPasswordTarget(null)}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit flex-wrap">
            {visibleTabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${currentTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <span>{tab.emoji}</span>{TAB_LABELS[tab.id]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAccountsPanel(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              📬 {t('ws.mailboxes')}
            </button>
            <button onClick={() => setShowConfig(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
              {t('ws.configure')}
            </button>
          </div>
        </div>

        {/* Content */}
        {userId && currentTab === 'mails' && (
          <MailsTab
            userId={userId}
            accounts={accounts}
            sessionPasses={sessionPasses}
            onNeedAccounts={() => setShowAccountsPanel(true)}
            onPasswordNeeded={(account) => setPasswordTarget(account)}
          />
        )}
        {currentTab === 'tools' && <ToolsTab />}
        {currentTab === 'projekte' && <ProjekteTab />}
        {currentTab === 'zugaenge' && <ZugaengeTab />}
      </div>
    </>
  );
}
