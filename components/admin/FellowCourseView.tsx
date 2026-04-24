import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import type {
  InternAccount,
  InternGoal,
  InternAssignment,
  InternMilestone,
  LearningLogEntry,
  AcademyPhase,
  AssignmentStatus,
  MilestoneKey,
} from '@/types';

// Tom's Intern Academy framework — bundled at build time so Fellows always
// see the latest version of the program guide inside their own surface.
import readmeDoc from '@/docs/intern-academy/README.md?raw';
import employmentDoc from '@/docs/intern-academy/thiocyn-employment-onboarding.md?raw';
import mondayDoc from '@/docs/intern-academy/monday-meeting-template.md?raw';
import tracksDoc from '@/docs/intern-academy/specialisation-tracks.md?raw';
import rubricsDoc from '@/docs/intern-academy/assessment-rubrics.md?raw';
import buddyDoc from '@/docs/intern-academy/buddy-program.md?raw';
import brandThiocyn from '@/docs/intern-academy/brand-walkthroughs/thiocyn.md?raw';
import brandDrSeverin from '@/docs/intern-academy/brand-walkthroughs/dr-severin.md?raw';
import brandTakeAShot from '@/docs/intern-academy/brand-walkthroughs/take-a-shot.md?raw';
import brandPaigh from '@/docs/intern-academy/brand-walkthroughs/paigh.md?raw';
import brandTimberJohn from '@/docs/intern-academy/brand-walkthroughs/timber-and-john.md?raw';
import brandWristr from '@/docs/intern-academy/brand-walkthroughs/wristr.md?raw';

// ─── Phase metadata (single source of truth) ─────────────────────────────
interface PhaseMeta {
  id: AcademyPhase;
  label: string;
  weeks: string;
  description: string;
  color: string;
  emoji: string;
  order: number;
}

const PHASES: PhaseMeta[] = [
  { id: 'onboarding',     label: 'Onboarding',     weeks: 'Woche 1',      description: 'Ankommen, Tools, Team, erste Goals. Du wirst gepaart mit einem Buddy am Tag 2 und setzt deine 3 persönlichen Ziele.',                                                                                            color: '#0EA5E9', emoji: '🌱', order: 0 },
  { id: 'foundation',     label: 'Foundation',     weeks: 'Wochen 2–4',   description: 'CS-Academy: 100 Tickets analysieren. Operations-Walk-Throughs. Brand-Deep-Dives. Endet mit dem Month-1-Pitch (Consultancy-Plan) in Woche 4.',                                                                  color: '#06B6D4', emoji: '🎯', order: 1 },
  { id: 'specialisation', label: 'Specialisation', weeks: 'Wochen 5–8',   description: 'Du wählst einen der 5 Tracks (Growth · Creative · Ops · AI · Finance) und ownst dein Big Target — ein konkretes Projekt mit messbarem Ergebnis. Endet mit Month-2-Pitch in Woche 8.',                          color: '#8B5CF6', emoji: '🚀', order: 2 },
  { id: 'ownership',      label: 'Ownership',      weeks: 'Wochen 9–12',  description: 'Du übernimmst Verantwortung für eine Funktion. KPIs definieren, Entscheidungen treffen, Ergebnisse messen. Endet mit der Graduation-Präsentation in Woche 12.',                                                color: '#F59E0B', emoji: '👑', order: 3 },
  { id: 'completed',      label: 'Completed',      weeks: 'Abschluss',    description: 'Fellowship erfolgreich abgeschlossen. Programme certificate, ggf. Reference Letter, ggf. weiterführende Rolle.',                                                                                              color: '#10B981', emoji: '🎓', order: 4 },
];

const LEVEL_NAMES: Record<number, { name: string; emoji: string }> = {
  1: { name: 'Rookie',      emoji: '🌱' },
  2: { name: 'Explorer',    emoji: '🧭' },
  3: { name: 'Contributor', emoji: '⚡' },
  4: { name: 'Builder',     emoji: '🛠️' },
  5: { name: 'Owner',       emoji: '👑' },
};

const MILESTONE_LABEL: Record<MilestoneKey, string> = {
  rookie: 'Rookie',
  explorer: 'Explorer',
  contributor: 'Contributor',
  builder: 'Builder',
  owner: 'Owner',
  graduated: 'Graduated',
};

// ─── Component ────────────────────────────────────────────────────────────
interface FellowCourseViewProps {
  /** If provided, loads this intern (admin mode). Otherwise loads current user's intern row. */
  internId?: string;
  /** When true, shows admin-only eval controls (phase promote, notes). */
  showEvalLayer?: boolean;
}

const FellowCourseView: React.FC<FellowCourseViewProps> = ({ internId, showEvalLayer = false }) => {
  const [intern, setIntern] = useState<InternAccount | null>(null);
  const [goals, setGoals] = useState<InternGoal[]>([]);
  const [assignments, setAssignments] = useState<InternAssignment[]>([]);
  const [milestones, setMilestones] = useState<InternMilestone[]>([]);
  const [logEntries, setLogEntries] = useState<LearningLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'journey' | 'tasks' | 'goals' | 'log' | 'program'>('journey');
  const [newLogContent, setNewLogContent] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  // Load everything
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let internRow: InternAccount | null = null;

      if (internId) {
        const { data } = await supabase.from('intern_accounts').select('*').eq('id', internId).maybeSingle();
        internRow = data as InternAccount | null;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('intern_accounts')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();
          internRow = data as InternAccount | null;
        }
      }

      if (!internRow) { setLoading(false); return; }
      setIntern(internRow);

      const [g, a, m, l] = await Promise.all([
        supabase.from('intern_goals').select('*').eq('intern_id', internRow.id).order('created_at'),
        supabase.from('intern_assignments').select('*').eq('intern_id', internRow.id).order('created_at', { ascending: false }),
        supabase.from('intern_milestones').select('*').eq('intern_id', internRow.id),
        supabase.from('intern_learning_log').select('*').eq('intern_id', internRow.id).order('created_at', { ascending: false }).limit(50),
      ]);

      setGoals((g.data as InternGoal[]) ?? []);
      setAssignments((a.data as InternAssignment[]) ?? []);
      setMilestones((m.data as InternMilestone[]) ?? []);
      setLogEntries((l.data as LearningLogEntry[]) ?? []);
      setLoading(false);
    };
    load();
  }, [internId]);

  // Derived
  const currentPhase = useMemo(() => PHASES.find(p => p.id === (intern?.phase ?? 'onboarding')) ?? PHASES[0], [intern]);
  const level = intern?.level ?? 1;
  const levelInfo = LEVEL_NAMES[level] ?? LEVEL_NAMES[1];
  const programWeek = useMemo(() => {
    if (!intern?.start_date) return null;
    const days = Math.floor((Date.now() - new Date(intern.start_date).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(12, Math.ceil((days + 1) / 7)));
  }, [intern]);

  const activeAssignments = assignments.filter(a => a.status !== 'completed' && a.status !== 'skipped');
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const totalAssignments = assignments.length;
  const progressPct = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

  const earnedMilestones = new Set(milestones.map(m => m.milestone_key as MilestoneKey));

  // Current focus = highest priority active assignment OR phase description if none
  const currentFocus = activeAssignments[0];

  const promotePhase = async (nextPhase: AcademyPhase) => {
    if (!intern || !showEvalLayer) return;
    const nextLevelMap: Record<AcademyPhase, number> = { onboarding: 1, foundation: 2, specialisation: 3, ownership: 5, completed: 5 };
    const { error } = await supabase
      .from('intern_accounts')
      .update({ phase: nextPhase, level: nextLevelMap[nextPhase] })
      .eq('id', intern.id);
    if (error) { alert(`Promotion failed: ${error.message}`); return; }
    setIntern({ ...intern, phase: nextPhase, level: nextLevelMap[nextPhase] });
  };

  const updateAssignmentStatus = async (id: string, status: AssignmentStatus) => {
    const { error } = await supabase.from('intern_assignments').update({ status }).eq('id', id);
    if (error) { alert(`Update failed: ${error.message}`); return; }
    setAssignments(assignments.map(a => a.id === id ? { ...a, status } : a));
  };

  const addLogEntry = async () => {
    if (!intern || !newLogContent.trim()) return;
    setSavingLog(true);
    const { data, error } = await supabase
      .from('intern_learning_log')
      .insert({ intern_id: intern.id, entry_text: newLogContent.trim() })
      .select()
      .single();
    setSavingLog(false);
    if (error) { alert(`Save failed: ${error.message}`); return; }
    setLogEntries([data as LearningLogEntry, ...logEntries]);
    setNewLogContent('');
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Spinner /></div>;

  if (!intern) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-bold text-amber-900">No Academy record found</h2>
          <p className="mt-2 text-sm text-amber-800">
            Your account isn't linked to an Academy enrollment yet. Ask Luis or Danylo to onboard you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ═══ HERO — Program state summary ═══ */}
      <header className="mb-10 rounded-2xl border border-black/[0.08] bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm">
        {showEvalLayer && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 ring-1 ring-rose-200">
            👁 Admin view · Eval layer active
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.3em] text-[#515154]">
              {intern.cohort ?? 'Fellowship'} · Academy
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-[#1d1d1f]">
              {intern.full_name}
            </h1>
            <p className="mt-2 text-sm text-[#515154]">
              {intern.department} · {programWeek !== null ? `Woche ${programWeek} / 12` : 'Noch nicht gestartet'}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <StatBlock label="Phase" value={`${currentPhase.emoji} ${currentPhase.label}`} sub={currentPhase.weeks} color={currentPhase.color} />
            <StatBlock label="Level" value={`${levelInfo.emoji} ${levelInfo.name}`} sub={`Lvl ${level} · ${earnedMilestones.size}/5 Milestones`} color="#0F766E" />
            <StatBlock label="Progress" value={`${progressPct}%`} sub={`${completedAssignments}/${totalAssignments} Tasks`} color="#F97066" />
          </div>
        </div>

        {/* Phase timeline */}
        <div className="mt-8">
          <ol className="flex items-center gap-0">
            {PHASES.map((p, i) => {
              const reached = p.order <= currentPhase.order;
              const current = p.id === currentPhase.id;
              const isLast = i === PHASES.length - 1;
              return (
                <li key={p.id} className={`${isLast ? '' : 'flex-1'} flex items-center`}>
                  <button
                    type="button"
                    onClick={() => showEvalLayer && promotePhase(p.id)}
                    disabled={!showEvalLayer}
                    className={`flex flex-col items-center gap-1 ${showEvalLayer ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                    title={showEvalLayer ? `Click to promote to ${p.label}` : p.label}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ring-2 transition-all ${
                        current ? 'ring-offset-2 scale-110' : ''
                      }`}
                      style={{
                        backgroundColor: reached ? p.color : '#E5E7EB',
                        color: reached ? 'white' : '#9CA3AF',
                        ['--tw-ring-color' as never]: current ? p.color : 'transparent',
                      }}
                    >
                      {p.emoji}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${reached ? 'text-[#1d1d1f]' : 'text-[#515154]'}`}>
                      {p.label}
                    </span>
                  </button>
                  {!isLast && (
                    <div
                      className="mx-2 h-0.5 flex-1 rounded-full"
                      style={{ backgroundColor: PHASES[i + 1].order <= currentPhase.order ? PHASES[i + 1].color : '#E5E7EB' }}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      {/* ═══ CURRENT FOCUS ═══ */}
      <section className="mb-10">
        <h2 className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#515154]">
          Current Focus
        </h2>
        {currentFocus ? (
          <FocusCard assignment={currentFocus} onStatusChange={(s) => updateAssignmentStatus(currentFocus.id, s)} />
        ) : (
          <div className="rounded-xl border border-black/[0.08] bg-white p-8 text-center">
            <p className="text-3xl">{currentPhase.emoji}</p>
            <h3 className="mt-3 text-xl font-bold text-[#1d1d1f]">{currentPhase.label}: {currentPhase.weeks}</h3>
            <p className="mt-2 text-sm text-[#515154] max-w-md mx-auto">{currentPhase.description}</p>
            <p className="mt-4 text-xs text-[#515154]">
              Keine aktiven Aufgaben. {showEvalLayer ? 'Weise neue Aufgaben zu oder promote zur nächsten Phase.' : 'Warte auf Zuweisung.'}
            </p>
          </div>
        )}
      </section>

      {/* ═══ TABS ═══ */}
      <nav className="mb-6 flex gap-1 border-b border-black/[0.08] overflow-x-auto">
        {([
          { k: 'journey', label: 'Journey', count: null },
          { k: 'tasks', label: 'Tasks', count: activeAssignments.length },
          { k: 'goals', label: 'Goals', count: goals.length },
          { k: 'log', label: 'Learning Log', count: logEntries.length },
          { k: 'program', label: 'Program', count: null },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={`relative px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === t.k ? 'text-[#0F766E]' : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            {t.label}
            {t.count !== null && (
              <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === t.k ? 'bg-[#0F766E] text-white' : 'bg-black/[0.06] text-[#515154]'
              }`}>{t.count}</span>
            )}
            {activeTab === t.k && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#0F766E]" />
            )}
          </button>
        ))}
      </nav>

      {/* ═══ TAB CONTENT ═══ */}
      {activeTab === 'journey' && (
        <JourneyTab
          phases={PHASES}
          currentPhase={currentPhase}
          milestones={milestones}
          earnedMilestones={earnedMilestones}
        />
      )}

      {activeTab === 'tasks' && (
        <TasksTab
          assignments={assignments}
          onStatusChange={updateAssignmentStatus}
        />
      )}

      {activeTab === 'goals' && (
        <GoalsTab goals={goals} />
      )}

      {activeTab === 'log' && (
        <LogTab
          entries={logEntries}
          newEntry={newLogContent}
          onNewEntryChange={setNewLogContent}
          onAddEntry={addLogEntry}
          saving={savingLog}
        />
      )}

      {activeTab === 'program' && <ProgramTab />}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────

const StatBlock: React.FC<{ label: string; value: string; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div className="text-right">
    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#515154]">{label}</p>
    <p className="mt-1 text-lg font-black tabular-nums" style={{ color }}>{value}</p>
    <p className="text-[10px] text-[#515154]">{sub}</p>
  </div>
);

const FocusCard: React.FC<{ assignment: InternAssignment; onStatusChange: (s: AssignmentStatus) => void }> = ({ assignment, onStatusChange }) => (
  <article className="rounded-2xl border border-black/[0.08] bg-gradient-to-br from-white to-emerald-50/50 p-6 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700">
          Aktive Aufgabe · {assignment.priority ?? 'normal'}
        </p>
        <h3 className="mt-2 text-xl font-bold leading-tight text-[#1d1d1f]">{assignment.title}</h3>
        {assignment.description && (
          <p className="mt-2 text-sm leading-relaxed text-[#515154]">{assignment.description}</p>
        )}
        {assignment.due_date && (
          <p className="mt-3 text-xs text-[#515154]">
            Fällig bis: <strong>{new Date(assignment.due_date).toLocaleDateString('de-DE')}</strong>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {(['in_progress', 'completed', 'blocked'] as AssignmentStatus[]).map(s => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            disabled={assignment.status === s}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              assignment.status === s
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-black/10 text-[#515154] hover:border-black/20 hover:text-[#1d1d1f]'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  </article>
);

const JourneyTab: React.FC<{
  phases: PhaseMeta[];
  currentPhase: PhaseMeta;
  milestones: InternMilestone[];
  earnedMilestones: Set<MilestoneKey>;
}> = ({ phases, currentPhase, milestones, earnedMilestones }) => (
  <div className="space-y-8">
    <section>
      <h3 className="mb-4 text-lg font-bold text-[#1d1d1f]">Phasen</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {phases.map(p => {
          const reached = p.order <= currentPhase.order;
          const current = p.id === currentPhase.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-5 ${
                current ? 'border-emerald-300 bg-emerald-50/60 shadow-sm' :
                reached ? 'border-black/[0.08] bg-white' : 'border-black/[0.04] bg-black/[0.02] opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-[#1d1d1f]">{p.label}</h4>
                    {current && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Current</span>}
                    {reached && !current && <span className="text-xs text-emerald-700 font-semibold">✓ Done</span>}
                  </div>
                  <p className="mt-1 text-xs text-[#515154]">{p.weeks}</p>
                  <p className="mt-2 text-sm text-[#515154]">{p.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>

    <section>
      <h3 className="mb-4 text-lg font-bold text-[#1d1d1f]">Milestones</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(['rookie', 'explorer', 'contributor', 'builder', 'owner'] as MilestoneKey[]).map(key => {
          const earned = earnedMilestones.has(key);
          const milestone = milestones.find(m => m.milestone_key === key);
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 text-center ${
                earned ? 'border-amber-300 bg-amber-50' : 'border-black/[0.08] bg-white opacity-60'
              }`}
            >
              <div className="text-2xl">{earned ? '🏆' : '🔒'}</div>
              <p className="mt-2 text-sm font-bold text-[#1d1d1f]">{MILESTONE_LABEL[key]}</p>
              {milestone?.earned_at && (
                <p className="mt-1 text-[10px] text-[#515154]">
                  {new Date(milestone.earned_at).toLocaleDateString('de-DE')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  </div>
);

const TasksTab: React.FC<{ assignments: InternAssignment[]; onStatusChange: (id: string, s: AssignmentStatus) => void }> = ({ assignments, onStatusChange }) => {
  const groups: Record<string, InternAssignment[]> = {
    active: assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress'),
    blocked: assignments.filter(a => a.status === 'blocked'),
    completed: assignments.filter(a => a.status === 'completed'),
  };

  if (assignments.length === 0) {
    return <p className="text-sm text-[#515154] italic">Noch keine Aufgaben zugewiesen.</p>;
  }

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([key, items]) => items.length > 0 && (
        <section key={key}>
          <h3 className="mb-3 font-mono text-[11px] font-bold uppercase tracking-wider text-[#515154]">
            {key} · {items.length}
          </h3>
          <ul className="space-y-2">
            {items.map(a => (
              <li key={a.id} className="flex items-start justify-between gap-4 rounded-lg border border-black/[0.06] bg-white p-4">
                <div className="flex-1">
                  <p className="font-semibold text-[#1d1d1f]">{a.title}</p>
                  {a.description && <p className="mt-1 text-sm text-[#515154]">{a.description}</p>}
                  {a.due_date && (
                    <p className="mt-2 text-xs text-[#515154]">Fällig: {new Date(a.due_date).toLocaleDateString('de-DE')}</p>
                  )}
                </div>
                {(a.status === 'assigned' || a.status === 'in_progress' || a.status === 'blocked') && (
                  <div className="flex flex-col gap-1">
                    {a.status !== 'in_progress' && (
                      <button onClick={() => onStatusChange(a.id, 'in_progress')} className="rounded-md bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-200">Start</button>
                    )}
                    <button onClick={() => onStatusChange(a.id, 'completed')} className="rounded-md bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-200">Done</button>
                    {a.status !== 'blocked' && (
                      <button onClick={() => onStatusChange(a.id, 'blocked')} className="rounded-md bg-rose-50 px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100">Block</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

const GoalsTab: React.FC<{ goals: InternGoal[] }> = ({ goals }) => {
  if (goals.length === 0) {
    return (
      <div className="rounded-xl border border-black/[0.08] bg-white p-8 text-center">
        <p className="text-3xl">🎯</p>
        <h3 className="mt-3 text-lg font-bold text-[#1d1d1f]">Goals werden in Phase 1 (Onboarding) gesetzt</h3>
        <p className="mt-2 text-sm text-[#515154] max-w-md mx-auto">
          Drei persönliche Ziele: ein Skill-Goal, ein Portfolio-Goal, ein Karriere-Goal.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {goals.map(g => (
        <article key={g.id} className="rounded-xl border border-black/[0.08] bg-white p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F766E]">
            {g.category}
          </p>
          <h3 className="mt-2 font-bold text-[#1d1d1f] leading-tight">{g.title}</h3>
          {g.description && <p className="mt-2 text-sm text-[#515154]">{g.description}</p>}
          {g.target_date && (
            <p className="mt-3 text-xs text-[#515154]">Ziel bis: {new Date(g.target_date).toLocaleDateString('de-DE')}</p>
          )}
        </article>
      ))}
    </div>
  );
};

const LogTab: React.FC<{
  entries: LearningLogEntry[];
  newEntry: string;
  onNewEntryChange: (v: string) => void;
  onAddEntry: () => void;
  saving: boolean;
}> = ({ entries, newEntry, onNewEntryChange, onAddEntry, saving }) => (
  <div className="space-y-6">
    <div className="rounded-xl border border-black/[0.08] bg-white p-5">
      <label className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-wider text-[#515154]">
        Was hast du heute gelernt?
      </label>
      <textarea
        rows={3}
        value={newEntry}
        onChange={(e) => onNewEntryChange(e.target.value)}
        placeholder="Ein Thema, eine Erkenntnis, ein Moment."
        className="w-full rounded-lg border border-black/10 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
      />
      <div className="mt-3 flex justify-end">
        <button
          onClick={onAddEntry}
          disabled={saving || !newEntry.trim()}
          className="rounded-lg bg-[#0F766E] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? 'Speichere…' : 'Eintrag hinzufügen'}
        </button>
      </div>
    </div>

    {entries.length === 0 ? (
      <p className="text-sm text-[#515154] italic text-center py-8">Noch keine Einträge. Tägliche Einträge bauen über Wochen das beste Review-Material.</p>
    ) : (
      <ul className="space-y-3">
        {entries.map(e => (
          <li key={e.id} className="rounded-lg border border-black/[0.06] bg-white p-4">
            <p className="whitespace-pre-wrap text-sm text-[#1d1d1f]">{e.entry_text}</p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[#515154]">
              {new Date(e.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </li>
        ))}
      </ul>
    )}
  </div>
);

// ─── Program Tab — renders Tom's Academy framework docs in-app ───────────

const PROGRAM_DOCS: Array<{ k: string; label: string; group: 'core' | 'brand'; doc: string }> = [
  // Core program
  { k: 'overview',   label: 'Overview',              group: 'core',  doc: readmeDoc },
  { k: 'employment', label: 'Day-1 Setup',           group: 'core',  doc: employmentDoc },
  { k: 'tracks',     label: 'Specialisation Tracks', group: 'core',  doc: tracksDoc },
  { k: 'monday',     label: 'Monday Meeting',        group: 'core',  doc: mondayDoc },
  { k: 'rubrics',    label: 'Assessment Rubrics',    group: 'core',  doc: rubricsDoc },
  { k: 'buddy',      label: 'Buddy Program',         group: 'core',  doc: buddyDoc },
  // Brand walkthroughs
  { k: 'b-thiocyn',  label: 'Thiocyn',               group: 'brand', doc: brandThiocyn },
  { k: 'b-severin',  label: 'Dr. Severin',           group: 'brand', doc: brandDrSeverin },
  { k: 'b-tas',      label: 'Take A Shot',           group: 'brand', doc: brandTakeAShot },
  { k: 'b-paigh',    label: 'Paigh',                 group: 'brand', doc: brandPaigh },
  { k: 'b-tj',       label: 'Timber & John',         group: 'brand', doc: brandTimberJohn },
  { k: 'b-wristr',   label: 'Wristr',                group: 'brand', doc: brandWristr },
];

const ProgramTab: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState(PROGRAM_DOCS[0].k);
  const current = PROGRAM_DOCS.find(d => d.k === activeDoc) ?? PROGRAM_DOCS[0];

  return (
    <div>
      <p className="mb-6 text-sm text-[#515154]">
        Das komplette 12-Wochen-Curriculum zum Nachlesen. Phasen, Tracks, Meeting-Struktur, Bewertungen, Buddy-Programm.
      </p>

      <div className="mb-8 space-y-3">
        <nav className="flex flex-wrap gap-2">
          {PROGRAM_DOCS.filter(d => d.group === 'core').map(d => (
            <button
              key={d.k}
              onClick={() => setActiveDoc(d.k)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                activeDoc === d.k
                  ? 'bg-[#0F766E] text-white'
                  : 'bg-white border border-black/10 text-[#515154] hover:border-black/20 hover:text-[#1d1d1f]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#515154] mr-1">Brand-Walkthroughs:</span>
          {PROGRAM_DOCS.filter(d => d.group === 'brand').map(d => (
            <button
              key={d.k}
              onClick={() => setActiveDoc(d.k)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeDoc === d.k
                  ? 'bg-[#F97066] text-white'
                  : 'bg-white border border-black/10 text-[#515154] hover:border-black/20 hover:text-[#1d1d1f]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <article className="rounded-2xl border border-black/[0.08] bg-white p-8 prose prose-slate max-w-none prose-headings:font-sans prose-headings:tracking-tight prose-h1:text-3xl prose-h1:font-black prose-h2:text-xl prose-h2:font-bold prose-h2:mt-10 prose-h3:font-bold prose-h3:text-base prose-table:text-sm prose-table:overflow-x-auto prose-th:bg-black/[0.03] prose-th:text-left prose-th:font-bold prose-td:py-2 prose-td:align-top prose-td:border-t prose-td:border-black/[0.06] prose-code:bg-black/[0.05] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-li:my-0.5 prose-p:leading-relaxed prose-a:text-[#0F766E] prose-a:no-underline hover:prose-a:underline">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.doc}</ReactMarkdown>
      </article>
    </div>
  );
};

export default FellowCourseView;
