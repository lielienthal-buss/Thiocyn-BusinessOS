import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('applications')
        .select('*')
        .in('stage', ['hired', 'onboarding'])
        .order('created_at', { ascending: false });
      setCandidates(data || []);
      const saved: { [id: string]: ChecklistState } = {};
      (data || []).forEach((c: any) => {
        const stored = localStorage.getItem(`onboarding-checklist-${c.id}`);
        saved[c.id] = stored ? JSON.parse(stored) : {};
      });
      setChecklists(saved);
      setLoading(false);
    }
    load();
  }, []);

  function toggleItem(candidateId: string, itemId: string) {
    setChecklists(prev => {
      const updated = {
        ...prev,
        [candidateId]: {
          ...prev[candidateId],
          [itemId]: !prev[candidateId]?.[itemId],
        },
      };
      localStorage.setItem(`onboarding-checklist-${candidateId}`, JSON.stringify(updated[candidateId]));
      return updated;
    });
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
          return (
            <div key={candidate.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{candidate.full_name}</h3>
                <p className="text-sm text-gray-500">{candidate.email}</p>
                {candidate.preferred_project_areas && candidate.preferred_project_areas.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {Array.isArray(candidate.preferred_project_areas)
                      ? candidate.preferred_project_areas.join(', ')
                      : candidate.preferred_project_areas}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingView;
