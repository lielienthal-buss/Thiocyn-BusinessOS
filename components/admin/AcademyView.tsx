import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type {
  WeeklyReview, LearningLogEntry, FinalReview,
  InternAccount, InternGoal, InternMilestone, InternAssignment,
  AcademyPhase, AcademyLevel, AssignmentStatus, MilestoneKey,
} from '@/types';
import AddInternModal from './AddInternModal';

// ─── Constants ────────────────────────────────────────────────────────────
const PHASE_ORDER: AcademyPhase[] = ['onboarding', 'foundation', 'specialisation', 'ownership', 'completed'];

const PHASE_INFO: Record<AcademyPhase, { label: string; color: string; chip: string }> = {
  onboarding:     { label: 'Onboarding',     color: 'sky',     chip: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  foundation:     { label: 'Foundation',     color: 'cyan',    chip: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  specialisation: { label: 'Specialisation', color: 'violet',  chip: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  ownership:      { label: 'Ownership',      color: 'amber',   chip: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  completed:      { label: 'Completed',      color: 'emerald', chip: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const PHASE_TO_LEVEL: Record<AcademyPhase, AcademyLevel> = {
  onboarding: 1, foundation: 2, specialisation: 3, ownership: 5, completed: 5,
};

const PHASE_TO_MILESTONE: Record<AcademyPhase, MilestoneKey | null> = {
  onboarding: 'rookie',
  foundation: 'explorer',
  specialisation: 'contributor',
  ownership: 'owner',
  completed: 'graduated',
};

const LEVEL_INFO: Record<AcademyLevel, { name: string; emoji: string }> = {
  1: { name: 'Rookie',      emoji: '🌱' },
  2: { name: 'Explorer',    emoji: '🧭' },
  3: { name: 'Contributor', emoji: '⚡' },
  4: { name: 'Builder',     emoji: '🛠️' },
  5: { name: 'Owner',       emoji: '👑' },
};

const MOOD_EMOJI: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

const DEPARTMENT_LABELS: Record<string, string> = {
  marketing: 'Marketing', ecommerce: 'E-Commerce', support: 'Support',
  analytics: 'Analytics', finance: 'Finance', recruiting: 'Recruiting', lead: 'Lead',
};

const ASSIGNMENT_STATUS_COLORS: Record<AssignmentStatus, string> = {
  pending:     'bg-slate-500/15 text-slate-400 border-slate-500/30',
  in_progress: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  submitted:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  approved:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected:    'bg-red-500/15 text-red-400 border-red-500/30',
};

interface InternWithData extends InternAccount {
  weeks: WeeklyReview[];
  tasks: LearningLogEntry[];
  finalReview: FinalReview | null;
  goals: InternGoal[];
  milestones: InternMilestone[];
  assignments: InternAssignment[];
  usage?: { tokens_input: number; tokens_output: number; cost_usd: number };
}

// ─── Helper: advance phase ────────────────────────────────────────────────
async function advanceInternPhase(intern: InternWithData) {
  const currentIdx = PHASE_ORDER.indexOf(intern.phase);
  if (currentIdx === -1 || currentIdx >= PHASE_ORDER.length - 1) return;
  const nextPhase = PHASE_ORDER[currentIdx + 1];
  const nextLevel = PHASE_TO_LEVEL[nextPhase];
  const nextMilestone = PHASE_TO_MILESTONE[nextPhase];

  // Update phase + level
  await supabase.from('intern_accounts').update({
    phase: nextPhase,
    level: nextLevel,
    is_active: nextPhase !== 'completed' ? true : false,
  }).eq('id', intern.id);

  // Grant milestone (idempotent via UNIQUE constraint)
  if (nextMilestone) {
    await supabase.from('intern_milestones').insert({
      intern_id: intern.id,
      milestone_key: nextMilestone,
    }).select();
  }

  // Auto-create assignments for new phase (if not already exists)
  if (nextPhase !== 'completed') {
    const { data: templates } = await supabase
      .from('assignment_templates')
      .select('*')
      .eq('phase', nextPhase)
      .order('sort_order');

    if (templates && templates.length > 0) {
      const existingKeys = intern.assignments.filter(a => a.phase === nextPhase).map(a => a.template_key);
      const toCreate = templates.filter(t => !existingKeys.includes(t.key));
      if (toCreate.length > 0) {
        await supabase.from('intern_assignments').insert(
          toCreate.map(t => ({
            intern_id: intern.id,
            template_id: t.id,
            template_key: t.key,
            phase: t.phase,
            title: t.title,
            description: t.description,
            deliverable_format: t.deliverable_format,
            status: 'pending',
          }))
        );
      }
    }
  }
}

// ─── Phase Status Card ────────────────────────────────────────────────────
const PhaseStatusCard: React.FC<{ intern: InternWithData; onRefresh: () => void }> = ({ intern, onRefresh }) => {
  const [advancing, setAdvancing] = useState(false);
  const phaseInfo = PHASE_INFO[intern.phase];
  const levelInfo = LEVEL_INFO[intern.level];
  const phaseAssignments = intern.assignments.filter(a => a.phase === intern.phase);
  const phaseDone = phaseAssignments.filter(a => a.status === 'submitted' || a.status === 'approved').length;
  const isLast = intern.phase === 'completed';

  async function advance() {
    if (!window.confirm(`Move ${intern.full_name} to next phase? This will create new assignments and unlock the next milestone.`)) return;
    setAdvancing(true);
    await advanceInternPhase(intern);
    setAdvancing(false);
    onRefresh();
  }

  return (
    <div className="bg-surface-900/60 rounded-lg p-4 border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${phaseInfo.chip}`}>
            {phaseInfo.label}
          </span>
          <span className="text-xs text-slate-300">
            {levelInfo.emoji} L{intern.level} · {levelInfo.name}
          </span>
        </div>
        {!isLast && (
          <button
            onClick={advance}
            disabled={advancing}
            className="text-xs bg-primary-600 hover:bg-primary-700 text-white font-semibold px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            {advancing ? 'Advancing…' : `Advance →`}
          </button>
        )}
      </div>
      <div className="text-xs text-slate-500">
        {phaseAssignments.length > 0
          ? `${phaseDone}/${phaseAssignments.length} phase assignments done`
          : 'No phase assignments yet'}
      </div>
    </div>
  );
};

// ─── Goals Display ────────────────────────────────────────────────────────
const GoalsDisplay: React.FC<{ goals: InternGoal[] }> = ({ goals }) => {
  if (goals.length === 0) {
    return <p className="text-xs text-slate-500 italic">Goals not set yet (intern sets in Week 1).</p>;
  }
  return (
    <div className="space-y-2">
      {goals.map((g, i) => (
        <div key={g.id} className="text-xs flex gap-2 bg-surface-900/60 rounded p-2 border border-white/[0.06]">
          <span className="text-primary-400 font-bold">{i + 1}.</span>
          <div className="flex-1">
            <p className="text-slate-200">{g.goal_text}</p>
            {g.category && <span className="text-[9px] text-slate-500 uppercase">{g.category}</span>}
          </div>
          {g.status === 'achieved' && <span className="text-emerald-400">✓</span>}
        </div>
      ))}
    </div>
  );
};

// ─── Assignment Review Card (admin) ───────────────────────────────────────
const AssignmentReviewCard: React.FC<{
  assignment: InternAssignment;
  onRefresh: () => void;
}> = ({ assignment, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState(assignment.review_score ?? 3);
  const [feedback, setFeedback] = useState(assignment.review_feedback ?? '');
  const [saving, setSaving] = useState(false);
  const isSubmitted = assignment.status === 'submitted';
  const isReviewed = assignment.status === 'approved' || assignment.status === 'rejected';

  async function review(approved: boolean) {
    setSaving(true);
    await supabase.from('intern_assignments').update({
      status: approved ? 'approved' : 'rejected',
      review_score: score,
      review_feedback: feedback || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', assignment.id);
    setSaving(false);
    setExpanded(false);
    onRefresh();
  }

  return (
    <div className="bg-surface-900/60 rounded-lg border border-white/[0.06] overflow-hidden">
      <button onClick={() => setExpanded(p => !p)} className="w-full p-3 text-left flex items-start gap-2 hover:bg-white/[0.03]">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-200">{assignment.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${ASSIGNMENT_STATUS_COLORS[assignment.status]}`}>
              {assignment.status.replace('_', ' ')}
            </span>
            {assignment.review_score && (
              <span className="text-[9px] text-amber-400">★ {assignment.review_score}/5</span>
            )}
          </div>
        </div>
        <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/5 pt-3 space-y-2">
          {assignment.description && (
            <p className="text-[11px] text-slate-400">{assignment.description}</p>
          )}

          {assignment.submission_text && (
            <div className="bg-slate-900/60 rounded p-2 border border-white/5">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Submission</p>
              <p className="text-[11px] text-slate-200 whitespace-pre-wrap">{assignment.submission_text}</p>
            </div>
          )}
          {assignment.submission_url && (
            <a href={assignment.submission_url} target="_blank" rel="noopener noreferrer"
               className="text-[11px] text-primary-400 hover:underline block">
              {assignment.submission_url} ↗
            </a>
          )}

          {(isSubmitted || isReviewed) && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase mb-1">Score</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setScore(n)}
                      className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                        score === n ? 'bg-amber-500 text-white' : 'bg-white/[0.05] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Reviewer feedback (optional)"
                className="w-full text-[11px] bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => review(true)}
                  disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded disabled:opacity-50"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => review(false)}
                  disabled={saving}
                  className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded disabled:opacity-50"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Admin Notes Editor ───────────────────────────────────────────────────
const AdminNotesEditor: React.FC<{ intern: InternWithData; onRefresh: () => void }> = ({ intern, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(intern.admin_notes ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase.from('intern_accounts').update({ admin_notes: notes || null }).eq('id', intern.id);
    setSaving(false);
    setEditing(false);
    onRefresh();
  }

  if (!editing && !intern.admin_notes) {
    return (
      <button onClick={() => setEditing(true)} className="text-xs text-primary-500 hover:underline">
        + Add admin notes
      </button>
    );
  }

  if (!editing && intern.admin_notes) {
    return (
      <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[10px] font-bold text-amber-400 uppercase">Admin Notes</p>
          <button onClick={() => setEditing(true)} className="text-[10px] text-primary-500 hover:underline">edit</button>
        </div>
        <p className="text-slate-300 whitespace-pre-wrap">{intern.admin_notes}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Internal notes about this intern (exceptions, context, etc.)"
        className="w-full text-xs bg-white/[0.04] border border-white/10 rounded px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
      />
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="text-xs bg-primary-600 hover:bg-primary-700 text-white font-semibold px-3 py-1.5 rounded">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => { setNotes(intern.admin_notes ?? ''); setEditing(false); }} className="text-xs text-slate-500 hover:text-slate-300">
          Cancel
        </button>
      </div>
    </div>
  );
};

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
    await supabase.from('intern_accounts').update({ phase: 'completed', is_active: false }).eq('id', internId);
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

  const phaseInfo = PHASE_INFO[intern.phase];
  const levelInfo = LEVEL_INFO[intern.level];
  const completedTasks = intern.tasks.filter(t => t.completed).length;
  const nextWeek = (intern.weeks.length > 0 ? Math.max(...intern.weeks.map(w => w.week_number)) + 1 : 1);
  const inviteAccepted = intern.auth_user_id != null;
  const phaseAssignments = intern.assignments.filter(a => a.phase === intern.phase);
  const submittedAssignments = intern.assignments.filter(a => a.status === 'submitted');
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
            {inviteAccepted ? 'Active' : 'Pending'}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${phaseInfo.chip}`}>
            {phaseInfo.label}
          </span>
          <span className="text-xs text-slate-500">
            {levelInfo.emoji} L{intern.level}
          </span>
          {submittedAssignments.length > 0 && (
            <span className="text-xs bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
              {submittedAssignments.length} to review
            </span>
          )}
          <span className="text-slate-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.06] px-4 pb-4 space-y-4">
          {/* Phase Status */}
          <div className="mt-4">
            <PhaseStatusCard intern={intern} onRefresh={onRefresh} />
          </div>

          {/* Admin Notes */}
          <div>
            <AdminNotesEditor intern={intern} onRefresh={onRefresh} />
          </div>

          {/* Personal Goals */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-2">🎯 Personal Goals</p>
            <GoalsDisplay goals={intern.goals} />
          </div>

          {/* Phase Assignments — Review */}
          {phaseAssignments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-300 mb-2">
                📝 {phaseInfo.label} Assignments ({phaseAssignments.filter(a => a.status === 'submitted' || a.status === 'approved').length}/{phaseAssignments.length})
              </p>
              <div className="space-y-1.5">
                {phaseAssignments.map(a => (
                  <AssignmentReviewCard key={a.id} assignment={a} onRefresh={onRefresh} />
                ))}
              </div>
            </div>
          )}

          {/* Weekly Reviews */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-300">Weekly Check-ins</p>
              {intern.is_active && (
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

          {/* Final Review */}
          {(intern.phase === 'ownership' || intern.phase === 'completed') && (
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

          {/* Deactivate */}
          {intern.is_active && (
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                onClick={async () => {
                  if (!window.confirm(`Deactivate ${intern.full_name}? This marks the intern as inactive but does not delete data.`)) return;
                  await supabase.from('intern_accounts').update({ is_active: false }).eq('id', intern.id);
                  onRefresh();
                }}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Deactivate intern
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
  const [filter, setFilter] = useState<'all' | AcademyPhase>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);

  async function load() {
    setLoading(true);

    const { data: accounts } = await supabase
      .from('intern_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!accounts || accounts.length === 0) {
      setInterns([]);
      setLoading(false);
      return;
    }

    const ids = accounts.map((a: any) => a.id);
    const month = new Date().toISOString().slice(0, 7);

    const [weeksRes, tasksRes, finalRes, usageRes, goalsRes, milestonesRes, assignmentsRes] = await Promise.all([
      supabase.from('intern_weekly_reviews').select('*').in('intern_id', ids).order('week_number'),
      supabase.from('intern_learning_log').select('*').in('intern_id', ids).order('created_at'),
      supabase.from('intern_final_review').select('*').in('intern_id', ids),
      supabase.from('intern_token_usage').select('intern_id, tokens_input, tokens_output, cost_usd').in('intern_id', ids).eq('month', month),
      supabase.from('intern_goals').select('*').in('intern_id', ids).order('created_at'),
      supabase.from('intern_milestones').select('*').in('intern_id', ids).order('unlocked_at'),
      supabase.from('intern_assignments').select('*').in('intern_id', ids).order('created_at'),
    ]);

    const weeks = weeksRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const finals = finalRes.data ?? [];
    const goals = goalsRes.data ?? [];
    const milestones = milestonesRes.data ?? [];
    const assignments = assignmentsRes.data ?? [];

    const usageMap: Record<string, { tokens_input: number; tokens_output: number; cost_usd: number }> = {};
    (usageRes.data ?? []).forEach((u: any) => {
      usageMap[u.intern_id] = { tokens_input: u.tokens_input, tokens_output: u.tokens_output, cost_usd: u.cost_usd };
    });

    setInterns(accounts.map((a: any) => ({
      ...a,
      weeks: weeks.filter((w: any) => w.intern_id === a.id),
      tasks: tasks.filter((t: any) => t.intern_id === a.id),
      finalReview: finals.find((f: any) => f.intern_id === a.id) ?? null,
      goals: goals.filter((g: any) => g.intern_id === a.id),
      milestones: milestones.filter((m: any) => m.intern_id === a.id),
      assignments: assignments.filter((as: any) => as.intern_id === a.id),
      usage: usageMap[a.id],
    })));

    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const displayed = filter === 'all' ? interns : interns.filter(i => i.phase === filter);

  const counts: Record<'all' | AcademyPhase, number> = {
    all: interns.length,
    onboarding: interns.filter(i => i.phase === 'onboarding').length,
    foundation: interns.filter(i => i.phase === 'foundation').length,
    specialisation: interns.filter(i => i.phase === 'specialisation').length,
    ownership: interns.filter(i => i.phase === 'ownership').length,
    completed: interns.filter(i => i.phase === 'completed').length,
  };

  const pendingInvites = interns.filter(i => i.auth_user_id === null);
  const totalSubmissionsToReview = interns.reduce(
    (sum, i) => sum + i.assignments.filter(a => a.status === 'submitted').length,
    0
  );

  function copyAllPendingEmails() {
    const emails = pendingInvites.map(i => i.email).join(', ');
    navigator.clipboard.writeText(emails);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Hartlimes Intern Academy</h2>
          <p className="text-sm text-slate-500 mt-1">House of Sustainable Brands · 4-phase program</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          ＋ Add Intern
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
                    await supabase.functions.invoke('send-intern-invite', { body: { intern_id: i.id } });
                  }
                  setSendingBatch(false);
                  alert(`${pendingInvites.length} Einladungen verschickt! 🚀`);
                }}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                {sendingBatch ? 'Sende…' : '🚀 Send all invites'}
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

      {/* Submissions to review banner */}
      {totalSubmissionsToReview > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-400">
            📝 {totalSubmissionsToReview} assignment{totalSubmissionsToReview === 1 ? '' : 's'} waiting for review
          </p>
          <p className="text-xs text-blue-500/80 mt-0.5">
            Expand the relevant intern card and approve/reject submissions.
          </p>
        </div>
      )}

      {/* Phase counts */}
      <div className="grid grid-cols-5 gap-3">
        {(['onboarding', 'foundation', 'specialisation', 'ownership', 'completed'] as AcademyPhase[]).map(phase => {
          const info = PHASE_INFO[phase];
          return (
            <div key={phase} className={`rounded-xl p-3 text-center border ${info.chip}`}>
              <p className="text-2xl font-bold">{counts[phase]}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1">{info.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
            filter === 'all'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-white/[0.05] text-slate-500 hover:text-slate-300 border border-white/[0.06]'
          }`}
        >
          All ({counts.all})
        </button>
        {(['onboarding', 'foundation', 'specialisation', 'ownership', 'completed'] as AcademyPhase[]).map(phase => (
          <button
            key={phase}
            onClick={() => setFilter(phase)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              filter === phase
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'bg-white/[0.05] text-slate-500 hover:text-slate-300 border border-white/[0.06]'
            }`}
          >
            {PHASE_INFO[phase].label} ({counts[phase]})
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
                  {['Intern', 'Phase / Level', 'Department', 'Invite', 'Tokens', 'Kosten', 'Budget'].map(h => (
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
                  const phaseInfo = PHASE_INFO[acc.phase];
                  return (
                    <tr key={acc.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{acc.full_name}</p>
                        <p className="text-xs text-slate-500">{acc.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${phaseInfo.chip} w-fit`}>
                            {phaseInfo.label}
                          </span>
                          <span className="text-[10px] text-slate-500">L{acc.level} {LEVEL_INFO[acc.level].name}</span>
                        </div>
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
                          {acc.auth_user_id != null ? 'Active' : 'Pending'}
                        </span>
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
          <p className="font-medium">No interns in this phase.</p>
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
