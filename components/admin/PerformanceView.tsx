import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Scoring Model ────────────────────────────────────────────────────────────
//
// Dimension         Weight  Source
// ─────────────────────────────────────────────────────────────────────────────
// Efficiency        40 %    tasks done on time / total assigned (× 100)
// Quality           30 %    avg quality_score (1–5) mapped to 0–100
// Volume            20 %    tasks completed this period (normalised to team max)
// Impact            10 %    avg impact_score (1–3) mapped to 0–100
//
// Overall = Efficiency×0.4 + Quality×0.3 + Volume×0.2 + Impact×0.1
// ─────────────────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'all';

interface Task {
  id: string;
  title: string;
  brand: string | null;
  status: string;
  due_date: string | null;
  updated_at: string;
  quality_score: number | null;
  impact_score: number | null;
  assigned_to_email: string | null;
  scope: string;
  priority: number;
}

interface InternRow {
  email: string;
  name: string;
  role: string;
  tasks: Task[];
}

interface Score {
  efficiency: number;   // 0–100
  quality: number;      // 0–100
  volume: number;       // 0–100 (normalised)
  impact: number;       // 0–100
  overall: number;      // 0–100
  raw: {
    total: number;
    done: number;
    onTime: number;
    avgQuality: number | null;
    avgImpact: number | null;
  };
}

// Known interns — derived from team_tasks + manual roster
const INTERN_ROSTER: { email: string; name: string; role: string }[] = [
  { email: 'aditya@intern.hartlimes.de',    name: 'Aditya Arya',    role: 'Customer Support' },
  { email: 'danylo@intern.hartlimes.de',    name: 'Danylo',         role: 'UGC / CS' },
  { email: 'ekaterina@intern.hartlimes.de', name: 'Ekaterina',      role: 'Creative Allrounder' },
  { email: 'mainak@intern.hartlimes.de',    name: 'Mainak Patra',   role: 'Hiring Assistant' },
  { email: 'sameer@intern.hartlimes.de',    name: 'Sameer',         role: 'Customer Support' },
  { email: 'tom@intern.hartlimes.de',       name: 'Tom Roelants',   role: 'Customer Support' },
  { email: 'victoria@intern.hartlimes.de',  name: 'Victoria',       role: 'Influencer Program' },
  { email: 'ansh@intern.hartlimes.de',      name: 'Ansh Choubeh',   role: 'TBD' },
  { email: 'dhaval@intern.hartlimes.de',    name: 'Dhaval',         role: 'TBD' },
  { email: 'rukhesh@intern.hartlimes.de',   name: 'Rukhesh',        role: 'TBD' },
  { email: 'vivian@intern.hartlimes.de',    name: 'Vivian',         role: 'TBD' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return 'text-emerald-400';
  if (s >= 60) return 'text-[#0F766E]';
  return 'text-red-400';
}
function scoreBg(s: number) {
  if (s >= 80) return 'bg-green-500';
  if (s >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
function scoreRing(s: number) {
  if (s >= 80) return 'ring-emerald-500/30';
  if (s >= 60) return 'ring-amber-500/30';
  return 'ring-red-500/30';
}

function computeScore(tasks: Task[], maxVolumeInTeam: number): Score {
  const assigned = tasks.filter(t => t.status !== 'cancelled');
  const done = assigned.filter(t => t.status === 'done');
  const total = assigned.length;

  const onTime = done.filter(t => {
    if (!t.due_date) return true; // no deadline = not late
    return new Date(t.updated_at) <= new Date(t.due_date + 'T23:59:59');
  }).length;

  const efficiency = total === 0 ? 0 : Math.round((onTime / total) * 100);

  const rated = done.filter(t => t.quality_score != null);
  const avgQuality = rated.length > 0 ? rated.reduce((s, t) => s + (t.quality_score ?? 0), 0) / rated.length : null;
  const qualityScore = avgQuality != null ? Math.round(((avgQuality - 1) / 4) * 100) : 0;

  const volumeScore = maxVolumeInTeam === 0 ? 0 : Math.round((done.length / maxVolumeInTeam) * 100);

  const impactRated = done.filter(t => t.impact_score != null);
  const avgImpact = impactRated.length > 0 ? impactRated.reduce((s, t) => s + (t.impact_score ?? 0), 0) / impactRated.length : null;
  const impactScore = avgImpact != null ? Math.round(((avgImpact - 1) / 2) * 100) : 0;

  const overall = Math.round(
    efficiency * 0.4 + qualityScore * 0.3 + volumeScore * 0.2 + impactScore * 0.1
  );

  return {
    efficiency, quality: qualityScore, volume: volumeScore, impact: impactScore, overall,
    raw: { total, done: done.length, onTime, avgQuality, avgImpact },
  };
}

function periodStart(period: Period): Date {
  const now = new Date();
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return new Date('2000-01-01');
}

// ─── Score Card ───────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ label: string; value: number; weight: string }> = ({ label, value, weight }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[10px] font-bold text-[#6e6e73] uppercase tracking-wide">{label}</span>
      <span className="text-xs font-black text-[#1d1d1f]">{value}%</span>
    </div>
    <div className="h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${scoreBg(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
    <p className="text-[9px] text-[#6e6e73] mt-0.5 text-right">weight {weight}</p>
  </div>
);

const InternCard: React.FC<{
  intern: InternRow;
  score: Score;
  onRate: (task: Task) => void;
}> = ({ intern, score, onRate }) => {
  const [expanded, setExpanded] = useState(false);
  const open = intern.tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const done = intern.tasks.filter(t => t.status === 'done');

  return (
    <div className={`bg-white/70 border border-black/[0.06] rounded-2xl overflow-hidden transition-all backdrop-blur-sm ${scoreRing(score.overall)} ring-2`}>
      {/* Header */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-black/[0.03] transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Score circle */}
        <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${
          score.overall >= 80 ? 'bg-emerald-500/15' : score.overall >= 60 ? 'bg-[#0F766E]/15' : 'bg-red-500/15'
        }`}>
          <span className={`text-xl font-black leading-none ${scoreColor(score.overall)}`}>
            {score.raw.total === 0 ? '—' : score.overall}
          </span>
          {score.raw.total > 0 && (
            <span className="text-[9px] text-[#6e6e73] font-semibold">/ 100</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black text-[#1d1d1f] text-sm">{intern.name}</p>
          <p className="text-xs text-[#6e6e73] font-medium">{intern.role}</p>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[10px] text-[#6e6e73]">
              <span className="font-bold text-[#1d1d1f]">{score.raw.done}</span>/{score.raw.total} tasks
            </span>
            <span className="text-[10px] text-[#6e6e73]">
              <span className="font-bold text-emerald-400">{score.raw.onTime}</span> on-time
            </span>
            {open.length > 0 && (
              <span className="text-[10px] bg-blue-500/15 text-blue-400 font-bold px-1.5 py-0.5 rounded-full">
                {open.length} open
              </span>
            )}
          </div>
        </div>

        {/* Dimension mini-bars */}
        <div className="hidden md:flex flex-col gap-1 w-28 shrink-0">
          {[
            { label: 'Efficiency', val: score.efficiency },
            { label: 'Quality', val: score.quality },
            { label: 'Volume', val: score.volume },
          ].map(d => (
            <div key={d.label} className="flex items-center gap-1.5">
              <span className="text-[9px] text-[#6e6e73] w-14 text-right">{d.label}</span>
              <div className="flex-1 h-1 bg-black/[0.04] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreBg(d.val)}`} style={{ width: `${d.val}%` }} />
              </div>
            </div>
          ))}
        </div>

        <svg
          className={`w-4 h-4 text-[#6e6e73] shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-black/[0.06] px-5 py-4 space-y-4">
          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreBar label="Efficiency (on-time)" value={score.efficiency} weight="40%" />
            <ScoreBar label="Quality (rated)" value={score.quality} weight="30%" />
            <ScoreBar label="Volume (normalised)" value={score.volume} weight="20%" />
            <ScoreBar label="Impact" value={score.impact} weight="10%" />
          </div>

          {/* Unrated tasks (need quality/impact score) */}
          {done.filter(t => t.quality_score == null).length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#0F766E] mb-2 flex items-center gap-1">
                <span>⚠</span> {done.filter(t => t.quality_score == null).length} tasks need rating
              </p>
              <div className="space-y-1.5">
                {done.filter(t => t.quality_score == null).map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-xs bg-[#0F766E]/12 border border-[#0F766E]/25 rounded-lg px-3 py-2">
                    <span className="flex-1 text-[#1d1d1f] font-medium truncate">{task.title}</span>
                    {task.brand && (
                      <span className="text-[10px] text-primary-600 font-bold uppercase">{task.brand}</span>
                    )}
                    <button
                      onClick={() => onRate(task)}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-[#1d1d1f] text-[10px] font-bold rounded-md transition-colors shrink-0"
                    >
                      Rate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open tasks */}
          {open.length > 0 && (
            <div>
              <p className="text-xs font-bold text-[#6e6e73] mb-2">Open tasks</p>
              <div className="space-y-1">
                {open.map(task => (
                  <div key={task.id} className="flex items-center gap-2 text-xs bg-black/[0.03] rounded-lg px-3 py-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      task.status === 'blocked' ? 'bg-red-500' :
                      task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-500'
                    }`} />
                    <span className="flex-1 text-[#1d1d1f] truncate">{task.title}</span>
                    <span className="text-[10px] text-[#6e6e73] shrink-0">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString('de-DE', { day:'2-digit', month:'short' }) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Rate Task Modal ──────────────────────────────────────────────────────────

const RateTaskModal: React.FC<{
  task: Task;
  onClose: () => void;
  onSaved: () => void;
}> = ({ task, onClose, onSaved }) => {
  const [quality, setQuality] = useState<number>(task.quality_score ?? 3);
  const [impact, setImpact] = useState<number>(task.impact_score ?? 2);
  const [saving, setSaving] = useState(false);

  const QUALITY_LABELS: Record<number, string> = {
    1: 'Needs redo', 2: 'Below expectations', 3: 'Met expectations', 4: 'Above expectations', 5: 'Excellent',
  };
  const IMPACT_LABELS: Record<number, string> = {
    1: 'Low — minimal effect', 2: 'Medium — moved the needle', 3: 'High — significant outcome',
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('team_tasks').update({
      quality_score: quality,
      impact_score: impact,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/80 border border-black/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-black text-[#1d1d1f] mb-1">Rate Task</h3>
        <p className="text-xs text-[#6e6e73] mb-5 truncate">{task.title}</p>

        {/* Quality */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-[#515154] mb-2 uppercase tracking-wide">
            Quality Score <span className="text-[#0F766E]">★</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setQuality(v)}
                className={`flex-1 py-2 rounded-xl text-sm font-black border-2 transition-all ${
                  quality === v ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-white/[0.10] text-[#6e6e73] hover:border-white/20'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6e6e73] mt-1.5 text-center">{QUALITY_LABELS[quality]}</p>
        </div>

        {/* Impact */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-[#515154] mb-2 uppercase tracking-wide">
            Impact Score ⚡
          </label>
          <div className="flex gap-2">
            {[1, 2, 3].map(v => (
              <button
                key={v}
                onClick={() => setImpact(v)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-black border-2 transition-all ${
                  impact === v ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-white/[0.10] text-[#6e6e73] hover:border-white/20'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-[#6e6e73] mt-1.5 text-center">{IMPACT_LABELS[impact]}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-black/[0.03] text-[#515154] text-sm font-bold rounded-xl hover:bg-white/[0.08] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 py-2.5 bg-[#0F766E] hover:bg-[#c8832a] text-[#1d1d1f] text-sm font-bold rounded-xl transition-all disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PerformanceView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [ratingTask, setRatingTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const start = periodStart(period);
    let query = supabase
      .from('team_tasks')
      .select('id,title,brand,status,due_date,updated_at,quality_score,impact_score,assigned_to_email,scope,priority')
      .eq('scope', 'team')
      .not('assigned_to_email', 'is', null);

    if (period !== 'all') {
      query = query.gte('created_at', start.toISOString());
    }

    const { data } = await query.order('created_at', { ascending: false });
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Build per-intern rows
  const internRows: InternRow[] = INTERN_ROSTER.map(r => ({
    ...r,
    tasks: tasks.filter(t => t.assigned_to_email === r.email),
  })).filter(r => r.tasks.length > 0); // only show interns with tasks

  // Also show interns assigned but not in roster (catch-all for other emails)
  const knownEmails = new Set(INTERN_ROSTER.map(r => r.email));
  const unknownEmails = [...new Set(
    tasks
      .map(t => t.assigned_to_email)
      .filter((e): e is string => !!e && !knownEmails.has(e))
  )];
  const unknownRows: InternRow[] = unknownEmails.map(email => ({
    email: email as string, name: (email as string).split('@')[0], role: 'Team Member',
    tasks: tasks.filter(t => t.assigned_to_email === email),
  }));

  const allRows = [...internRows, ...unknownRows];

  // Compute max volume for normalisation
  const maxVolume = Math.max(1, ...allRows.map(r => r.tasks.filter(t => t.status === 'done').length));

  const scored = allRows
    .map(r => ({ intern: r, score: computeScore(r.tasks, maxVolume) }))
    .sort((a, b) => b.score.overall - a.score.overall);

  const totalUnrated = tasks.filter(t => t.status === 'done' && t.quality_score == null).length;

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-[#1d1d1f]">Team Performance</h2>
          <p className="text-xs text-[#6e6e73] mt-0.5">
            Scoring: Efficiency 40% · Quality 30% · Volume 20% · Impact 10%
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {totalUnrated > 0 && (
            <span className="px-3 py-1.5 bg-[#0F766E]/15 border border-[#0F766E]/25 text-[#0F766E] text-xs font-bold rounded-full">
              ⚠ {totalUnrated} tasks need rating
            </span>
          )}
          <div className="flex items-center gap-1 bg-black/[0.03] border border-black/[0.06] rounded-full p-0.5">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  period === p.id ? 'bg-[#0F766E]/12 text-[#0F766E] border border-[#0F766E]/25' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scoring legend */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'High Performer', range: '80–100', color: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' },
          { label: 'On Track', range: '60–79', color: 'bg-[#0F766E]/15 border-[#0F766E]/25 text-[#0F766E]' },
          { label: 'Needs Attention', range: '0–59', color: 'bg-red-500/15 border-red-500/20 text-red-400' },
        ].map(l => (
          <div key={l.label} className={`rounded-xl border px-3 py-2.5 ${l.color}`}>
            <p className="text-[10px] font-black uppercase tracking-wider">{l.label}</p>
            <p className="text-lg font-black mt-0.5">{l.range}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : scored.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-[#515154] font-semibold">No team tasks assigned yet.</p>
          <p className="text-[#6e6e73] text-sm mt-1">Assign tasks via 👥 Team Board to start tracking performance.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scored.map(({ intern, score }, idx) => (
            <div key={intern.email} className="relative">
              {idx === 0 && score.raw.total > 0 && (
                <div className="absolute -top-1.5 -left-1 z-10">
                  <span className="text-xs bg-amber-400 text-[#1d1d1f] font-black px-2 py-0.5 rounded-full shadow-sm">
                    #1 🏆
                  </span>
                </div>
              )}
              <InternCard
                intern={intern}
                score={score}
                onRate={task => setRatingTask(task)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <p className="text-[10px] text-[#6e6e73] text-center pb-2">
        Only team-scoped tasks are tracked. Private tasks (🔒 My Desk) are excluded from team scoring.
        Quality + Impact scores are set manually by Luis after task completion.
      </p>

      {/* Rating Modal */}
      {ratingTask && (
        <RateTaskModal
          task={ratingTask}
          onClose={() => setRatingTask(null)}
          onSaved={fetchTasks}
        />
      )}
    </div>
  );
};

export default PerformanceView;
