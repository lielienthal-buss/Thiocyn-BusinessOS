import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useT } from '@/lib/language';

interface BriefingItem {
  id: string;
  priority: 'high' | 'normal' | 'low';
  title: string;
  from?: string;
  category?: string;
  recommendation: string;
  date?: string;
  type?: string;
  // intern fields
  assignee?: string;
  brand?: string;
  status?: string;
  due_date?: string;
}

interface Briefing {
  date: string;
  finance: BriefingItem[];
  mails: BriefingItem[];
  interns: BriefingItem[];
  summary: string;
  generated_at: string;
}

const PRIO: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  normal: 'bg-white border-gray-200 text-gray-700',
  low: 'bg-gray-50 border-gray-100 text-gray-400',
};

const PRIO_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-gray-100 text-gray-500',
  low: 'bg-gray-50 text-gray-400',
};

const PRIO_LABEL: Record<string, string> = {
  high: 'Dringend',
  normal: 'Normal',
  low: 'Niedrig',
};

function fmt(iso?: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }); }
  catch { return iso; }
}

function Section({ title, emoji, items, emptyText, renderItem }: {
  title: string; emoji: string; items: BriefingItem[]; emptyText: string;
  renderItem: (item: BriefingItem) => React.ReactNode;
}) {
  const high = items.filter(i => i.priority === 'high');
  const rest = items.filter(i => i.priority !== 'high');
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {high.length > 0 && (
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{high.length} dringend</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {[...high, ...rest].map(item => renderItem(item))}
        </div>
      )}
    </div>
  );
}

export default function DailyBriefingView() {
  const t = useT();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async (forceRefresh = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    if (!forceRefresh) {
      const today = new Date().toISOString().split('T')[0];
      const { data: cached } = await supabase
        .from('daily_briefings').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
      if (cached) { setBriefing(cached as Briefing); setLoading(false); return; }
    }

    const { data, error: fnErr } = await supabase.functions.invoke('daily-briefing', {
      body: { user_id: user.id },
    });
    if (fnErr || !data) {
      setError('Briefing konnte nicht geladen werden.');
    } else {
      setBriefing(data as Briefing);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { load(); }, []);

  const refresh = () => { setRefreshing(true); load(true); };

  const renderFinanceItem = (item: BriefingItem) => (
    <div key={item.id} className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${PRIO[item.priority] ?? PRIO.normal}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIO_BADGE[item.priority]}`}>{PRIO_LABEL[item.priority]}</span>
          {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
        </div>
        <p className="text-sm font-semibold mt-1 truncate">{item.title}</p>
        {item.from && <p className="text-xs text-gray-500 truncate">{item.from}</p>}
        <p className="text-xs font-medium text-primary-700 mt-1">→ {item.recommendation}</p>
      </div>
      {item.date && <span className="text-xs text-gray-400 shrink-0 mt-1">{fmt(item.date)}</span>}
    </div>
  );

  const renderMailItem = (item: BriefingItem) => (
    <div key={item.id} className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${PRIO[item.priority] ?? PRIO.normal}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIO_BADGE[item.priority]}`}>{PRIO_LABEL[item.priority]}</span>
          {item.category && <span className="text-xs text-gray-400">{item.category}</span>}
        </div>
        <p className="text-sm font-semibold mt-1 truncate">{item.title}</p>
        {item.from && <p className="text-xs text-gray-500 truncate">{item.from}</p>}
        <p className="text-xs font-medium text-primary-700 mt-1">→ {item.recommendation}</p>
      </div>
      {item.date && <span className="text-xs text-gray-400 shrink-0 mt-1">{fmt(item.date)}</span>}
    </div>
  );

  const renderInternItem = (item: BriefingItem) => {
    const isBlocked = item.status === 'blocked';
    const isOverdue = item.due_date && new Date(item.due_date) < new Date();
    return (
      <div key={item.id} className={`border rounded-xl px-4 py-3 flex items-start justify-between gap-3 ${isBlocked || isOverdue ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isBlocked && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Geblockt</span>}
            {isOverdue && !isBlocked && <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Überfällig</span>}
            {item.brand && <span className="text-xs text-gray-400">{item.brand}</span>}
          </div>
          <p className="text-sm font-semibold mt-1 truncate">{item.title}</p>
          {item.assignee && <p className="text-xs text-gray-500 truncate">{item.assignee}</p>}
          <p className="text-xs font-medium text-primary-700 mt-1">→ {item.recommendation}</p>
        </div>
        {item.due_date && <span className={`text-xs shrink-0 mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>{fmt(item.due_date)}</span>}
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      <p className="text-xs text-gray-400">Briefing wird generiert…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-red-600">{error}</p>
      <button onClick={() => { setError(null); setLoading(true); load(true); }}
        className="px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700">
        Nochmal versuchen
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-gray-800">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
          </h2>
          {briefing?.summary && (
            <p className="text-xs text-gray-500 mt-0.5">{briefing.summary}</p>
          )}
        </div>
        <button onClick={refresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
          {refreshing
            ? <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          }
          Neu generieren
        </button>
      </div>

      {briefing && (
        <>
          <Section title="Finance & Rechnungen" emoji="💶" items={briefing.finance} emptyText="Keine offenen Finance-Items."
            renderItem={renderFinanceItem} />
          <Section title="Postfach" emoji="📬" items={briefing.mails} emptyText="Keine neuen Mails."
            renderItem={renderMailItem} />
          <Section title="Interns & Tasks" emoji="👥" items={briefing.interns} emptyText="Alle Tasks im Plan."
            renderItem={renderInternItem} />
        </>
      )}
    </div>
  );
}
