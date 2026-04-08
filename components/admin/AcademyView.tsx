import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { WeeklyReview, LearningLogEntry, FinalReview } from '@/types';
import AddInternModal from './AddInternModal';

const STAGE_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  completed: 'Completed',
};

const STAGE_COLORS: Record<string, string> = {
  onboarding: 'bg-blue-500/15 text-blue-400',
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-violet-500/15 text-violet-400',
};

const MOOD_EMOJI: Record<number, string> = {
  1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄',
};

const DEPARTMENT_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  ecommerce: 'E-Commerce',
  support: 'Support',
  analytics: 'Analytics',
  finance: 'Finance',
  recruiting: 'Recruiting',
};

interface InternWithData {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string;
  department: string;
  assigned_brand: string | null;
  model: string;
  budget_tokens_monthly: number;
  is_active: boolean;
  created_at: string;
  cohort: string | null;
  stage: 'onboarding' | 'active' | 'completed';
  weeks: WeeklyReview[];
  tasks: LearningLogEntry[];
  finalReview: FinalReview | null;
  usage?: {
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
  };
}

function deriveStage(intern: { is_active: boolean; auth_user_id: string | null }): 'onboarding' | 'active' | 'completed' {
  if (!intern.is_active) return 'completed';
  if (intern.auth_user_id != null) return 'active';
  return 'onboarding';
}

// ─── Weekly Review Form ────────────────────────────────────────────────────
const WeeklyReviewForm: React.FC<{
  internId: string;
  weekNumber: number;
  onSaved: () => void;
}> = ({ internId, weekNumber, onSaved }) => {
  const [form, setForm] = useState({
    highlight: '', challenge: '', learning: '', next_goal: '', mood_score: 3,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from('intern_weekly_reviews').insert({
      intern_id: internId,
      week_number: weekNumber,
      ...form,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="mt-4 p-4 bg-surface-900/60 rounded-lg border border-white/[0.06] space-y-3">
      <p className="font-semibold text-sm text-slate-300">Week {weekNumber} Check-in</p>
      {[
        ['highlight', 'Highlight this week'],
        ['challenge', 'Biggest challenge'],
        ['learning', 'Key learning'],
        ['next_goal', 'Goal for next week'],
      ].map(([key, label]) => (
        <div key={key}>
          <label className="block text-xs text-slate-500 mb-1">{label}</label>
          <textarea
            rows={2}
            value={form[key as keyof typeof form] as string}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="w-full text-sm border border-white/[0.10] bg-white/[0.04] text-slate-100 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs text-slate-500 mb-1">Mood</label>
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
  internId: string;
  existing: FinalReview | null;
  onSaved: () => void;
}> = ({ internId, existing, onSaved }) => {
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
      await supabase.from('intern_final_review').update(form).eq('intern_id', internId);
    } else {
      await supabase.from('intern_final_review').insert({ intern_id: internId, ...form });
    }
    // Mark internship as completed
    await supabase.from('intern_accounts').update({ is_active: false }).eq('id', internId);
    setSaving(false);
    onSaved();
  }

  return (
    <div className="p-4 bg-violet-500/10 rounded-lg border border-violet-500/20 space-y-3">
      <p className="font-semibold text-sm text-violet-400">Exit Assessment</p>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Overall Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setForm(p => ({ ...p, overall_rating: n }))}
              className={`w-8 h-8 rounded-full font-bold text-sm transition-all ${
                form.overall_rating === n
                  ? 'bg-violet-500 text-white scale-110'
                  : 'bg-violet-500/15 text-violet-400'
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
          <label className="block text-xs text-slate-500 mb-1">{label}</label>
          <textarea
            rows={2}
            value={form[key as keyof typeof form] as string}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="w-full text-sm border border-white/[0.10] bg-white/[0.04] text-slate-100 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>
      ))}
      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
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

  const inviteAccepted = intern.auth_user_id != null;

  async function addTask() {
    if (!newTask.trim()) return;
    setAddingTask(true);
    await supabase.from('intern_learning_log').insert({
      intern_id: intern.id,
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

  async function deleteTask(taskId: string) {
    await supabase.from('intern_learning_log').delete().eq('id', taskId);
    onRefresh();
  }

  const internPortalUrl = `${window.location.origin}/intern/${intern.id}`;

  return (
    <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03]"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center font-bold text-primary-400 text-lg">
            {intern.full_name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-white">{intern.full_name}</p>
            <p className="text-xs text-slate-500">{intern.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            inviteAccepted
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-yellow-500/15 text-yellow-400'
          }`}>
            {inviteAccepted ? 'Accepted' : 'Pending'}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[intern.stage] ?? 'bg-slate-500/15 text-slate-400'}`}>
            {STAGE_LABELS[intern.stage] ?? intern.stage}
          </span>
          <span className="text-xs text-slate-500">
            W{intern.weeks.length} · {completedTasks}/{intern.tasks.length} tasks
          </span>
          <span className="text-slate-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 space-y-4">
          {/* Weekly Reviews Timeline */}
          <div>
            <div className="flex items-center justify-between mt-4 mb-2">
              <p className="text-sm font-semibold text-slate-300">Weekly Check-ins</p>
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
              <p className="text-xs text-slate-500 italic">No check-ins yet.</p>
            ) : (
              <div className="space-y-2">
                {intern.weeks.map(w => (
                  <div key={w.id} className="text-xs bg-surface-900/60 rounded-lg p-3 border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-300">Week {w.week_number}</span>
                      {w.mood_score && <span>{MOOD_EMOJI[w.mood_score]}</span>}
                    </div>
                    {w.highlight && <p className="text-slate-300"><span className="font-medium">✨</span> {w.highlight}</p>}
                    {w.challenge && <p className="text-slate-500 mt-0.5"><span className="font-medium">⚡</span> {w.challenge}</p>}
                    {w.learning && <p className="text-slate-500 mt-0.5"><span className="font-medium">📚</span> {w.learning}</p>}
                  </div>
                ))}
              </div>
            )}
            {showWeeklyForm && (
              <WeeklyReviewForm
                internId={intern.id}
                weekNumber={nextWeek}
                onSaved={() => { setShowWeeklyForm(false); onRefresh(); }}
              />
            )}
          </div>

          {/* Tasks */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-2">Tasks & Learning</p>
            {intern.tasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No tasks yet.</p>
            ) : (
              <div className="space-y-1.5">
                {intern.tasks.map(t => (
                  <div key={t.id} className="flex items-start gap-2 group/task">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(t.id, t.completed)}
                      className="mt-0.5 accent-amber-500"
                    />
                    <span className={`flex-1 text-sm ${t.completed ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                      {t.title}
                    </span>
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover/task:opacity-100 transition-opacity"
                      title="Delete task"
                    >
                      ×
                    </button>
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
                className="flex-1 text-sm border border-white/[0.10] bg-white/[0.04] text-slate-100 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/30 placeholder-slate-600"
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
                <p className="text-sm font-semibold text-slate-300">Final Review</p>
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
                <div className="text-xs bg-violet-500/10 rounded-lg p-3 border border-violet-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-300">Rating: {intern.finalReview.overall_rating}/5</span>
                    {intern.finalReview.recommend_for_hire && (
                      <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                        ✓ Hire Recommended
                      </span>
                    )}
                  </div>
                  {intern.finalReview.key_contributions && (
                    <p className="text-slate-400">{intern.finalReview.key_contributions}</p>
                  )}
                </div>
              )}
              {showFinalForm && (
                <FinalReviewForm
                  internId={intern.id}
                  existing={intern.finalReview}
                  onSaved={() => { setShowFinalForm(false); onRefresh(); }}
                />
              )}
            </div>
          )}

          {/* Intern Portal Link */}
          <div className="pt-2 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500 mb-1">Intern Portal Link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={internPortalUrl}
                className="flex-1 text-xs bg-white/[0.04] border border-white/[0.10] rounded px-2 py-1.5 text-slate-400"
              />
              <button
                onClick={() => navigator.clipboard.writeText(internPortalUrl)}
                className="text-xs text-primary-600 hover:underline whitespace-nowrap"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Deactivate button */}
          {intern.is_active && (
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={async () => {
                  await supabase.from('intern_accounts').update({ is_active: false }).eq('id', intern.id);
                  onRefresh();
                }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Intern deaktivieren
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main AcademyView ─────────────────────────────────────────────────────
const AcademyView: React.FC = () => {
  const [interns, setInterns] = useState<InternWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'onboarding' | 'active' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);

  async function load() {
    setLoading(true);

    const { data: accounts } = await supabase
      .from('intern_accounts')
      .select('id, auth_user_id, full_name, email, department, assigned_brand, model, budget_tokens_monthly, is_active, created_at, cohort')
      .order('created_at', { ascending: false });

    if (!accounts || accounts.length === 0) {
      setInterns([]);
      setLoading(false);
      return;
    }

    const ids = accounts.map((a: any) => a.id);
    const month = new Date().toISOString().slice(0, 7);

    const [weeksRes, tasksRes, finalRes, usageRes] = await Promise.all([
      supabase.from('intern_weekly_reviews').select('*').in('intern_id', ids).order('week_number'),
      supabase.from('intern_learning_log').select('*').in('intern_id', ids).order('created_at'),
      supabase.from('intern_final_review').select('*').in('intern_id', ids),
      supabase.from('intern_token_usage').select('intern_id, tokens_input, tokens_output, cost_usd').in('intern_id', ids).eq('month', month),
    ]);

    const weeks = weeksRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const finals = finalRes.data ?? [];

    const usageMap: Record<string, { tokens_input: number; tokens_output: number; cost_usd: number }> = {};
    (usageRes.data ?? []).forEach((u: any) => {
      usageMap[u.intern_id] = { tokens_input: u.tokens_input, tokens_output: u.tokens_output, cost_usd: u.cost_usd };
    });

    setInterns(accounts.map((a: any) => ({
      id: a.id,
      auth_user_id: a.auth_user_id,
      full_name: a.full_name,
      email: a.email,
      department: a.department,
      assigned_brand: a.assigned_brand,
      model: a.model,
      budget_tokens_monthly: a.budget_tokens_monthly,
      is_active: a.is_active,
      created_at: a.created_at,
      cohort: a.cohort,
      stage: deriveStage(a),
      weeks: weeks.filter((w: any) => w.intern_id === a.id),
      tasks: tasks.filter((t: any) => t.intern_id === a.id),
      finalReview: finals.find((f: any) => f.intern_id === a.id) ?? null,
      usage: usageMap[a.id],
    })));

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const displayed = filter === 'all' ? interns : interns.filter(i => i.stage === filter);

  const counts = {
    all: interns.length,
    onboarding: interns.filter(i => i.stage === 'onboarding').length,
    active: interns.filter(i => i.stage === 'active').length,
    completed: interns.filter(i => i.stage === 'completed').length,
  };

  const pendingInvites = interns.filter(i => i.auth_user_id === null);

  function copyAllPendingEmails() {
    const emails = pendingInvites.map(i => i.email).join(', ');
    navigator.clipboard.writeText(emails);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Founders Associate Academy</h2>
          <p className="text-sm text-slate-500 mt-1">Full intern lifecycle — onboarding → active → completed</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          ＋ Intern hinzufügen
        </button>
      </div>

      {showAddModal && (
        <AddInternModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); load(); }}
        />
      )}

      {/* Pending Invites Banner */}
      {pendingInvites.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-yellow-400">
                Pending Invites ({pendingInvites.length})
              </p>
              <p className="text-xs text-yellow-500/80 mt-0.5">
                Diese Interns haben ihre Einladungs-Mail noch nicht geöffnet / Zugang noch nicht aktiviert.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyAllPendingEmails}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                Copy All Emails
              </button>
              <button
                disabled={sendingBatch}
                onClick={async () => {
                  if (!window.confirm(`Alle ${pendingInvites.length} ausstehenden Interns erhalten jetzt ihre Magic Link Einladung. Fortfahren?`)) return;
                  setSendingBatch(true);
                  for (const i of pendingInvites) {
                    await supabase.functions.invoke('resend-intern-invite', { body: { intern_id: i.id } });
                  }
                  setSendingBatch(false);
                  // toast placeholder — replace with your toast implementation
                  alert(`${pendingInvites.length} Einladungen verschickt! 🚀`);
                }}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                {sendingBatch ? 'Sende…' : '🚀 Alle einladen'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingInvites.map(i => (
              <span
                key={i.id}
                className="text-xs bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 px-2.5 py-1 rounded-full font-medium"
              >
                {i.email}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Onboarding', count: counts.onboarding, color: 'blue' },
          { label: 'Active', count: counts.active, color: 'green' },
          { label: 'Completed', count: counts.completed, color: 'purple' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold text-${color}-400`}>{count}</p>
            <p className={`text-sm text-${color}-400/80 mt-1`}>{label}</p>
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
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-white/[0.05] text-slate-500 hover:text-slate-300 border border-white/[0.06]'
            }`}
          >
            {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* ─── Token-Verbrauch (AI Senior Accounts) ─── */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-surface-900/60 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-bold text-white">Token-Verbrauch · AI Senior</h3>
            <p className="text-xs text-slate-500">Monat: {new Date().toISOString().slice(0, 7)}</p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8 text-slate-500 text-sm">Lade Accounts…</div>
        ) : interns.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Noch keine Intern-Accounts vorhanden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-surface-900/60">
                  {['Intern', 'Department', 'Invite', 'Modell', 'Tokens (Monat)', 'Kosten', 'Budget', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {interns.map(acc => {
                  const totalTokens = (acc.usage?.tokens_input ?? 0) + (acc.usage?.tokens_output ?? 0);
                  const budgetPct = Math.min(100, Math.round((totalTokens / acc.budget_tokens_monthly) * 100));
                  return (
                    <tr key={acc.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{acc.full_name}</p>
                        <p className="text-xs text-slate-500">{acc.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-1 rounded-full font-medium">
                          {DEPARTMENT_LABELS[acc.department] ?? acc.department}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          acc.auth_user_id != null
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {acc.auth_user_id != null ? 'Accepted' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {acc.model.includes('haiku') ? 'Haiku' : 'Sonnet'}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {totalTokens.toLocaleString()}
                        <div className="w-24 h-1.5 bg-white/[0.10] rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${budgetPct >= 90 ? 'bg-red-500' : budgetPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${budgetPct}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        ${(acc.usage?.cost_usd ?? 0).toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {acc.budget_tokens_monthly.toLocaleString()} · {budgetPct}%
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STAGE_COLORS[acc.stage] ?? 'bg-slate-500/15 text-slate-400'}`}>
                          {STAGE_LABELS[acc.stage] ?? acc.stage}
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

      {/* Intern lifecycle cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">🎓</p>
          <p className="font-medium">No interns in this stage yet.</p>
          <p className="text-sm mt-1">Interns are managed via SQL in intern_accounts.</p>
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
