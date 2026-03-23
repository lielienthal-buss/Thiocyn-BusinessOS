import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_CHECKLIST = [
  { id: 'contract', label: 'Contract signed' },
  { id: 'email', label: 'Company email set up' },
  { id: 'tools', label: 'Tools & access granted' },
  { id: 'intro', label: 'Team intro done' },
  { id: 'first_task', label: 'First task assigned' },
  { id: 'day1', label: 'Day 1 check-in completed' },
  { id: 'week1', label: 'Week 1 review done' },
];

interface ChecklistState {
  [itemId: string]: boolean;
}

const OnboardingView: React.FC = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<{ [candidateId: string]: ChecklistState }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: apps } = await supabase
      .from('applications')
      .select('id, full_name, email, status, project_interest')
      .in('status', ['hired', 'onboarding'])
      .order('created_at', { ascending: false });

    setCandidates(apps || []);

    if (apps && apps.length > 0) {
      const ids = apps.map((a: any) => a.id);
      const { data: dbChecklists } = await supabase
        .from('intern_onboarding_checklist')
        .select('application_id, items')
        .in('application_id', ids);

      const saved: { [id: string]: ChecklistState } = {};
      apps.forEach((c: any) => {
        const found = dbChecklists?.find((d: any) => d.application_id === c.id);
        if (found) {
          saved[c.id] = found.items;
        } else {
          // fallback: migrate from localStorage if exists
          const stored = localStorage.getItem(`onboarding-checklist-${c.id}`);
          saved[c.id] = stored ? JSON.parse(stored) : {};
        }
      });
      setChecklists(saved);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleItem(candidateId: string, itemId: string) {
    const updated = {
      ...checklists,
      [candidateId]: {
        ...checklists[candidateId],
        [itemId]: !checklists[candidateId]?.[itemId],
      },
    };
    setChecklists(updated);

    // Persist to Supabase
    setSaving(candidateId);
    await supabase.from('intern_onboarding_checklist').upsert({
      application_id: candidateId,
      items: updated[candidateId],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'application_id' });
    setSaving(null);
  }

  async function promoteToActive(candidateId: string) {
    await supabase.from('applications').update({ status: 'active' }).eq('id', candidateId);
    await load();
  }

  function getProgress(candidateId: string) {
    const cl = checklists[candidateId] || {};
    const done = DEFAULT_CHECKLIST.filter(item => cl[item.id]).length;
    return Math.round((done / DEFAULT_CHECKLIST.length) * 100);
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (candidates.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No candidates in onboarding yet. Move hires to the Onboarding stage in the Kanban board.
      </div>
    );
  }

  return (
    <div className="p-6 animate-[fadeIn_0.5s_ease-out]">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">🚀 Onboarding</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {candidates.map(candidate => {
          const progress = getProgress(candidate.id);
          const cl = checklists[candidate.id] || {};
          const isComplete = progress === 100;

          return (
            <div key={candidate.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{candidate.full_name}</h3>
                <p className="text-sm text-gray-500">{candidate.email}</p>
                {candidate.project_interest && candidate.project_interest.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {Array.isArray(candidate.project_interest)
                      ? candidate.project_interest.join(', ')
                      : candidate.project_interest}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span className="flex items-center gap-1">
                    {saving === candidate.id && <span className="text-primary-500">saving…</span>}
                    {progress}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-primary-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <ul className="space-y-2">
                {DEFAULT_CHECKLIST.map(item => (
                  <li
                    key={item.id}
                    onClick={() => toggleItem(candidate.id, item.id)}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      cl[item.id]
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-300 dark:border-slate-500 group-hover:border-green-400'
                    }`}>
                      {cl[item.id] && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${cl[item.id] ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>

              {isComplete && (
                <button
                  onClick={() => promoteToActive(candidate.id)}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  ✓ Onboarding Complete — Move to Active
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingView;
