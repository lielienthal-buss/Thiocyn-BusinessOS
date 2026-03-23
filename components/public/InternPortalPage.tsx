import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import type { WeeklyReview, LearningLogEntry, FinalReview } from '../../types';
import InternChat from '../academy/InternChat';

const STAGE_STEPS = ['applied', 'task_requested', 'interview', 'hired', 'onboarding', 'active', 'completed'];
const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  task_requested: 'Task',
  interview: 'Interview',
  hired: 'Hired',
  onboarding: 'Onboarding',
  active: 'Active Intern',
  completed: 'Completed',
};

const MOOD_EMOJI: Record<number, string> = {
  1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄',
};

// ─── Weekly Check-in Form (for interns to submit their own) ───────────────
const InternWeeklyForm: React.FC<{
  applicationId: string;
  weekNumber: number;
  onSaved: () => void;
}> = ({ applicationId, weekNumber, onSaved }) => {
  const [form, setForm] = useState({
    highlight: '', challenge: '', learning: '', next_goal: '', mood_score: 3,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setSaving(true);
    await supabase.from('intern_weekly_reviews').insert({
      application_id: applicationId,
      week_number: weekNumber,
      ...form,
    });
    setSaving(false);
    setSaved(true);
    onSaved();
  }

  if (saved) {
    return (
      <div className="p-6 bg-green-900/30 border border-green-500/30 rounded-xl text-center">
        <p className="text-green-300 font-semibold">✓ Check-in submitted for Week {weekNumber}!</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-800/60 backdrop-blur-lg border border-white/10 rounded-xl space-y-4">
      <h3 className="text-white font-bold text-lg">Week {weekNumber} Check-in</h3>
      {[
        ['highlight', '✨ Highlight this week', 'What went well?'],
        ['challenge', '⚡ Biggest challenge', 'What was hard?'],
        ['learning', '📚 Key learning', 'What did you learn?'],
        ['next_goal', '🎯 Goal for next week', 'What will you focus on?'],
      ].map(([key, label, placeholder]) => (
        <div key={key}>
          <label className="block text-sm text-gray-400 mb-1">{label}</label>
          <textarea
            rows={2}
            placeholder={placeholder}
            value={form[key as keyof typeof form] as string}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="w-full bg-slate-700/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder-gray-500"
          />
        </div>
      ))}
      <div>
        <label className="block text-sm text-gray-400 mb-2">How are you feeling?</label>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setForm(p => ({ ...p, mood_score: n }))}
              className={`text-2xl rounded-full w-11 h-11 transition-all ${form.mood_score === n ? 'ring-2 ring-primary-400 scale-110' : 'opacity-40 hover:opacity-80'}`}
            >
              {MOOD_EMOJI[n]}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? 'Submitting…' : 'Submit Check-in'}
      </button>
    </div>
  );
};

// ─── Main Intern Portal ───────────────────────────────────────────────────
const InternPortalPage: React.FC = () => {
  const [intern, setIntern] = useState<any>(null);
  const [weeks, setWeeks] = useState<WeeklyReview[]>([]);
  const [tasks, setTasks] = useState<LearningLogEntry[]>([]);
  const [finalReview, setFinalReview] = useState<FinalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'portal' | 'ai-senior'>('portal');
  const [internAccount, setInternAccount] = useState<any>(null);
  const [tokenUsage, setTokenUsage] = useState<{ tokens_input: number; tokens_output: number }>({ tokens_input: 0, tokens_output: 0 });

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const internId = pathParts[pathParts.length - 1];
    if (!internId) { setError('Invalid link.'); setLoading(false); return; }
    load(internId);
  }, []);

  async function load(internId: string) {
    const { data: app, error: err } = await supabase
      .from('applications')
      .select('id, full_name, email, status, created_at, project_interest')
      .eq('id', internId)
      .maybeSingle();

    if (err || !app) { setError('Intern profile not found.'); setLoading(false); return; }

    const [weeksRes, tasksRes, finalRes] = await Promise.all([
      supabase.from('intern_weekly_reviews').select('*').eq('application_id', internId).order('week_number'),
      supabase.from('intern_learning_log').select('*').eq('application_id', internId).order('created_at'),
      supabase.from('intern_final_review').select('*').eq('application_id', internId).maybeSingle(),
    ]);

    setIntern(app);
    setWeeks(weeksRes.data ?? []);
    setTasks(tasksRes.data ?? []);
    setFinalReview(finalRes.data ?? null);

    // Load intern_accounts (AI Senior) linked to this application
    const { data: accData } = await supabase
      .from('intern_accounts')
      .select('id, full_name, department, assigned_brand, budget_tokens_monthly, model')
      .eq('email', app.email)
      .maybeSingle();

    if (accData) {
      setInternAccount(accData);
      await loadTokenUsage(accData.id);
    }

    setLoading(false);
  }

  async function loadTokenUsage(internAccountId: string) {
    const month = new Date().toISOString().slice(0, 7);
    const { data } = await supabase
      .from('intern_token_usage')
      .select('tokens_input, tokens_output')
      .eq('intern_id', internAccountId)
      .eq('month', month)
      .maybeSingle();
    setTokenUsage({ tokens_input: data?.tokens_input ?? 0, tokens_output: data?.tokens_output ?? 0 });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white text-center">
          <div className="animate-spin text-4xl mb-4">⟳</div>
          <p className="text-gray-400">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (error || !intern) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-red-400 text-lg font-semibold">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    );
  }

  const currentStepIdx = STAGE_STEPS.indexOf(intern.status);
  const isActive = intern.status === 'active';
  const isCompleted = intern.status === 'completed';
  const nextWeekNumber = weeks.length > 0 ? Math.max(...weeks.map(w => w.week_number)) + 1 : 1;
  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {intern.full_name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold">{intern.full_name}</h1>
          <p className="text-gray-400 text-sm mt-1">{intern.email}</p>
          {intern.project_interest && (
            <p className="text-primary-400 text-xs mt-1">
              {Array.isArray(intern.project_interest)
                ? intern.project_interest.join(' · ')
                : intern.project_interest}
            </p>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-white/10 pb-0">
          <button
            onClick={() => setActiveTab('portal')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
              activeTab === 'portal'
                ? 'text-white border-primary-500'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            📋 Mein Portal
          </button>
          {internAccount && (
            <button
              onClick={() => setActiveTab('ai-senior')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2 ${
                activeTab === 'ai-senior'
                  ? 'text-white border-primary-500'
                  : 'text-gray-400 border-transparent hover:text-gray-300'
              }`}
            >
              💬 AI Senior
            </button>
          )}
        </div>

        {/* AI Senior Tab */}
        {activeTab === 'ai-senior' && internAccount && (
          <InternChat
            intern={internAccount}
            usage={tokenUsage}
            onUsageUpdate={() => loadTokenUsage(internAccount.id)}
          />
        )}

        {/* Portal Tab content wrapper */}
        {activeTab === 'portal' && (<>

        {/* Journey Timeline */}
        <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Your Journey</h2>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-700 z-0" />
            <div
              className="absolute top-4 left-0 h-0.5 bg-primary-500 z-0 transition-all duration-700"
              style={{ width: `${Math.min(100, (currentStepIdx / (STAGE_STEPS.length - 1)) * 100)}%` }}
            />
            {STAGE_STEPS.map((step, i) => {
              const done = i <= currentStepIdx;
              const current = i === currentStepIdx;
              return (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    done
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-500'
                  } ${current ? 'ring-4 ring-primary-500/30' : ''}`}>
                    {done ? (current ? '●' : '✓') : ''}
                  </div>
                  <p className={`text-[9px] mt-1.5 font-medium ${done ? 'text-primary-400' : 'text-slate-600'}`}>
                    {STAGE_LABELS[step]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Row */}
        {(isActive || isCompleted) && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Check-ins', value: weeks.length, emoji: '📋' },
              { label: 'Tasks done', value: `${completedTasks}/${tasks.length}`, emoji: '✅' },
              { label: 'Avg mood', value: weeks.length > 0 ? MOOD_EMOJI[Math.round(weeks.reduce((s, w) => s + (w.mood_score ?? 3), 0) / weeks.length)] : '—', emoji: '' },
            ].map(({ label, value, emoji }) => (
              <div key={label} className="bg-slate-800/60 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{emoji} {value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Weekly Check-in CTA */}
        {isActive && (
          <div>
            {!showCheckInForm ? (
              <button
                onClick={() => setShowCheckInForm(true)}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                Submit Week {nextWeekNumber} Check-in →
              </button>
            ) : (
              <InternWeeklyForm
                applicationId={intern.id}
                weekNumber={nextWeekNumber}
                onSaved={() => {
                  setShowCheckInForm(false);
                  load(intern.id);
                }}
              />
            )}
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Tasks</h2>
            <div className="space-y-2">
              {tasks.map(t => (
                <button
                  key={t.id}
                  onClick={async () => {
                    if (t.completed) return;
                    await supabase
                      .from('intern_learning_log')
                      .update({ completed: true })
                      .eq('id', t.id);
                    // Insert notification for admin
                    await supabase.from('notifications').insert({
                      type: 'task_completed',
                      title: `${intern.full_name} completed a task`,
                      body: t.title,
                      metadata: { application_id: intern.id, task_id: t.id, intern_name: intern.full_name },
                    });
                    load(intern.id);
                  }}
                  disabled={t.completed}
                  className={`w-full flex items-start gap-3 text-sm text-left rounded-lg px-3 py-2 transition-colors ${
                    t.completed
                      ? 'opacity-50 cursor-default'
                      : 'hover:bg-white/5 cursor-pointer active:bg-white/10'
                  }`}
                >
                  <span className="mt-0.5 text-base shrink-0">{t.completed ? '✅' : '⬜'}</span>
                  <span className={t.completed ? 'line-through text-gray-400' : 'text-white'}>{t.title}</span>
                  {!t.completed && (
                    <span className="ml-auto text-[10px] text-gray-500 shrink-0 self-center">tap to complete</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weekly Reviews History */}
        {weeks.length > 0 && (
          <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Check-in History</h2>
            <div className="space-y-3">
              {[...weeks].reverse().map(w => (
                <div key={w.id} className="border border-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">Week {w.week_number}</span>
                    {w.mood_score && <span className="text-xl">{MOOD_EMOJI[w.mood_score]}</span>}
                  </div>
                  {w.highlight && <p className="text-xs text-gray-300">✨ {w.highlight}</p>}
                  {w.challenge && <p className="text-xs text-gray-400 mt-1">⚡ {w.challenge}</p>}
                  {w.learning && <p className="text-xs text-gray-400 mt-1">📚 {w.learning}</p>}
                  {w.admin_feedback && (
                    <div className="mt-2 bg-primary-900/40 rounded p-2 border border-primary-500/20">
                      <p className="text-xs text-primary-300 font-semibold mb-0.5">Feedback from Take A Shot</p>
                      <p className="text-xs text-gray-300">{w.admin_feedback}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Review (for intern to see) */}
        {isCompleted && finalReview && (
          <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-3">🎓 Internship Complete</h2>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className={`text-lg ${n <= (finalReview.overall_rating ?? 0) ? 'text-yellow-400' : 'text-slate-600'}`}>★</span>
                ))}
              </div>
              {finalReview.recommend_for_hire && (
                <span className="bg-green-500/20 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-500/30">
                  ✓ Hire Recommended
                </span>
              )}
            </div>
            {finalReview.key_contributions && (
              <p className="text-sm text-gray-300">{finalReview.key_contributions}</p>
            )}
            {finalReview.ai_summary && (
              <div className="mt-3 bg-white/5 rounded-lg p-3">
                <p className="text-xs text-purple-300 font-semibold mb-1">AI Summary</p>
                <p className="text-xs text-gray-300">{finalReview.ai_summary}</p>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-xs text-gray-600 pb-6">
          Founders Associate Academy · Hart Limes GmbH
        </p>
        </>)}
      </div>
    </div>
  );
};

export default InternPortalPage;
