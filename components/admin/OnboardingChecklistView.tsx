import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';

// Tom's standard Week-1 onboarding items per docs/intern-academy/README.md
// + buddy-program.md cadence. Stored as jsonb arrays in intern_onboarding_checklist.items
const STANDARD_ITEMS: Array<{ key: string; label: string; phase: string }> = [
  { key: 'magic_link_used',       label: 'Magic-Link genutzt (eingeloggt)',     phase: 'Day 1' },
  { key: 'profile_complete',      label: 'Profil ausgefüllt',                  phase: 'Day 1' },
  { key: 'buddy_intro',           label: 'Buddy Intro 1:1 (30min)',            phase: 'Day 2' },
  { key: 'tools_setup',           label: 'Tools-Setup (Slack, BusinessOS, ggf. Linear)', phase: 'Day 2' },
  { key: 'goals_set',             label: '3 persönliche Goals gesetzt',         phase: 'Week 1' },
  { key: 'first_monday_attended', label: 'First Monday Meeting attended',       phase: 'Week 1' },
];

interface InternRow {
  id: string;
  full_name: string;
  email: string;
  phase: string;
  created_at: string;
  auth_user_id: string | null;
  is_active: boolean;
}

interface ChecklistRow {
  intern_id: string;
  items: Record<string, boolean | string> | null;
  updated_at: string;
}

const OnboardingChecklistView: React.FC = () => {
  const [interns, setInterns] = useState<InternRow[]>([]);
  const [checklists, setChecklists] = useState<Record<string, ChecklistRow>>({});
  const [loading, setLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState<string>('onboarding');
  const [savingFor, setSavingFor] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [iRes, cRes] = await Promise.all([
      supabase.from('intern_accounts').select('id, full_name, email, phase, created_at, auth_user_id, is_active').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('intern_onboarding_checklist').select('intern_id, items, updated_at'),
    ]);
    setInterns((iRes.data as InternRow[]) ?? []);
    const cMap: Record<string, ChecklistRow> = {};
    ((cRes.data as ChecklistRow[]) ?? []).forEach(r => { cMap[r.intern_id] = r; });
    setChecklists(cMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getItemStatus = (internId: string, itemKey: string): boolean => {
    const cl = checklists[internId];
    if (!cl?.items) return false;
    const v = cl.items[itemKey];
    return v === true || v === 'done' || v === 'completed';
  };

  const toggleItem = async (intern: InternRow, itemKey: string) => {
    setSavingFor(intern.id);
    const existing = checklists[intern.id];
    const currentItems = (existing?.items ?? {}) as Record<string, boolean>;
    const newItems = { ...currentItems, [itemKey]: !getItemStatus(intern.id, itemKey) };

    if (existing) {
      const { error } = await supabase
        .from('intern_onboarding_checklist')
        .update({ items: newItems, updated_at: new Date().toISOString() })
        .eq('intern_id', intern.id);
      if (error) { alert(`Save failed: ${error.message}`); setSavingFor(null); return; }
    } else {
      const { error } = await supabase
        .from('intern_onboarding_checklist')
        .insert({ intern_id: intern.id, items: newItems, updated_at: new Date().toISOString() });
      if (error) { alert(`Insert failed: ${error.message}`); setSavingFor(null); return; }
    }

    setChecklists({
      ...checklists,
      [intern.id]: { intern_id: intern.id, items: newItems, updated_at: new Date().toISOString() },
    });
    setSavingFor(null);
  };

  const filtered = useMemo(() => {
    if (filterPhase === 'all') return interns;
    return interns.filter(i => i.phase === filterPhase);
  }, [interns, filterPhase]);

  const stats = useMemo(() => {
    const totals = STANDARD_ITEMS.map(item => ({
      key: item.key,
      label: item.label,
      done: filtered.filter(i => getItemStatus(i.id, item.key)).length,
      total: filtered.length,
    }));
    const overallDone = filtered.reduce((sum, i) =>
      sum + STANDARD_ITEMS.filter(item => getItemStatus(i.id, item.key)).length, 0);
    const overallTotal = filtered.length * STANDARD_ITEMS.length;
    return { perItem: totals, overallDone, overallTotal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, checklists]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Spinner /></div>;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#1d1d1f]">Onboarding Checklist</h1>
          <p className="mt-1 text-sm text-[#515154]">
            Wer ist wo im Week-1-Onboarding. Items folgen Tom's Framework (Day 1, Day 2, Week 1).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterPhase}
            onChange={(e) => setFilterPhase(e.target.value)}
            className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          >
            <option value="all">All phases</option>
            <option value="onboarding">Onboarding only</option>
            <option value="foundation">Foundation</option>
            <option value="specialisation">Specialisation</option>
            <option value="ownership">Ownership</option>
          </select>
        </div>
      </header>

      {/* Cohort progress summary */}
      <section className="mb-6 rounded-xl border border-black/[0.08] bg-white p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#515154]">Cohort Completion</h2>
          <span className="text-2xl font-black tabular-nums text-[#0F766E]">
            {stats.overallTotal === 0 ? '—' : `${Math.round((stats.overallDone / stats.overallTotal) * 100)}%`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {stats.perItem.map(s => (
            <div key={s.key} className="rounded-lg border border-black/[0.06] bg-slate-50 p-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#515154] line-clamp-1" title={s.label}>{s.label}</p>
              <p className="mt-1 text-lg font-black tabular-nums text-[#1d1d1f]">{s.done}/{s.total}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Per-fellow checklist grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-12 text-center text-sm text-[#515154]">
          Keine aktiven Fellows in dieser Phase.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/[0.08] bg-white shadow-sm">
          <table className="min-w-full divide-y divide-black/[0.06] text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#515154]">
                <th className="px-4 py-3 font-bold sticky left-0 bg-black/[0.03] z-10 min-w-[200px]">Fellow</th>
                {STANDARD_ITEMS.map(item => (
                  <th key={item.key} className="px-3 py-3 font-bold text-center min-w-[110px]">
                    <div>{item.label.split(' ').slice(0, 2).join(' ')}</div>
                    <div className="text-[9px] font-normal text-[#515154] mt-0.5">{item.phase}</div>
                  </th>
                ))}
                <th className="px-3 py-3 font-bold text-center">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {filtered.map(intern => {
                const doneCount = STANDARD_ITEMS.filter(item => getItemStatus(intern.id, item.key)).length;
                const pct = Math.round((doneCount / STANDARD_ITEMS.length) * 100);
                return (
                  <tr key={intern.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 sticky left-0 bg-white z-10">
                      <div className="font-semibold text-[#1d1d1f]">{intern.full_name}</div>
                      <div className="text-xs text-[#515154]">{intern.email}</div>
                      <div className="text-[10px] text-[#515154] mt-0.5">{intern.phase} · {intern.auth_user_id ? '✓ logged in' : '⏳ pending'}</div>
                    </td>
                    {STANDARD_ITEMS.map(item => {
                      const done = getItemStatus(intern.id, item.key);
                      return (
                        <td key={item.key} className="px-3 py-3 text-center">
                          <button
                            onClick={() => toggleItem(intern, item.key)}
                            disabled={savingFor === intern.id}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded transition-colors ${
                              done
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } disabled:opacity-50`}
                            title={done ? 'Mark as not done' : 'Mark as done'}
                          >
                            {done ? '✓' : '·'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                        pct === 100 ? 'bg-emerald-100 text-emerald-800' :
                        pct >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-[#515154]">
        Klick auf ein Feld toggled den Status. Speichert direkt zu <code className="bg-black/[0.05] px-1 rounded">intern_onboarding_checklist</code>.
      </p>
    </div>
  );
};

export default OnboardingChecklistView;
