import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExecRole = 'owner' | 'admin' | 'staff' | 'intern_lead' | 'viewer';

interface ExecutiveSummaryProps {
  role: ExecRole;
}

interface SummaryCard {
  label: string;
  value: string;
  sub?: string;
}

interface Metrics {
  blendedRoas: number | null;
  totalAdSpendMtd: number;
  crossBrandRevenueMtd: number;
  activeCampaigns: number;
  openUrgentTasks: number;
  openDisputes: number;
  openIsoIncidents: number;
  pendingBriefApprovals: number;
  underTargetCampaigns: number;
  adSpendPacePct: number | null;
  openApplications: number;
  pendingInternTasks: number;
  academyCompletionsWeek: number;
  newRubricsSubmitted: number;
  monthlyPnlStatus: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | null) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
};

const fmtNum = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('de-DE').format(n);

const monthBounds = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

const weekBounds = () => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  return { start: start.toISOString(), end: now.toISOString() };
};

// ─── Data loader ─────────────────────────────────────────────────────────────

async function loadMetrics(activeBrandId: string | null): Promise<Metrics> {
  const { start: mStart, end: mEnd } = monthBounds();
  const { start: wStart } = weekBounds();

  const m: Metrics = {
    blendedRoas: null,
    totalAdSpendMtd: 0,
    crossBrandRevenueMtd: 0,
    activeCampaigns: 0,
    openUrgentTasks: 0,
    openDisputes: 0,
    openIsoIncidents: 0,
    pendingBriefApprovals: 0,
    underTargetCampaigns: 0,
    adSpendPacePct: null,
    openApplications: 0,
    pendingInternTasks: 0,
    academyCompletionsWeek: 0,
    newRubricsSubmitted: 0,
    monthlyPnlStatus: '—',
  };

  // When scoped to a brand, pre-fetch its campaign IDs so downstream queries can filter.
  let brandCampaignIds: string[] | null = null;
  if (activeBrandId) {
    const { data: bcRes } = await supabase
      .from('campaigns')
      .select('id')
      .eq('brand_id', activeBrandId);
    brandCampaignIds = (bcRes ?? []).map((r: { id: string }) => r.id);
    // If brand has zero campaigns, skip KPI aggregation entirely
    if (brandCampaignIds.length === 0) {
      return {
        ...m,
        monthlyPnlStatus: '—',
      };
    }
  }

  // campaign_kpis MTD aggregate — scoped by brand if applicable
  let kpisQuery = supabase
    .from('campaign_kpis')
    .select('campaign_id, spend, revenue, roas, snapshot_date')
    .gte('snapshot_date', mStart)
    .lte('snapshot_date', mEnd);
  if (brandCampaignIds) kpisQuery = kpisQuery.in('campaign_id', brandCampaignIds);
  const { data: kpis } = await kpisQuery;

  if (kpis && kpis.length > 0) {
    let totalSpend = 0;
    let totalRev = 0;
    kpis.forEach((k: any) => {
      totalSpend += Number(k.spend ?? 0);
      totalRev += Number(k.revenue ?? 0);
    });
    m.totalAdSpendMtd = totalSpend;
    m.crossBrandRevenueMtd = totalRev;
    m.blendedRoas = totalSpend > 0 ? totalRev / totalSpend : null;

    // Under-target: count campaigns whose latest (this month) ROAS < 2.0
    const latestByCampaign: Record<string, { date: string; roas: number | null }> = {};
    kpis.forEach((k: any) => {
      const prev = latestByCampaign[k.campaign_id];
      if (!prev || k.snapshot_date > prev.date) {
        latestByCampaign[k.campaign_id] = { date: k.snapshot_date, roas: k.roas != null ? Number(k.roas) : null };
      }
    });
    m.underTargetCampaigns = Object.values(latestByCampaign).filter(
      (v) => v.roas != null && v.roas < 2.0,
    ).length;
  }

  // active campaigns (optionally brand-scoped)
  let liveQuery = supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'live');
  if (activeBrandId) liveQuery = liveQuery.eq('brand_id', activeBrandId);
  const { count: liveCount } = await liveQuery;
  m.activeCampaigns = liveCount ?? 0;

  // Pending brief approvals (optionally brand-scoped)
  let briefQuery = supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'brief_review');
  if (activeBrandId) briefQuery = briefQuery.eq('brand_id', activeBrandId);
  const { count: briefCount } = await briefQuery;
  m.pendingBriefApprovals = briefCount ?? 0;

  // Urgent/open tasks — team_tasks has numeric priority; treat priority>=4 OR status='open' as "urgent"
  const { data: urgentTasks } = await supabase
    .from('team_tasks')
    .select('id, priority, status')
    .neq('status', 'done');
  if (urgentTasks) {
    m.openUrgentTasks = urgentTasks.filter(
      (t: any) => (t.priority != null && t.priority >= 4) || t.status === 'open',
    ).length;
    m.pendingInternTasks = urgentTasks.length;
  }

  // Disputes (optionally brand-scoped — column may not exist)
  try {
    let dispQuery = supabase
      .from('disputes')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'pending']);
    if (activeBrandId) dispQuery = dispQuery.eq('brand_id', activeBrandId);
    const { count: dispCount, error: dispErr } = await dispQuery;
    if (dispErr && activeBrandId) {
      // Fallback: column doesn't exist, fetch unfiltered total
      const { count: allCount } = await supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .in('status', ['open', 'pending']);
      m.openDisputes = allCount ?? 0;
    } else {
      m.openDisputes = dispCount ?? 0;
    }
  } catch {
    m.openDisputes = 0;
  }

  // ISO incidents (non-resolved)
  const { data: incidents } = await supabase
    .from('security_incidents')
    .select('id, status');
  if (incidents) {
    m.openIsoIncidents = incidents.filter(
      (i: any) => i.status !== 'resolved' && i.status !== 'closed',
    ).length;
  }

  // Applications
  const { data: apps } = await supabase
    .from('applications')
    .select('id, status');
  if (apps) {
    m.openApplications = apps.filter(
      (a: any) => a.status !== 'rejected' && a.status !== 'hired',
    ).length;
  }

  // Academy completions (best-effort — table may not exist yet)
  try {
    const { count: compCount } = await supabase
      .from('academy_progress')
      .select('id', { count: 'exact', head: true })
      .gte('completed_at', wStart);
    m.academyCompletionsWeek = compCount ?? 0;
  } catch {
    m.academyCompletionsWeek = 0;
  }

  // Monthly Report Status — current month in monthly_reports
  try {
    const monthStart = mStart; // YYYY-MM-01
    const { data: mr } = await supabase
      .from('monthly_reports')
      .select('status, paypal_statement_received')
      .eq('month', monthStart)
      .maybeSingle();
    if (!mr) {
      m.monthlyPnlStatus = '🔴 Ausstehend';
    } else if ((mr as any).status === 'sent' && (mr as any).paypal_statement_received === true) {
      m.monthlyPnlStatus = '🟢 Abgeschlossen';
    } else {
      m.monthlyPnlStatus = '🟡 In Bearbeitung';
    }
  } catch {
    m.monthlyPnlStatus = '—';
  }

  // Ad Spend Pace — (actual MTD / expected by today) × 100
  try {
    let liveCampQuery = supabase
      .from('campaigns')
      .select('budget_planned')
      .eq('status', 'live');
    if (activeBrandId) liveCampQuery = liveCampQuery.eq('brand_id', activeBrandId);
    const { data: liveCampaigns } = await liveCampQuery;
    const dailyBudgetSum = (liveCampaigns ?? []).reduce(
      (s: number, c: any) => s + Number(c.budget_planned ?? 0),
      0,
    );
    const now = new Date();
    const dayOfMonth = now.getDate();
    const expectedByToday = dailyBudgetSum * dayOfMonth;
    // actual MTD spend already aggregated in m.totalAdSpendMtd
    if (expectedByToday > 0) {
      m.adSpendPacePct = (m.totalAdSpendMtd / expectedByToday) * 100;
    } else {
      m.adSpendPacePct = null;
    }
  } catch {
    m.adSpendPacePct = null;
  }

  // Pending Reviews — intern_assignments submitted but not reviewed
  try {
    const { count: pendingCount } = await supabase
      .from('intern_assignments')
      .select('id', { count: 'exact', head: true })
      .not('submitted_at', 'is', null)
      .is('reviewed_at', null);
    m.newRubricsSubmitted = pendingCount ?? 0;
  } catch {
    m.newRubricsSubmitted = 0;
  }

  return m;
}

// ─── Card ────────────────────────────────────────────────────────────────────

const Card: React.FC<SummaryCard> = ({ label, value, sub }) => (
  <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-5 hover:ring-slate-300 transition-shadow">
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
  </div>
);

// ─── Role variants ───────────────────────────────────────────────────────────

function cardsForRole(role: ExecRole, m: Metrics): SummaryCard[] {
  switch (role) {
    case 'owner':
      return [
        {
          label: 'Blended ROAS (MTD)',
          value: m.blendedRoas != null ? `${m.blendedRoas.toFixed(2)}x` : '—',
          sub: m.blendedRoas != null && m.blendedRoas < 2 ? 'Below target' : undefined,
        },
        { label: 'Total Ad Spend MTD', value: fmtCurrency(m.totalAdSpendMtd) },
        { label: 'Cross-Brand Revenue MTD', value: fmtCurrency(m.crossBrandRevenueMtd) },
        { label: 'Active Campaigns', value: fmtNum(m.activeCampaigns) },
        { label: 'Open 🔴 Tasks', value: fmtNum(m.openUrgentTasks) },
      ];
    case 'admin':
      return [
        { label: 'Cross-Brand Revenue MTD', value: fmtCurrency(m.crossBrandRevenueMtd) },
        { label: 'Monthly Report Status', value: m.monthlyPnlStatus },
        { label: 'Open Disputes', value: fmtNum(m.openDisputes) },
        { label: 'Open ISO Incidents', value: fmtNum(m.openIsoIncidents) },
      ];
    case 'staff': {
      const pace = m.adSpendPacePct;
      let paceValue = '—';
      let paceSub: string | undefined = 'of monthly budget';
      if (pace != null) {
        let dot = '🟡';
        let label = 'On-pace';
        if (pace < 90) { dot = '🟢'; label = 'Under-pace'; }
        else if (pace > 110) { dot = '🔴'; label = 'Over-pace'; }
        paceValue = `${dot} ${pace.toFixed(0)}%`;
        paceSub = label;
      }
      return [
        {
          label: 'Blended ROAS',
          value: m.blendedRoas != null ? `${m.blendedRoas.toFixed(2)}x` : '—',
        },
        { label: 'Pending Brief Approvals', value: fmtNum(m.pendingBriefApprovals) },
        { label: 'Under-Target Campaigns', value: fmtNum(m.underTargetCampaigns) },
        { label: 'Ad Spend Pace', value: paceValue, sub: paceSub },
      ];
    }
    case 'intern_lead':
      return [
        { label: 'Open Applications', value: fmtNum(m.openApplications) },
        { label: 'Pending Intern Tasks', value: fmtNum(m.pendingInternTasks) },
        { label: 'Academy Completions (week)', value: fmtNum(m.academyCompletionsWeek) },
        { label: 'Pending Reviews', value: fmtNum(m.newRubricsSubmitted) },
      ];
    default:
      return [
        {
          label: 'Blended ROAS (MTD)',
          value: m.blendedRoas != null ? `${m.blendedRoas.toFixed(2)}x` : '—',
        },
        { label: 'Active Campaigns', value: fmtNum(m.activeCampaigns) },
      ];
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ role }) => {
  const { activeBrand } = useBrand();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMetrics(null);
    loadMetrics(activeBrand?.id ?? null)
      .then((m) => {
        if (!cancelled) setMetrics(m);
      })
      .catch(() => {
        if (!cancelled) setMetrics(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBrand]);

  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl ring-1 ring-slate-200 bg-white p-5 animate-pulse h-[96px]"
          />
        ))}
      </div>
    );
  }

  const cards = cardsForRole(role, metrics);
  const cols =
    cards.length >= 5
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid ${cols} gap-3`}>
      {cards.map((c) => (
        <Card key={c.label} {...c} />
      ))}
    </div>
  );
};

export default ExecutiveSummary;
