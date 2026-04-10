import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type {
  InternAccount, InternGoal, InternMilestone, InternAssignment,
  WeeklyReview, LearningLogEntry, FinalReview,
  AcademyPhase, AcademyLevel, MilestoneKey, AssignmentStatus,
} from '@/types';
import InternChat from '@/components/academy/InternChat';

// ─── Constants ────────────────────────────────────────────────────────────
// Static Tailwind class strings (cannot be dynamic — purger needs literal classes)
const PHASE_INFO: Record<AcademyPhase, {
  label: string; sub: string; icon: string; order: number;
  border: string; gradient: string; text: string; chip: string; bar: string;
}> = {
  onboarding: {
    label: 'Onboarding', sub: 'Week 1', icon: '🌱', order: 0,
    border: 'border-sky-500/30',
    gradient: 'from-sky-900/40 via-slate-900 to-slate-900',
    text: 'text-sky-400', chip: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    bar: 'bg-sky-500',
  },
  foundation: {
    label: 'Foundation', sub: 'Weeks 2–4', icon: '🎯', order: 1,
    border: 'border-cyan-500/30',
    gradient: 'from-cyan-900/40 via-slate-900 to-slate-900',
    text: 'text-cyan-400', chip: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
    bar: 'bg-cyan-500',
  },
  specialisation: {
    label: 'Specialisation', sub: 'Month 2', icon: '🚀', order: 2,
    border: 'border-violet-500/30',
    gradient: 'from-violet-900/40 via-slate-900 to-slate-900',
    text: 'text-violet-400', chip: 'bg-violet-500/15 border-violet-500/30 text-violet-300',
    bar: 'bg-violet-500',
  },
  ownership: {
    label: 'Ownership', sub: 'Month 3', icon: '👑', order: 3,
    border: 'border-amber-500/30',
    gradient: 'from-amber-900/40 via-slate-900 to-slate-900',
    text: 'text-amber-400', chip: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    bar: 'bg-amber-500',
  },
  completed: {
    label: 'Completed', sub: 'Done', icon: '🎓', order: 4,
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-900/40 via-slate-900 to-slate-900',
    text: 'text-emerald-400', chip: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
    bar: 'bg-emerald-500',
  },
};

const LEVEL_INFO: Record<AcademyLevel, { name: string; emoji: string }> = {
  1: { name: 'Rookie',      emoji: '🌱' },
  2: { name: 'Explorer',    emoji: '🧭' },
  3: { name: 'Contributor', emoji: '⚡' },
  4: { name: 'Builder',     emoji: '🛠️' },
  5: { name: 'Owner',       emoji: '👑' },
};

const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  rookie: 'Rookie',
  explorer: 'Explorer',
  contributor: 'Contributor',
  builder: 'Builder',
  owner: 'Owner',
  graduated: 'Graduated',
};

const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

const GOAL_CATEGORIES = [
  { key: 'skill',     label: 'Skill development', hint: 'A capability you want to build' },
  { key: 'portfolio', label: 'Portfolio piece',   hint: 'Something to show on your CV' },
  { key: 'career',    label: 'Career ambition',   hint: 'A long-term direction this supports' },
];

// ─── Goals Wizard (Week 1 setup) ──────────────────────────────────────────
const GoalsWizard: React.FC<{
  internId: string;
  onSaved: () => void;
  onClose: () => void;
}> = ({ internId, onSaved, onClose }) => {
  const [goals, setGoals] = useState([
    { goal_text: '', category: 'skill' },
    { goal_text: '', category: 'portfolio' },
    { goal_text: '', category: 'career' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allFilled = goals.every(g => g.goal_text.trim().length >= 10);

  async function save() {
    if (!allFilled) {
      setError('Each goal needs at least 10 characters.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: insertErr } = await supabase.from('intern_goals').insert(
      goals.map(g => ({
        intern_id: internId,
        goal_text: g.goal_text.trim(),
        category: g.category,
        status: 'active',
      }))
    );
    setSaving(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-primary-400 font-semibold uppercase tracking-wider">Week 1 · Personal Goals</p>
              <h2 className="text-xl font-bold text-white mt-1">Set your 3 goals</h2>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-2xl leading-none">×</button>
          </div>
          <p className="text-sm text-slate-400 mt-3">
            These goals stay visible throughout your internship. They define what success looks like for you personally.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {goals.map((g, i) => {
            const meta = GOAL_CATEGORIES[i];
            return (
              <div key={i}>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="text-sm font-semibold text-white">
                    {i + 1}. {meta.label}
                  </label>
                  <span className="text-xs text-slate-500">{meta.hint}</span>
                </div>
                <textarea
                  rows={2}
                  value={g.goal_text}
                  onChange={e => {
                    const next = [...goals];
                    next[i] = { ...next[i], goal_text: e.target.value };
                    setGoals(next);
                  }}
                  placeholder={
                    i === 0 ? 'e.g. Get fluent with Meta Ads Manager and run my first campaign end-to-end'
                    : i === 1 ? 'e.g. Build and document one automation that saves >2h/week'
                    : 'e.g. Move toward a Growth Marketing role at a Series A startup'
                  }
                  className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40 placeholder-slate-600"
                />
              </div>
            );
          })}

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              {error}
            </div>
          )}

          <button
            onClick={save}
            disabled={!allFilled || saving}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save my goals →'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Phase Banner ─────────────────────────────────────────────────────────
const PhaseBanner: React.FC<{
  phase: AcademyPhase;
  level: AcademyLevel;
  startDate: string | null;
  assignmentsTotal: number;
  assignmentsDone: number;
}> = ({ phase, level, startDate, assignmentsTotal, assignmentsDone }) => {
  const phaseInfo = PHASE_INFO[phase];
  const levelInfo = LEVEL_INFO[level];
  const progress = assignmentsTotal > 0 ? Math.round((assignmentsDone / assignmentsTotal) * 100) : 0;
  const daysIn = startDate ? Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 1;

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${phaseInfo.border} bg-gradient-to-br ${phaseInfo.gradient} p-6`}>
      <div className="absolute top-0 right-0 text-7xl opacity-10 select-none">{phaseInfo.icon}</div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${phaseInfo.text}`}>
            Phase
          </span>
          <span className="text-[10px] text-slate-500">·</span>
          <span className="text-[10px] text-slate-500">{phaseInfo.sub}</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">{phaseInfo.label}</h2>

        <div className="flex items-center gap-3 mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${phaseInfo.chip}`}>
            <span className="text-base">{levelInfo.emoji}</span>
            <span className="text-xs font-bold">L{level} · {levelInfo.name}</span>
          </div>
          <div className="text-xs text-slate-500">
            Day {daysIn} in program
          </div>
        </div>

        {assignmentsTotal > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">Phase progress</span>
              <span className="text-white font-semibold">{assignmentsDone}/{assignmentsTotal} · {progress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${phaseInfo.bar} rounded-full transition-all duration-700`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Assignment Card ──────────────────────────────────────────────────────
const AssignmentCard: React.FC<{
  assignment: InternAssignment;
  onUpdate: () => void;
}> = ({ assignment, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [submission, setSubmission] = useState(assignment.submission_text || '');
  const [submissionUrl, setSubmissionUrl] = useState(assignment.submission_url || '');
  const [submitting, setSubmitting] = useState(false);

  const isCheckbox = assignment.deliverable_format === 'checkbox';
  const isText = assignment.deliverable_format === 'text';
  const isUrl = assignment.deliverable_format === 'url';
  const isDocument = assignment.deliverable_format === 'document';
  const isPresentation = assignment.deliverable_format === 'presentation';

  const isDone = assignment.status === 'submitted' || assignment.status === 'approved';

  const statusColors: Record<AssignmentStatus, string> = {
    pending:     'bg-slate-500/15 text-slate-400 border-slate-500/30',
    in_progress: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    submitted:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    approved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    rejected:    'bg-red-500/15 text-red-400 border-red-500/30',
  };

  async function submitAssignment(directComplete = false) {
    setSubmitting(true);
    const update: any = {
      status: directComplete ? 'submitted' : 'submitted',
      submitted_at: new Date().toISOString(),
    };
    if (submission.trim()) update.submission_text = submission.trim();
    if (submissionUrl.trim()) update.submission_url = submissionUrl.trim();

    await supabase.from('intern_assignments').update(update).eq('id', assignment.id);
    setSubmitting(false);
    setExpanded(false);
    onUpdate();
  }

  async function markCheckboxDone() {
    setSubmitting(true);
    await supabase.from('intern_assignments').update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).eq('id', assignment.id);
    setSubmitting(false);
    onUpdate();
  }

  return (
    <div className={`rounded-xl border ${isDone ? 'border-emerald-500/20 bg-emerald-900/10' : 'border-white/10 bg-slate-800/40'} overflow-hidden`}>
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
      >
        <div className="mt-0.5 flex-shrink-0">
          {isDone ? (
            <span className="text-lg">✅</span>
          ) : (
            <span className="text-lg">⬜</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
            {assignment.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColors[assignment.status]}`}>
              {assignment.status.replace('_', ' ')}
            </span>
            {assignment.deliverable_format && assignment.deliverable_format !== 'none' && (
              <span className="text-[10px] text-slate-500 uppercase">{assignment.deliverable_format}</span>
            )}
          </div>
        </div>
        <span className="text-slate-500 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
          {assignment.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{assignment.description}</p>
          )}

          {assignment.review_feedback && (
            <div className="bg-primary-900/30 border border-primary-500/20 rounded-lg p-3">
              <p className="text-[10px] font-bold text-primary-400 uppercase mb-1">Reviewer feedback</p>
              <p className="text-xs text-slate-200">{assignment.review_feedback}</p>
              {assignment.review_score && (
                <p className="text-xs text-primary-300 mt-2">Score: {assignment.review_score}/5</p>
              )}
            </div>
          )}

          {!isDone && (
            <>
              {isCheckbox && (
                <button
                  onClick={markCheckboxDone}
                  disabled={submitting}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Mark as done →'}
                </button>
              )}

              {(isText || isDocument || isPresentation) && (
                <>
                  <textarea
                    rows={4}
                    value={submission}
                    onChange={e => setSubmission(e.target.value)}
                    placeholder={isPresentation ? 'Notes / outline / link to slides' : 'Your submission…'}
                    className="w-full bg-slate-900/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/40 placeholder-slate-600"
                  />
                  <button
                    onClick={() => submitAssignment()}
                    disabled={submitting || submission.trim().length < 5}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? 'Submitting…' : 'Submit'}
                  </button>
                </>
              )}

              {isUrl && (
                <>
                  <input
                    type="url"
                    value={submissionUrl}
                    onChange={e => setSubmissionUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full bg-slate-900/60 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/40 placeholder-slate-600"
                  />
                  <button
                    onClick={() => submitAssignment()}
                    disabled={submitting || !submissionUrl.trim()}
                    className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    {submitting ? 'Submitting…' : 'Submit URL'}
                  </button>
                </>
              )}
            </>
          )}

          {isDone && assignment.submission_text && (
            <div className="bg-slate-900/60 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Your submission</p>
              <p className="text-xs text-slate-300 whitespace-pre-wrap">{assignment.submission_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Goals Display Card ───────────────────────────────────────────────────
const GoalsCard: React.FC<{
  goals: InternGoal[];
  onSetupGoals: () => void;
}> = ({ goals, onSetupGoals }) => {
  if (goals.length === 0) {
    return (
      <div className="bg-gradient-to-br from-amber-900/20 to-slate-900 border border-amber-500/20 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-amber-300 uppercase tracking-wider mb-2">🎯 Personal Goals</h2>
        <p className="text-sm text-slate-400 mb-4">Set the 3 goals that will guide your internship.</p>
        <button
          onClick={onSetupGoals}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          Set my goals →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">🎯 Personal Goals</h2>
      <div className="space-y-3">
        {goals.map((g, i) => (
          <div key={g.id} className="flex gap-3">
            <span className="text-primary-400 font-bold text-sm flex-shrink-0">{i + 1}.</span>
            <div className="flex-1">
              <p className="text-sm text-white">{g.goal_text}</p>
              {g.category && (
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{g.category}</span>
              )}
            </div>
            {g.status === 'achieved' && <span className="text-emerald-400 text-sm">✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Milestone Timeline ───────────────────────────────────────────────────
const MilestoneTimeline: React.FC<{ milestones: InternMilestone[] }> = ({ milestones }) => {
  const allKeys: MilestoneKey[] = ['rookie', 'explorer', 'contributor', 'builder', 'owner', 'graduated'];
  const unlockedSet = new Set(milestones.map(m => m.milestone_key));

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">🏆 Milestones</h2>
      <div className="grid grid-cols-6 gap-2">
        {allKeys.map((key) => {
          const unlocked = unlockedSet.has(key);
          const milestone = milestones.find(m => m.milestone_key === key);
          return (
            <div key={key} className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all ${
                unlocked
                  ? 'bg-primary-500/20 border-primary-500/50'
                  : 'bg-slate-900/60 border-slate-700/50 grayscale opacity-40'
              }`}>
                {key === 'rookie'      && '🌱'}
                {key === 'explorer'    && '🧭'}
                {key === 'contributor' && '⚡'}
                {key === 'builder'     && '🛠️'}
                {key === 'owner'       && '👑'}
                {key === 'graduated'   && '🎓'}
              </div>
              <p className={`text-[9px] mt-1.5 font-semibold ${unlocked ? 'text-primary-400' : 'text-slate-600'}`}>
                {MILESTONE_LABELS[key]}
              </p>
              {milestone && (
                <p className="text-[8px] text-slate-600 mt-0.5">
                  {new Date(milestone.unlocked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Buddy Card ───────────────────────────────────────────────────────────
const BuddyCard: React.FC<{ buddyUserId: string | null }> = ({ buddyUserId }) => {
  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">🤝 Your Buddy</h2>
      {buddyUserId ? (
        <div className="text-sm text-slate-300">
          <p>Buddy assigned. Reach out on Slack to schedule your weekly 1:1.</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">Not assigned yet. Your buddy will be matched in Week 1.</p>
      )}
    </div>
  );
};

// ─── Weekly Check-in Form ─────────────────────────────────────────────────
const InternWeeklyForm: React.FC<{
  internId: string;
  weekNumber: number;
  onSaved: () => void;
}> = ({ internId, weekNumber, onSaved }) => {
  const [form, setForm] = useState({
    highlight: '', challenge: '', learning: '', next_goal: '', mood_score: 3,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit() {
    setSaving(true);
    await supabase.from('intern_weekly_reviews').insert({
      intern_id: internId,
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
  const [intern, setIntern] = useState<InternAccount | null>(null);
  const [goals, setGoals] = useState<InternGoal[]>([]);
  const [milestones, setMilestones] = useState<InternMilestone[]>([]);
  const [assignments, setAssignments] = useState<InternAssignment[]>([]);
  const [weeks, setWeeks] = useState<WeeklyReview[]>([]);
  const [tasks, setTasks] = useState<LearningLogEntry[]>([]);
  const [finalReview, setFinalReview] = useState<FinalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [showGoalsWizard, setShowGoalsWizard] = useState(false);
  const [activeTab, setActiveTab] = useState<'portal' | 'ai-senior'>('portal');
  const [tokenUsage, setTokenUsage] = useState<{ tokens_input: number; tokens_output: number }>({ tokens_input: 0, tokens_output: 0 });

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const internId = pathParts[pathParts.length - 1];
    if (!internId) { setError('Invalid link.'); setLoading(false); return; }
    load(internId);
  }, []);

  async function load(internId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please log in to view this profile.');
      setLoading(false);
      return;
    }

    const { data: acc, error: accErr } = await supabase
      .from('intern_accounts')
      .select('*')
      .eq('id', internId)
      .maybeSingle();

    if (accErr || !acc) {
      setError('Intern profile not found.');
      setLoading(false);
      return;
    }

    const [goalsRes, milestonesRes, assignmentsRes, weeksRes, tasksRes, finalRes] = await Promise.all([
      supabase.from('intern_goals').select('*').eq('intern_id', internId).order('created_at'),
      supabase.from('intern_milestones').select('*').eq('intern_id', internId).order('unlocked_at'),
      supabase.from('intern_assignments').select('*').eq('intern_id', internId).order('created_at'),
      supabase.from('intern_weekly_reviews').select('*').eq('intern_id', internId).order('week_number'),
      supabase.from('intern_learning_log').select('*').eq('intern_id', internId).order('created_at'),
      supabase.from('intern_final_review').select('*').eq('intern_id', internId).maybeSingle(),
    ]);

    setIntern(acc as InternAccount);
    setGoals(goalsRes.data ?? []);
    setMilestones(milestonesRes.data ?? []);
    setAssignments(assignmentsRes.data ?? []);
    setWeeks(weeksRes.data ?? []);
    setTasks(tasksRes.data ?? []);
    setFinalReview(finalRes.data ?? null);

    await loadTokenUsage(acc.id);
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
    const isAuthError = error === 'Please log in to view this profile.';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg font-semibold">{error || 'Something went wrong.'}</p>
          {isAuthError && (
            <a
              href="/admin"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    );
  }

  const isCompleted = intern.phase === 'completed';
  const phaseAssignments = assignments.filter(a => a.phase === intern.phase);
  const phaseDone = phaseAssignments.filter(a => a.status === 'submitted' || a.status === 'approved').length;
  const nextWeekNumber = weeks.length > 0 ? Math.max(...weeks.map(w => w.week_number)) + 1 : 1;

  return (
    <div className="min-h-screen bg-slate-900 text-white py-10 px-4">
      {showGoalsWizard && (
        <GoalsWizard
          internId={intern.id}
          onSaved={() => { setShowGoalsWizard(false); load(intern.id); }}
          onClose={() => setShowGoalsWizard(false)}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {intern.full_name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold">{intern.full_name}</h1>
          <p className="text-gray-400 text-sm mt-1">{intern.email}</p>
          <p className="text-primary-400 text-xs mt-1 capitalize">
            {intern.department} {intern.assigned_brand && `· ${intern.assigned_brand}`}
          </p>
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
            📋 My Portal
          </button>
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
        </div>

        {/* AI Senior Tab */}
        {activeTab === 'ai-senior' && (
          <InternChat
            intern={intern}
            usage={tokenUsage}
            onUsageUpdate={() => loadTokenUsage(intern.id)}
          />
        )}

        {/* Portal Tab */}
        {activeTab === 'portal' && (<>
          <PhaseBanner
            phase={intern.phase}
            level={intern.level}
            startDate={intern.start_date}
            assignmentsTotal={phaseAssignments.length}
            assignmentsDone={phaseDone}
          />

          <GoalsCard
            goals={goals}
            onSetupGoals={() => setShowGoalsWizard(true)}
          />

          {/* Current Phase Assignments */}
          {phaseAssignments.length > 0 && (
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  📝 {PHASE_INFO[intern.phase].label} Assignments
                </h2>
                <span className="text-xs text-slate-500">{phaseDone}/{phaseAssignments.length} done</span>
              </div>
              <div className="space-y-2">
                {phaseAssignments.map(a => (
                  <AssignmentCard key={a.id} assignment={a} onUpdate={() => load(intern.id)} />
                ))}
              </div>
            </div>
          )}

          <MilestoneTimeline milestones={milestones} />

          <BuddyCard buddyUserId={intern.buddy_user_id} />

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Check-ins', value: weeks.length, emoji: '📋' },
              { label: 'Phase progress', value: `${phaseDone}/${phaseAssignments.length}`, emoji: '✅' },
              { label: 'Avg mood', value: weeks.length > 0 ? MOOD_EMOJI[Math.round(weeks.reduce((s, w) => s + (w.mood_score ?? 3), 0) / weeks.length)] : '—', emoji: '' },
            ].map(({ label, value, emoji }) => (
              <div key={label} className="bg-slate-800/60 border border-white/10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{emoji} {value}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Weekly Check-in CTA */}
          {!isCompleted && (
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
                  internId={intern.id}
                  weekNumber={nextWeekNumber}
                  onSaved={() => {
                    setShowCheckInForm(false);
                    load(intern.id);
                  }}
                />
              )}
            </div>
          )}

          {/* Free-form Tasks (legacy learning log) */}
          {tasks.length > 0 && (
            <div className="bg-slate-800/60 border border-white/10 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">📚 Learning Log</h2>
              <div className="space-y-2">
                {tasks.map(t => (
                  <div key={t.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5">{t.completed ? '✅' : '⬜'}</span>
                    <span className={t.completed ? 'line-through text-gray-400' : 'text-white'}>{t.title}</span>
                  </div>
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
                        <p className="text-xs text-primary-300 font-semibold mb-0.5">Feedback</p>
                        <p className="text-xs text-gray-300">{w.admin_feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Review */}
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
            Hartlimes GmbH · House of Sustainable Brands
          </p>
        </>)}
      </div>
    </div>
  );
};

export default InternPortalPage;
