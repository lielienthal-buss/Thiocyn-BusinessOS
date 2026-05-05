// components/admin/InsightsView.tsx
// Hiring Insights — Databloo-style monochrome dashboard.
// KPI-Row + Line-Chart with previous-period compare + Stage-Cards-Funnel.
// Brand tokens only: primary (Teal), secondary (Coral, sparingly), surface greys.
import React, { useState, useEffect, useMemo } from 'react';
import type { Application } from '@/types';
import { getAllApplications } from '@/lib/actions';
import { trackOperationalMetric } from '@/lib/track-event';
import Spinner from '@/components/ui/Spinner';

// ─── Funnel definition ────────────────────────────────────────────────────
type FunnelStep = {
  key: string;
  label: string;
  matches: (a: Application) => boolean;
};

const FUNNEL_STEPS: FunnelStep[] = [
  { key: 'applied',        label: 'Applied',        matches: () => true },
  { key: 'task_requested', label: 'Task Sent',      matches: (a) => a.task_sent_at != null || ['task_requested','task_submitted','interview','hired'].includes(a.stage ?? '') },
  { key: 'task_submitted', label: 'Task Submitted', matches: (a) => a.task_submitted_at != null || ['task_submitted','interview','hired'].includes(a.stage ?? '') },
  { key: 'interview',      label: 'Interview',      matches: (a) => a.interview_at != null || ['interview','hired'].includes(a.stage ?? '') },
  { key: 'hired',          label: 'Hired',          matches: (a) => a.stage === 'hired' },
];

// ─── Soll-Werte (Targets) für Conversion ─────────────────────────────────
// Initial-Annahmen — anpassen sobald wir Baseline aus echten Daten haben.
const CONVERSION_TARGETS: Record<string, { target: number; hintBelow: string }> = {
  task_requested: { target: 60, hintBelow: 'Conversion zu eng — Job-Beschreibung präzisieren oder Bewerber-Quality prüfen' },
  task_submitted: { target: 50, hintBelow: 'Task wird seltener abgegeben — Reminder-Mail oder Task-Komplexität prüfen' },
  interview:      { target: 60, hintBelow: 'Wenige Tasks führen zum Interview — Task-Bewertung strenger als geplant?' },
  hired:          { target: 30, hintBelow: 'Hire-Rate aus Interview niedrig — Vorfilter oder Standards justieren' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const diffMs = new Date(b).getTime() - new Date(a).getTime();
  if (isNaN(diffMs) || diffMs < 0) return null;
  return diffMs / (1000 * 60 * 60 * 24);
}

function dailyCountsLast(applications: Application[], days: number): { date: string; count: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const count = applications.filter((a) => (a.created_at ?? '').slice(0, 10) === dayStr).length;
    out.push({ date: dayStr, count });
  }
  return out;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

// ─── Sub-components ──────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  prevValue?: string;
  changePct: number | null;
  invertColor?: boolean; // for metrics where lower is better (time-to-hire)
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, prevValue, changePct, invertColor }) => {
  const positive = changePct == null ? null : invertColor ? changePct < 0 : changePct > 0;
  const trendColor =
    changePct === null ? 'text-[#86868b]'
    : positive ? 'text-primary-700'
    : changePct === 0 ? 'text-[#86868b]'
    : 'text-secondary-600';
  const arrow = changePct === null ? '·' : changePct > 0 ? '▲' : changePct < 0 ? '▼' : '–';
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#86868b]">{label}</p>
      <p className="mt-2 text-4xl font-black tracking-tight text-[#1d1d1f] tabular-nums">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className={`font-semibold tabular-nums ${trendColor}`}>
          {arrow} {changePct === null ? '—' : fmtPct(changePct)}
        </span>
        {prevValue && (
          <span className="text-[#86868b]">vs {prevValue}</span>
        )}
      </div>
    </div>
  );
};

interface TrendChartProps {
  current: { date: string; count: number }[];
  previous: { date: string; count: number }[];
}
const TrendChart: React.FC<TrendChartProps> = ({ current, previous }) => {
  const W = 800;
  const H = 180;
  const PAD_X = 20;
  const PAD_Y = 24;
  const allCounts = [...current.map((d) => d.count), ...previous.map((d) => d.count)];
  const maxY = Math.max(1, ...allCounts);
  const stepX = (W - 2 * PAD_X) / Math.max(1, current.length - 1);
  const yFor = (v: number) => H - PAD_Y - ((v / maxY) * (H - 2 * PAD_Y));

  const path = (data: { count: number }[]) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${PAD_X + i * stepX},${yFor(d.count)}`).join(' ');

  const areaPath = (data: { count: number }[]) =>
    `${path(data)} L ${PAD_X + (data.length - 1) * stepX},${H - PAD_Y} L ${PAD_X},${H - PAD_Y} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label="Bewerbungen pro Tag, aktueller vs vorheriger Zeitraum">
      <defs>
        <linearGradient id="currArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F766E" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0F766E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gridlines (3 horizontal) */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD_X} x2={W - PAD_X} y1={yFor(maxY * f)} y2={yFor(maxY * f)} stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
      ))}
      {/* previous period — softer, dashed */}
      <path d={path(previous)} fill="none" stroke="#0F766E" strokeOpacity="0.32" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* current period — solid + filled area */}
      <path d={areaPath(current)} fill="url(#currArea)" />
      <path d={path(current)} fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* dots on current period */}
      {current.map((d, i) => (
        <circle
          key={d.date}
          cx={PAD_X + i * stepX}
          cy={yFor(d.count)}
          r={d.count > 0 ? 2.5 : 1.5}
          fill="#0F766E"
          opacity={d.count > 0 ? 1 : 0.35}
        >
          <title>{d.date}: {d.count} {d.count === 1 ? 'Bewerbung' : 'Bewerbungen'}</title>
        </circle>
      ))}
    </svg>
  );
};

interface FunnelStageCardsProps {
  funnel: { key: string; label: string; count: number; fromPrev: number; fromTop: number }[];
  total: number;
}
const FunnelStageCards: React.FC<FunnelStageCardsProps> = ({ funnel, total }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {funnel.map((step, idx) => {
        const prevCount = idx === 0 ? total : funnel[idx - 1].count;
        const dropoff = idx === 0 ? 0 : Math.max(0, prevCount - step.count);
        const target = CONVERSION_TARGETS[step.key];
        const meetsTarget = target ? step.fromPrev >= target.target : null;
        const widthPct = total > 0 ? Math.max(8, (step.count / total) * 100) : 0;
        return (
          <div key={step.key} className="rounded-2xl bg-white border border-black/[0.06] p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#86868b]">{step.label}</p>
              <span className="text-[10px] font-mono text-[#86868b]">{idx + 1}/5</span>
            </div>
            <p className="mt-2 text-3xl font-black tracking-tight text-[#1d1d1f] tabular-nums">{step.count}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              {idx > 0 ? (
                <span className={`font-semibold tabular-nums ${
                  meetsTarget === null ? 'text-[#86868b]'
                  : meetsTarget ? 'text-primary-700'
                  : 'text-secondary-600'
                }`}>
                  {step.fromPrev.toFixed(0)}% ↓
                </span>
              ) : (
                <span className="text-[#86868b]">Eingang</span>
              )}
              {target && idx > 0 && (
                <span className="text-[#86868b]">· Soll ≥{target.target}%</span>
              )}
            </div>
            {/* Mini bar showing share of total */}
            <div className="mt-3 h-1 w-full rounded-full bg-black/[0.04] overflow-hidden">
              <div
                className="h-full bg-primary-700 transition-all duration-700"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            {idx > 0 && dropoff > 0 && (
              <p className="mt-2 text-[10px] text-[#86868b] tabular-nums">
                –{dropoff} vs. prev
              </p>
            )}
            {target && idx > 0 && meetsTarget === false && prevCount >= 5 && (
              <p className="mt-2 text-[10px] leading-relaxed text-secondary-600">
                {target.hintBelow}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main view ───────────────────────────────────────────────────────────
const InsightsView: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void trackOperationalMetric('insights_view_opened', 'hiring');
    let cancelled = false;
    const fetchAllApps = async () => {
      setLoading(true);
      const allApps = await getAllApplications();
      if (!cancelled) {
        setApplications(allApps);
        setLoading(false);
      }
    };
    void fetchAllApps();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const total = applications.length;

    const funnelCounts = FUNNEL_STEPS.map((step) => ({
      ...step,
      count: applications.filter(step.matches).length,
    }));

    const funnelWithConversion = funnelCounts.map((step, idx) => {
      const prevCount = idx === 0 ? total : funnelCounts[idx - 1].count;
      const fromPrev = prevCount > 0 ? (step.count / prevCount) * 100 : 0;
      const fromTop = total > 0 ? (step.count / total) * 100 : 0;
      return { ...step, fromPrev, fromTop };
    });

    const hiredApps = applications.filter((a) => a.stage === 'hired');

    const timeToHireDays = median(
      hiredApps
        .map((a) => daysBetween(a.created_at, a.decided_at))
        .filter((v): v is number => v !== null)
    );

    const taskCompletionDays = median(
      applications
        .map((a) => daysBetween(a.task_sent_at, a.task_submitted_at))
        .filter((v): v is number => v !== null)
    );

    const psychSums = applications.reduce<Record<string, { total: number; count: number }>>(
      (acc, app) => {
        if (app.psychometrics) {
          for (const trait in app.psychometrics) {
            if (!acc[trait]) acc[trait] = { total: 0, count: 0 };
            acc[trait].total += app.psychometrics[trait];
            acc[trait].count += 1;
          }
        }
        return acc;
      },
      {}
    );
    const bigFiveAverages = (Object.entries(psychSums) as [string, { total: number; count: number }][]).map(([trait, data]) => ({
      trait,
      average: Math.round(data.total / data.count),
    }));

    // Compare current 30d vs previous 30d
    const daily60 = dailyCountsLast(applications, 60);
    const current30 = daily60.slice(-30);
    const previous30 = daily60.slice(0, 30);

    const apps30dCurrent = current30.reduce((s, d) => s + d.count, 0);
    const apps30dPrevious = previous30.reduce((s, d) => s + d.count, 0);

    const currentHired = hiredApps.filter((a) => {
      const t = new Date(a.decided_at ?? a.created_at).getTime();
      return t >= Date.now() - 30 * 86400_000;
    }).length;
    const previousHired = hiredApps.filter((a) => {
      const t = new Date(a.decided_at ?? a.created_at).getTime();
      const start = Date.now() - 60 * 86400_000;
      const end = Date.now() - 30 * 86400_000;
      return t >= start && t < end;
    }).length;

    const conversionCurrent = apps30dCurrent > 0 ? (currentHired / apps30dCurrent) * 100 : 0;
    const conversionPrevious = apps30dPrevious > 0 ? (previousHired / apps30dPrevious) * 100 : 0;

    return {
      total,
      hiredCount: hiredApps.length,
      funnel: funnelWithConversion,
      timeToHireDays,
      taskCompletionDays,
      bigFiveAverages,
      current30,
      previous30,
      apps30dCurrent,
      apps30dPrevious,
      currentHired,
      previousHired,
      conversionCurrent,
      conversionPrevious,
    };
  }, [applications]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-10 h-10 text-primary-600" />
      </div>
    );
  }

  if (stats.total === 0) {
    return (
      <div className="p-12 rounded-3xl bg-white border border-black/[0.06] text-center">
        <p className="text-5xl mb-4">📊</p>
        <h3 className="text-xl font-bold text-[#1d1d1f] mb-2">Noch keine Bewerbungen</h3>
        <p className="text-[#515154] max-w-md mx-auto">
          Sobald die ersten Bewerbungen über das öffentliche Formular reinkommen, zeigt diese Ansicht
          Funnel-Conversion, Zeit-zu-Hire und durchschnittliches Bewerber-Profil.
        </p>
      </div>
    );
  }

  const apps30dChange = pctChange(stats.apps30dCurrent, stats.apps30dPrevious);
  const hiredChange = pctChange(stats.currentHired, stats.previousHired);
  const conversionChange = pctChange(stats.conversionCurrent, stats.conversionPrevious);

  // Headline trend hint — shown only when data warrants action
  let trendHint: string | null = null;
  if (stats.apps30dCurrent === 0 && stats.apps30dPrevious === 0) {
    trendHint = 'Keine Bewerbungen letzte 60 Tage — Funnel-URL erreichbar? Ad live?';
  } else if (stats.apps30dCurrent === 0) {
    trendHint = 'Keine Bewerbungen letzte 30 Tage — Channel checken (LinkedIn-Ad live? Job-Boards aktiv?)';
  } else if (apps30dChange !== null && apps30dChange < -40) {
    trendHint = `Trend rückläufig: ${stats.apps30dCurrent} (30d) vs ${stats.apps30dPrevious} (Vorperiode) — Ad-Budget oder Creative prüfen`;
  } else if (apps30dChange !== null && apps30dChange > 50) {
    trendHint = `Trend stark ↑: ${stats.apps30dCurrent} vs ${stats.apps30dPrevious} — Capacity für Bearbeitung sicherstellen`;
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      {/* ─── KPI Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Bewerbungen 30d"
          value={String(stats.apps30dCurrent)}
          prevValue={String(stats.apps30dPrevious)}
          changePct={apps30dChange}
        />
        <KpiCard
          label="Hires 30d"
          value={String(stats.currentHired)}
          prevValue={String(stats.previousHired)}
          changePct={hiredChange}
        />
        <KpiCard
          label="Conversion 30d"
          value={`${stats.conversionCurrent.toFixed(1)}%`}
          prevValue={`${stats.conversionPrevious.toFixed(1)}%`}
          changePct={conversionChange}
        />
        <KpiCard
          label="Time-to-Hire"
          value={stats.timeToHireDays != null ? `${stats.timeToHireDays.toFixed(1)}d` : '—'}
          changePct={null}
          invertColor
        />
      </div>

      {/* ─── Trend chart ─── */}
      <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
          <div>
            <h3 className="text-sm font-bold text-[#1d1d1f]">Bewerbungen pro Tag</h3>
            <p className="text-[11px] text-[#86868b] mt-0.5">Letzte 30 Tage · gestrichelt: Vorperiode</p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-[#515154]">
              <span className="inline-block w-3 h-0.5 bg-primary-700" /> Aktuell
            </span>
            <span className="flex items-center gap-1.5 text-[#86868b]">
              <span className="inline-block w-3 h-0.5 border-t border-dashed border-primary-700/40" /> Vor 30 Tagen
            </span>
          </div>
        </div>
        <TrendChart current={stats.current30} previous={stats.previous30} />
        {trendHint && (
          <p className="mt-3 text-xs text-secondary-600 leading-relaxed">
            <span className="font-semibold">Hinweis:</span> {trendHint}
          </p>
        )}
      </div>

      {/* ─── Funnel as stage cards ─── */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-bold text-[#1d1d1f]">Hiring Funnel</h3>
          <p className="text-[11px] text-[#86868b]">% from previous stage · Soll-Werte als Baseline</p>
        </div>
        <FunnelStageCards funnel={stats.funnel} total={stats.total} />
      </section>

      {/* ─── Secondary block: Big Five + task time ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.bigFiveAverages.length > 0 && (
          <div className="md:col-span-2 rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#1d1d1f] mb-1">Durchschn. Bewerber-Profil</h3>
            <p className="text-[11px] text-[#86868b] mb-5">Big Five — Mittelwert über alle Bewerbungen</p>
            <div className="space-y-3">
              {stats.bigFiveAverages.map(({ trait, average }) => (
                <div key={trait}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-[#1d1d1f] capitalize">{trait}</span>
                    <span className="text-xs font-semibold text-[#1d1d1f] tabular-nums">{average}%</span>
                  </div>
                  <div className="w-full bg-black/[0.04] rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary-700 transition-all duration-700"
                      style={{ width: `${average}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
          <h3 className="text-sm font-bold text-[#1d1d1f] mb-1">Task Completion</h3>
          <p className="text-[11px] text-[#86868b] mb-3">Median Tage zwischen Task-Versand und Abgabe</p>
          <p className="text-4xl font-black tracking-tight text-[#1d1d1f] tabular-nums">
            {stats.taskCompletionDays != null ? `${stats.taskCompletionDays.toFixed(1)}d` : '—'}
          </p>
          <p className="text-[11px] text-[#86868b] mt-2">
            Total hired: <span className="font-semibold text-[#1d1d1f] tabular-nums">{stats.hiredCount}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsightsView;
