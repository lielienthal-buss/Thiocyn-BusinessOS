import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LoadingState } from '@/components/ui/DataStates';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrandMetric {
  brand_id: string;
  followers: number | null;
  engagement_rate: number | null;
  roas: number | null;
  ad_spend: number | null;
  sop_phase: number | null;
}

interface Dispute { id: string; brand: string; case_id: string; platform: string; amount: number; currency: string; deadline: string; status: string; }
interface TeamTask { id: string; title: string; assigned_to_email: string; brand: string; priority: number; due_date: string; status: string; }
interface Notification { id: string; title: string; body: string; created_at: string; type: string; }
interface SupportTicket { id: string; brand_id: string; subject: string; status: string; priority: number; created_at: string; }
interface AdCampaign { id: string; brand_id: string; campaign_name: string; spend_mtd: number | null; roas: number | null; status: string; platform: string; }
interface PipelineItem { id: string; vendor: string; amount: number; currency: string; entity: string; status: string; due_date: string | null; }
interface SyncEntry { id: string; source: string; status: string; records_synced: number; synced_at: string; details: string | null; }

// ─── Constants ───────────────────────────────────────────────────────────────

const BRANDS = ['thiocyn', 'take-a-shot', 'dr-severin', 'paigh', 'wristr', 'timber-john'] as const;

const BRAND_META: Record<string, { name: string; emoji: string; accent: string }> = {
  'thiocyn':      { name: 'Thiocyn',       emoji: '💊', accent: 'border-violet-500/40' },
  'take-a-shot':  { name: 'Take A Shot',   emoji: '📸', accent: 'border-amber-500/40' },
  'dr-severin':   { name: 'Dr. Severin',   emoji: '🧬', accent: 'border-emerald-500/40' },
  'paigh':        { name: 'Paigh',         emoji: '👜', accent: 'border-rose-500/40' },
  'wristr':       { name: 'Wristr',        emoji: '⌚', accent: 'border-sky-500/40' },
  'timber-john':  { name: 'Timber & John', emoji: '🪵', accent: 'border-orange-500/40' },
};

const NOTIF_ICONS: Record<string, string> = { dispute: '⚖️', task: '✅', payment: '💳', alert: '🚨', info: 'ℹ️', marketing: '📣', system: '⚙️' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | null) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};
const fmtNum = (n: number | null, d = 0) => n == null ? '—' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: d }).format(n);
const fmtPct = (n: number | null) => n == null ? '—' : `${(n * 100).toFixed(1)}%`;
const relTime = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  return `${Math.round(m / 1440)}d`;
};
const isOverdue = (d: string | null) => d ? new Date(d) < new Date(new Date().toDateString()) : false;
const daysUntil = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricBox({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className={`p-3 rounded-xl border ${alert ? 'border-red-500/30 bg-red-500/5' : 'border-white/[0.06] bg-surface-800/60'}`}>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-xl font-black mt-0.5 ${alert ? 'text-red-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BrandRow({ brandId, metric, disputes, tasks, tickets }: {
  brandId: string; metric: BrandMetric | null;
  disputes: number; tasks: number; tickets: number;
}) {
  const b = BRAND_META[brandId] ?? { name: brandId, emoji: '🏷️', accent: 'border-slate-500/40' };
  return (
    <div className={`flex items-center gap-3 py-3 px-4 border-l-2 ${b.accent} hover:bg-white/[0.02] transition-colors rounded-r-lg`}>
      <span className="text-lg">{b.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{b.name}</p>
        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
          <span>{fmtNum(metric?.followers)} followers</span>
          <span>·</span>
          <span>Eng {fmtPct(metric?.engagement_rate)}</span>
        </div>
      </div>
      {/* ROAS */}
      <div className="text-right">
        <p className="text-[9px] text-slate-500 uppercase">ROAS</p>
        {metric?.roas != null ? (
          <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
            metric.roas >= 3 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
            metric.roas >= 2 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
            'bg-red-500/15 text-red-400 border-red-500/20'
          }`}>
            {metric.roas.toFixed(1)}x
          </span>
        ) : <span className="text-xs text-slate-600">—</span>}
      </div>
      {/* Ad Spend */}
      <div className="text-right w-16">
        <p className="text-[9px] text-slate-500 uppercase">Spend</p>
        <p className="text-xs font-semibold text-slate-300">{fmtCurrency(metric?.ad_spend ?? null)}</p>
      </div>
      {/* Counters */}
      <div className="flex items-center gap-2">
        {disputes > 0 && <CountBadge count={disputes} color="red" label="disputes" />}
        {tasks > 0 && <CountBadge count={tasks} color="amber" label="tasks" />}
        {tickets > 0 && <CountBadge count={tickets} color="blue" label="tickets" />}
      </div>
    </div>
  );
}

function CountBadge({ count, color, label }: { count: number; color: string; label: string }) {
  const cls: Record<string, string> = {
    red: 'bg-red-500/15 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  };
  return (
    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${cls[color]}`} title={`${count} ${label}`}>
      {count}
    </span>
  );
}

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
        <span className="w-4 h-px bg-amber-500/40 inline-block" />
        {children}
      </h3>
      {action}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomeView() {
  const [metrics, setMetrics] = useState<BrandMetric[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [syncs, setSyncs] = useState<SyncEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [m, d, t, s, c, p, n, sy] = await Promise.all([
      supabase.from('brand_metrics').select('*').in('brand_id', BRANDS as unknown as string[]),
      supabase.from('disputes').select('*').neq('status', 'resolved').neq('status', 'closed').order('deadline'),
      supabase.from('team_tasks').select('*').neq('status', 'done').order('priority', { ascending: false }).limit(20),
      supabase.from('support_tickets').select('*').neq('status', 'resolved').neq('status', 'closed').order('priority', { ascending: false }).limit(20),
      supabase.from('ad_campaigns').select('*').eq('status', 'active').order('spend_mtd', { ascending: false }),
      supabase.from('finance_pipeline').select('*').in('status', ['offen', 'ueberfaellig']).order('due_date'),
      supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8),
      supabase.from('sync_log').select('*').order('synced_at', { ascending: false }).limit(10),
    ]);
    setMetrics((m.data ?? []) as BrandMetric[]);
    setDisputes((d.data ?? []) as Dispute[]);
    setTasks((t.data ?? []) as TeamTask[]);
    setTickets((s.data ?? []) as SupportTicket[]);
    setCampaigns((c.data ?? []) as AdCampaign[]);
    setPipeline((p.data ?? []) as PipelineItem[]);
    setNotifications((n.data ?? []) as Notification[]);
    setSyncs((sy.data ?? []) as SyncEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingState label="Loading Command Center..." />;

  // ─── Derived stats ─────────────────────────────────────────────────

  const metricMap = Object.fromEntries(metrics.map(m => [m.brand_id, m]));
  const totalAdSpend = metrics.reduce((s, m) => s + (m.ad_spend ?? 0), 0);
  const avgRoas = (() => {
    const withRoas = metrics.filter(m => m.roas != null);
    return withRoas.length ? withRoas.reduce((s, m) => s + (m.roas ?? 0), 0) / withRoas.length : null;
  })();
  const openDisputes = disputes.length;
  const overdueTasks = tasks.filter(t => isOverdue(t.due_date));
  const openTickets = tickets.filter(t => t.status === 'open');
  const criticalTickets = tickets.filter(t => t.priority >= 4);
  const overdueInvoices = pipeline.filter(p => p.status === 'ueberfaellig');
  const openInvoiceSum = pipeline.reduce((s, p) => s + p.amount, 0);

  const disputesByBrand = (b: string) => disputes.filter(d => d.brand === b).length;
  const tasksByBrand = (b: string) => tasks.filter(t => t.brand === b && t.status !== 'done').length;
  const ticketsByBrand = (b: string) => tickets.filter(t => t.brand_id === b).length;

  // ─── Smart Alerts (rule-based, no AI) ──────────────────────────────

  type Alert = { id: string; severity: 'critical' | 'warning' | 'info'; icon: string; title: string; detail: string };
  const alerts: Alert[] = [];

  // Dispute deadlines within 3 days
  const urgentDisputes = disputes.filter(d => daysUntil(d.deadline) <= 3 && daysUntil(d.deadline) >= 0);
  if (urgentDisputes.length > 0) {
    alerts.push({ id: 'dispute-deadline', severity: 'critical', icon: '⚖️',
      title: `${urgentDisputes.length} Dispute${urgentDisputes.length > 1 ? 's' : ''} — Deadline in ≤3 Tagen`,
      detail: urgentDisputes.map(d => `${d.case_id} (${BRAND_META[d.brand]?.name ?? d.brand}): ${daysUntil(d.deadline)}d`).join(' · '),
    });
  }

  // Critical support tickets
  if (criticalTickets.length > 0) {
    alerts.push({ id: 'critical-support', severity: 'critical', icon: '🚨',
      title: `${criticalTickets.length} Critical Support-Ticket${criticalTickets.length > 1 ? 's' : ''}`,
      detail: criticalTickets.map(t => `${t.subject} (${BRAND_META[t.brand_id]?.name ?? t.brand_id})`).join(' · '),
    });
  }

  // Overdue invoices
  if (overdueInvoices.length > 0) {
    alerts.push({ id: 'overdue-invoices', severity: 'warning', icon: '💰',
      title: `${overdueInvoices.length} überfällige Rechnung${overdueInvoices.length > 1 ? 'en' : ''}`,
      detail: `Gesamt: ${fmtCurrency(overdueInvoices.reduce((s, i) => s + i.amount, 0))}`,
    });
  }

  // Overdue tasks
  if (overdueTasks.length > 2) {
    alerts.push({ id: 'overdue-tasks', severity: 'warning', icon: '📋',
      title: `${overdueTasks.length} überfällige Tasks`,
      detail: overdueTasks.slice(0, 3).map(t => t.title).join(', ') + (overdueTasks.length > 3 ? '...' : ''),
    });
  }

  // ROAS below target for any brand
  const lowRoas = metrics.filter(m => m.roas != null && m.roas < 2.0 && (m.ad_spend ?? 0) > 0);
  if (lowRoas.length > 0) {
    alerts.push({ id: 'low-roas', severity: 'warning', icon: '📉',
      title: `ROAS unter 2.0 bei ${lowRoas.length} Brand${lowRoas.length > 1 ? 's' : ''}`,
      detail: lowRoas.map(m => `${BRAND_META[m.brand_id]?.name ?? m.brand_id}: ${m.roas?.toFixed(1)}x`).join(' · '),
    });
  }

  // No alerts = good news
  if (alerts.length === 0) {
    alerts.push({ id: 'all-clear', severity: 'info', icon: '✅', title: 'Alles im grünen Bereich', detail: 'Keine dringenden Aktionen.' });
  }

  return (
    <div className="p-4 sm:p-6 animate-[fadeIn_0.4s_ease-out] space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            <span className="ml-2 text-slate-600">·</span>
            <span className="ml-2">{BRANDS.length} Brands · {metrics.filter(m => m.ad_spend && m.ad_spend > 0).length} running ads</span>
          </p>
        </div>
        <button onClick={fetchAll} className="text-xs text-slate-500 hover:text-amber-400 transition-colors">↻ Refresh</button>
      </div>

      {/* ── Smart Alerts ── */}
      {alerts.filter(a => a.severity !== 'info').length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => a.severity !== 'info').map(a => (
            <div key={a.id} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
              a.severity === 'critical'
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}>
              <span className="text-lg shrink-0 mt-0.5">{a.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${a.severity === 'critical' ? 'text-red-400' : 'text-amber-400'}`}>
                  {a.title}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{a.detail}</p>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                a.severity === 'critical'
                  ? 'bg-red-500/15 text-red-400 border-red-500/20'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
              }`}>
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Top-Level KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricBox label="Total Ad Spend MTD" value={fmtCurrency(totalAdSpend)} sub={`${campaigns.length} active campaigns`} />
        <MetricBox label="Avg ROAS" value={avgRoas != null ? `${avgRoas.toFixed(1)}x` : '—'} sub={avgRoas != null && avgRoas < 2 ? '⚠️ Below target' : undefined} alert={avgRoas != null && avgRoas < 2} />
        <MetricBox label="Open Disputes" value={String(openDisputes)} sub={openDisputes > 0 ? `${fmtCurrency(disputes.reduce((s, d) => s + d.amount, 0))} at risk` : 'All clear'} alert={openDisputes > 3} />
        <MetricBox label="Support Queue" value={String(openTickets.length)} sub={criticalTickets.length > 0 ? `${criticalTickets.length} critical` : undefined} alert={criticalTickets.length > 0} />
        <MetricBox label="Overdue Tasks" value={String(overdueTasks.length)} alert={overdueTasks.length > 0} />
        <MetricBox label="Open Invoices" value={fmtCurrency(openInvoiceSum)} sub={`${pipeline.length} items · ${overdueInvoices.length} overdue`} alert={overdueInvoices.length > 0} />
      </div>

      {/* ── Brand Performance Grid ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface-800/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] bg-surface-900/40">
          <p className="text-xs font-black text-white uppercase tracking-wider">Brand Performance</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {BRANDS.filter(b => b !== 'timber-john').map(b => (
            <BrandRow
              key={b}
              brandId={b}
              metric={metricMap[b] ?? null}
              disputes={disputesByBrand(b)}
              tasks={tasksByBrand(b)}
              tickets={ticketsByBrand(b)}
            />
          ))}
        </div>
      </div>

      {/* ── 3-Column Detail Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Column 1: Urgent Items */}
        <div className="space-y-4">
          <SectionHeader>Requires Action</SectionHeader>

          {/* Disputes */}
          {disputes.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-surface-800/60 p-4 space-y-2">
              <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">⚖️ Disputes <CountBadge count={disputes.length} color="red" label="" /></p>
              {disputes.slice(0, 4).map(d => (
                <div key={d.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200 font-medium truncate">{d.case_id}</p>
                    <p className="text-[10px] text-slate-500">{BRAND_META[d.brand]?.name ?? d.brand} · {d.platform}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-300">{d.amount} {d.currency}</p>
                    <p className={`text-[10px] ${daysUntil(d.deadline) <= 3 ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                      {daysUntil(d.deadline)}d left
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Critical Support */}
          {criticalTickets.length > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
              <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">🚨 Critical Support</p>
              {criticalTickets.slice(0, 3).map(t => (
                <div key={t.id} className="py-1.5 border-b border-red-500/10 last:border-0">
                  <p className="text-xs text-slate-200 font-medium">{t.subject}</p>
                  <p className="text-[10px] text-slate-500">{BRAND_META[t.brand_id]?.name ?? t.brand_id} · P{t.priority}</p>
                </div>
              ))}
            </div>
          )}

          {/* Overdue Tasks */}
          {overdueTasks.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">🔴 Overdue Tasks <CountBadge count={overdueTasks.length} color="amber" label="" /></p>
              {overdueTasks.slice(0, 4).map(t => (
                <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-amber-500/10 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200 truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-500">{t.assigned_to_email?.split('@')[0] ?? '—'}</p>
                  </div>
                  <span className="text-[10px] text-red-400 shrink-0">{t.due_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Ad Performance + Finance */}
        <div className="space-y-4">
          <SectionHeader>Performance</SectionHeader>

          {/* Top Campaigns */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-800/60 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">📊 Top Campaigns</p>
            {campaigns.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 font-medium truncate">{c.campaign_name}</p>
                  <p className="text-[10px] text-slate-500">{c.platform} · {BRAND_META[c.brand_id]?.name ?? c.brand_id}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-slate-500">{fmtCurrency(c.spend_mtd)}</span>
                  {c.roas != null && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                      c.roas >= 3 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
                      c.roas >= 2 ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' :
                      'bg-red-500/15 text-red-400 border-red-500/20'
                    }`}>
                      {c.roas.toFixed(1)}x
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Finance Snapshot */}
          <div className="rounded-xl border border-white/[0.06] bg-surface-800/60 p-4 space-y-2">
            <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5">💰 Open Invoices</p>
            {pipeline.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 truncate">{p.vendor}</p>
                  <p className="text-[10px] text-slate-500">{BRAND_META[p.entity]?.name ?? p.entity}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-slate-300">{fmtCurrency(p.amount)}</p>
                  {p.status === 'ueberfaellig' && <p className="text-[10px] text-red-400 font-bold">Überfällig</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Activity Feed */}
        <div className="space-y-4">
          <SectionHeader>Activity</SectionHeader>
          <div className="rounded-xl border border-white/[0.06] bg-surface-800/60 p-4 space-y-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-4">No recent activity</p>
            ) : notifications.map(n => (
              <div key={n.id} className="flex gap-3 py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded transition-colors">
                <span className="text-base shrink-0 mt-0.5">{NOTIF_ICONS[n.type] ?? '📌'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200">{n.title}</p>
                  {n.body && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                </div>
                <span className="text-[10px] text-slate-600 shrink-0 mt-0.5">{relTime(n.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Data Sources ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface-800/40 p-4">
        <SectionHeader>Connected Data Sources</SectionHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            { name: 'Google Sheets', icon: '📊', status: 'connected' as const, detail: 'Offene Posten, KPIs' },
            { name: 'Instagram', icon: '📸', status: 'connected' as const, detail: 'Thiocyn live' },
            { name: 'Supabase', icon: '🗄️', status: 'connected' as const, detail: `${metrics.length} brands tracked` },
            { name: 'Shopify', icon: '🛒', status: 'blocked' as const, detail: 'Permissions needed' },
            { name: 'Meta Ads', icon: '📢', status: 'blocked' as const, detail: 'OAuth pending' },
            { name: 'GetKlar', icon: '📈', status: 'blocked' as const, detail: 'API Key invalid' },
            { name: 'Notion', icon: '📓', status: 'connected' as const, detail: 'Tasks + Wikis' },
            { name: 'Apple Mail', icon: '📧', status: 'connected' as const, detail: '4 inboxen' },
            { name: 'PayPal', icon: '💳', status: 'blocked' as const, detail: 'API Keys needed' },
            { name: 'Klaviyo', icon: '✉️', status: 'planned' as const, detail: 'Email marketing' },
            { name: 'Amazon', icon: '📦', status: 'planned' as const, detail: 'Marketplace orders' },
            { name: 'Firecrawl', icon: '🔥', status: 'connected' as const, detail: 'Competitor scraping' },
          ].map(src => (
            <div key={src.name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              src.status === 'connected' ? 'border-emerald-500/20 bg-emerald-500/5' :
              src.status === 'blocked' ? 'border-amber-500/20 bg-amber-500/5' :
              'border-white/[0.06] bg-white/[0.02]'
            }`}>
              <span className="text-sm">{src.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-200 truncate">{src.name}</p>
                <p className={`text-[9px] truncate ${
                  src.status === 'connected' ? 'text-emerald-400' :
                  src.status === 'blocked' ? 'text-amber-400' :
                  'text-slate-500'
                }`}>
                  {src.status === 'connected' ? '● ' : src.status === 'blocked' ? '⚠ ' : '○ '}
                  {src.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
        {/* Last sync info */}
        {syncs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-[9px] text-slate-600">
              Last sync: {syncs[0].source.replace(/_/g, ' ')} — {relTime(syncs[0].synced_at)} ago ({syncs[0].records_synced} records)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
