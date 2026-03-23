import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { WeeklyReview, LearningLogEntry, FinalReview } from '../../types';
import AddInternModal from './AddInternModal';

const STAGE_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  completed: 'Completed',
};

const STAGE_COLORS: Record<string, string> = {
  onboarding: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
};

const MOOD_EMOJI: Record<number, string> = {
  1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄',
};

interface InternWithData {
  id: string;
  full_name: string;
  email: string;
  stage: string;
  created_at: string;
  weeks: WeeklyReview[];
  tasks: LearningLogEntry[];
  finalReview: FinalReview | null;
}

// ─── Weekly Review Form ────────────────────────────────────────────────────
const WeeklyReviewForm: React.FC<{
  applicationId: string;
  weekNumber: number;
  onSaved: () => void;
}> = ({ applicationId, weekNumber, onSaved }) => {
  const [form, setForm] = useState({
    highlight: '', challenge: '', learning: '', next_goal: '', mood_score: 3,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from('intern_weekly_reviews').insert({
      application_id: applicationId,
      week_number: weekNumber,
      ...form,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-3">
      <p className="font-semibold text-sm text-gray-700">Week {weekNumber} Check-in</p>
      {[
        ['highlight', 'Highlight this week'],
        ['challenge', 'Biggest challenge'],
        ['learning', 'Key learning'],
        ['next_goal', 'Goal for next week'],
      ].map(([key, label]) => (
        <div key={key}>
          <label className="block text-xs text-gray-500 mb-1">{label}</label>
          <textarea
            rows={2}
            value={form[key as keyof typeof form] as string}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Mood</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setForm(p => ({ ...p, mood_score: n }))}
              className={`text-xl rounded-full w-9 h-9 transition-all ${form.mood_score === n ? 'ring-2 ring-primary-500 scale-110' : 'opacity-50'}`}
            >
              {MOOD_EMOJI[n]}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Check-in'}
      </button>
    </div>
  );
};

// ─── Final Review Form ─────────────────────────────────────────────────────
const FinalReviewForm: React.FC<{
  applicationId: string;
  existing: FinalReview | null;
  onSaved: () => void;
}> = ({ applicationId, existing, onSaved }) => {
  const [form, setForm] = useState({
    overall_rating: existing?.overall_rating ?? 3,
    key_contributions: existing?.key_contributions ?? '',
    growth_areas: existing?.growth_areas ?? '',
    recommend_for_hire: existing?.recommend_for_hire ?? false,
    admin_notes: existing?.admin_notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    if (existing) {
      await supabase.from('intern_final_review').update(form).eq('application_id', applicationId);
    } else {
      await supabase.from('intern_final_review').insert({ application_id: applicationId, ...form });
    }
    // Mark internship as completed
    await supabase.from('applications').update({ status: 'completed' }).eq('id', applicationId);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
      <p className="font-semibold text-sm text-purple-800">Exit Assessment</p>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Overall Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setForm(p => ({ ...p, overall_rating: n }))}
              className={`w-8 h-8 rounded-full font-bold text-sm transition-all ${
                form.overall_rating === n
                  ? 'bg-purple-600 text-white scale-110'
                  : 'bg-purple-100 text-purple-600'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {[
        ['key_contributions', 'Key contributions'],
        ['growth_areas', 'Areas of growth'],
        ['admin_notes', 'Internal notes'],
      ].map(([key, label]) => (
        <div key={key}>
          <label className="block text-xs text-gray-500 mb-1">{label}</label>
          <textarea
            rows={2}
            value={form[key as keyof typeof form] as string}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="w-full text-sm border rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.recommend_for_hire}
          onChange={e => setForm(p => ({ ...p, recommend_for_hire: e.target.checked }))}
          className="accent-purple-600"
        />
        Recommend for full-time hire
      </label>
      <button
        onClick={save}
        disabled={saving}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
      >
        {saving ? 'Saving…' : existing ? 'Update Review' : 'Complete Internship'}
      </button>
    </div>
  );
};

// ─── Intern Card ──────────────────────────────────────────────────────────
const InternCard: React.FC<{ intern: InternWithData; onRefresh: () => void }> = ({
  intern,
  onRefresh,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showWeeklyForm, setShowWeeklyForm] = useState(false);
  const [showFinalForm, setShowFinalForm] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const completedTasks = intern.tasks.filter(t => t.completed).length;
  const nextWeek = (intern.weeks.length > 0 ? Math.max(...intern.weeks.map(w => w.week_number)) + 1 : 1);

  async function addTask() {
    if (!newTask.trim()) return;
    setAddingTask(true);
    await supabase.from('intern_learning_log').insert({
      application_id: intern.id,
      type: 'task',
      title: newTask.trim(),
    });
    setNewTask('');
    setAddingTask(false);
    onRefresh();
  }

  async function toggleTask(taskId: string, current: boolean) {
    await supabase.from('intern_learning_log').update({
      completed: !current,
      completed_at: !current ? new Date().toISOString() : null,
    }).eq('id', taskId);
    onRefresh();
  }

  const internPortalUrl = `${window.location.origin}/intern/${intern.id}`;

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center font-bold text-primary-700 text-lg">
            {intern.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{intern.full_name}</p>
            <p className="text-xs text-gray-500">{intern.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[intern.stage] ?? 'bg-gray-100 text-gray-600'}`}>
            {STAGE_LABELS[intern.stage] ?? intern.stage}
          </span>
          <span className="text-xs text-gray-400">
            W{intern.weeks.length} • {completedTasks}/{intern.tasks.length} tasks
          </span>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 space-y-4">
          {/* Weekly Reviews Timeline */}
          <div>
            <div className="flex items-center justify-between mt-4 mb-2">
              <p className="text-sm font-semibold text-gray-700">Weekly Check-ins</p>
              {intern.stage === 'active' && (
                <button
                  onClick={() => setShowWeeklyForm(p => !p)}
                  className="text-xs text-primary-600 hover:underline"
                >
                  + Week {nextWeek}
                </button>
              )}
            </div>
            {intern.weeks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No check-ins yet.</p>
            ) : (
              <div className="space-y-2">
                {intern.weeks.map(w => (
                  <div key={w.id} className="text-xs bg-gray-50 rounded-lg p-3 border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-700">Week {w.week_number}</span>
                      {w.mood_score && <span>{MOOD_EMOJI[w.mood_score]}</span>}
                    </div>
                    {w.highlight && <p className="text-gray-600"><span className="font-medium">✨</span> {w.highlight}</p>}
                    {w.challenge && <p className="text-gray-500 mt-0.5"><span className="font-medium">⚡</span> {w.challenge}</p>}
                    {w.learning && <p className="text-gray-500 mt-0.5"><span className="font-medium">📚</span> {w.learning}</p>}
                  </div>
                ))}
              </div>
            )}
            {showWeeklyForm && (
              <WeeklyReviewForm
                applicationId={intern.id}
                weekNumber={nextWeek}
                onSaved={() => { setShowWeeklyForm(false); onRefresh(); }}
              />
            )}
          </div>

          {/* Tasks */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Tasks & Learning</p>
            {intern.tasks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No tasks yet.</p>
            ) : (
              <div className="space-y-1.5">
                {intern.tasks.map(t => (
                  <div key={t.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(t.id, t.completed)}
                      className="mt-0.5 accent-primary-600"
                    />
                    <span className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {t.title}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Add task…"
                className="flex-1 text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
              <button
                onClick={addTask}
                disabled={addingTask || !newTask.trim()}
                className="bg-primary-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Final Review */}
          {(intern.stage === 'active' || intern.stage === 'completed') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">Final Review</p>
                {!showFinalForm && (
                  <button
                    onClick={() => setShowFinalForm(true)}
                    className="text-xs text-purple-600 hover:underline"
                  >
                    {intern.finalReview ? 'Edit' : '+ Create'}
                  </button>
                )}
              </div>
              {intern.finalReview && !showFinalForm && (
                <div className="text-xs bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">Rating: {intern.finalReview.overall_rating}/5</span>
                    {intern.finalReview.recommend_for_hire && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        ✓ Hire Recommended
                      </span>
                    )}
                  </div>
                  {intern.finalReview.key_contributions && (
                    <p className="text-gray-600">{intern.finalReview.key_contributions}</p>
                  )}
                </div>
              )}
              {showFinalForm && (
                <FinalReviewForm
                  applicationId={intern.id}
                  existing={intern.finalReview}
                  onSaved={() => { setShowFinalForm(false); onRefresh(); }}
                />
              )}
            </div>
          )}

          {/* Intern Portal Link */}
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-500 mb-1">Intern Portal Link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={internPortalUrl}
                className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1.5 text-gray-600"
              />
              <button
                onClick={() => navigator.clipboard.writeText(internPortalUrl)}
                className="text-xs text-primary-600 hover:underline whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface InternAccountRow {
  id: string;
  full_name: string;
  email: string;
  department: string;
  assigned_brand: string | null;
  model: string;
  budget_tokens_monthly: number;
  is_active: boolean;
  usage?: {
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
  };
}

const DEPARTMENT_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  ecommerce: 'E-Commerce',
  support: 'Support',
  analytics: 'Analytics',
  finance: 'Finance',
  recruiting: 'Recruiting',
};

// ─── Main AcademyView ─────────────────────────────────────────────────────
const AcademyView: React.FC = () => {
  const [interns, setInterns] = useState<InternWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'onboarding' | 'active' | 'completed'>('all');
  const [internAccounts, setInternAccounts] = useState<InternAccountRow[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [showAddInternModal, setShowAddInternModal] = useState(false);

  async function load() {
    setLoading(true);
    const { data: apps } = await supabase
      .from('applications')
      .select('id, full_name, email, status, created_at')
      .in('status', ['onboarding', 'active', 'completed'])
      .order('created_at', { ascending: false });

    if (!apps || apps.length === 0) {
      setInterns([]);
      setLoading(false);
      return;
    }

    const ids = apps.map((a: any) => a.id);

    const [weeksRes, tasksRes, finalRes] = await Promise.all([
      supabase.from('intern_weekly_reviews').select('*').in('application_id', ids).order('week_number'),
      supabase.from('intern_learning_log').select('*').in('application_id', ids).order('created_at'),
      supabase.from('intern_final_review').select('*').in('application_id', ids),
    ]);

    const weeks = weeksRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const finals = finalRes.data ?? [];

    setInterns(apps.map((a: any) => ({
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      stage: a.status,
      created_at: a.created_at,
      weeks: weeks.filter((w: any) => w.application_id === a.id),
      tasks: tasks.filter((t: any) => t.application_id === a.id),
      finalReview: finals.find((f: any) => f.application_id === a.id) ?? null,
    })));
    setLoading(false);
  }

  async function loadInternAccounts() {
    setAccountsLoading(true);
    const { data: accounts } = await supabase
      .from('intern_accounts')
      .select('id, full_name, email, department, assigned_brand, model, budget_tokens_monthly, is_active')
      .order('created_at', { ascending: false });

    if (!accounts || accounts.length === 0) {
      setInternAccounts([]);
      setAccountsLoading(false);
      return;
    }

    const month = new Date().toISOString().slice(0, 7);
    const ids = accounts.map((a: any) => a.id);
    const { data: usageData } = await supabase
      .from('intern_token_usage')
      .select('intern_id, tokens_input, tokens_output, cost_usd')
      .in('intern_id', ids)
      .eq('month', month);

    const usageMap: Record<string, { tokens_input: number; tokens_output: number; cost_usd: number }> = {};
    (usageData ?? []).forEach((u: any) => {
      usageMap[u.intern_id] = { tokens_input: u.tokens_input, tokens_output: u.tokens_output, cost_usd: u.cost_usd };
    });

    setInternAccounts(accounts.map((a: any) => ({ ...a, usage: usageMap[a.id] })));
    setAccountsLoading(false);
  }

  useEffect(() => { load(); loadInternAccounts(); }, []);

  const displayed = filter === 'all' ? interns : interns.filter(i => i.stage === filter);

  const counts = {
    all: interns.length,
    onboarding: interns.filter(i => i.stage === 'onboarding').length,
    active: interns.filter(i => i.stage === 'active').length,
    completed: interns.filter(i => i.stage === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {showAddInternModal && (
        <AddInternModal
          onClose={() => setShowAddInternModal(false)}
          onCreated={() => loadInternAccounts()}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Founders Associate Academy</h2>
          <p className="text-sm text-gray-500 mt-1">Full intern lifecycle — onboarding → active → completed</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Onboarding', count: counts.onboarding, color: 'blue' },
          { label: 'Active', count: counts.active, color: 'green' },
          { label: 'Completed', count: counts.completed, color: 'purple' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold text-${color}-700`}>{count}</p>
            <p className={`text-sm text-${color}-600 mt-1`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'onboarding', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* ─── Token-Verbrauch (AI Senior Accounts) ─── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Token-Verbrauch · AI Senior</h3>
            <p className="text-xs text-gray-500">Monat: {new Date().toISOString().slice(0, 7)}</p>
          </div>
          <button
            onClick={() => setShowAddInternModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            + Intern hinzufügen
          </button>
        </div>
        {accountsLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Lade Accounts…</div>
        ) : internAccounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            Noch keine AI-Senior-Accounts. Erstelle den ersten Intern-Account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Intern', 'Department', 'Modell', 'Tokens (Monat)', 'Kosten', 'Budget', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {internAccounts.map(acc => {
                  const totalTokens = (acc.usage?.tokens_input ?? 0) + (acc.usage?.tokens_output ?? 0);
                  const budgetPct = Math.min(100, Math.round((totalTokens / acc.budget_tokens_monthly) * 100));
                  return (
                    <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{acc.full_name}</p>
                        <p className="text-xs text-gray-400">{acc.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {DEPARTMENT_LABELS[acc.department] ?? acc.department}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {acc.model.includes('haiku') ? 'Haiku' : 'Sonnet'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {totalTokens.toLocaleString()}
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        ${(acc.usage?.cost_usd ?? 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {acc.budget_tokens_monthly.toLocaleString()} · {budgetPct}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          acc.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {acc.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intern list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🎓</p>
          <p className="font-medium">No interns in this stage yet.</p>
          <p className="text-sm mt-1">Move candidates to "Onboarding" or "Active" in the Kanban board.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(intern => (
            <InternCard key={intern.id} intern={intern} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AcademyView;
