import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { LoadingState } from '@/components/ui/DataStates';
import ExecutiveSummary, { type ExecRole } from './home/ExecutiveSummary';

interface HomeViewProps {
  userRole?: ExecRole;
}
import {
  Section,
  Card,
  StatCard,
  Pill,
  Button,
  Bento,
  IconAlert,
  IconCheck,
  IconClock,
  IconCash,
  IconDocument,
} from '@/components/ui/light';
import { ShinyText, MetallicShine, AnimatedCounter, GradientOrbs } from '@/components/ui/effects';

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

const BRAND_META: Record<string, { name: string; color: string }> = {
  'thiocyn':      { name: 'Thiocyn',       color: '#8b5cf6' },
  'take-a-shot':  { name: 'Take A Shot',   color: '#E09B37' },
  'dr-severin':   { name: 'Dr. Severin',   color: '#10b981' },
  'paigh':        { name: 'Paigh',         color: '#f43f5e' },
  'wristr':       { name: 'Wristr',        color: '#0ea5e9' },
  'timber-john':  { name: 'Timber & John', color: '#f97316' },
};

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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function HomeView({ userRole = 'viewer' }: HomeViewProps) {
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

  // ─── Smart Alerts ──────────────────────────────────────────────────

  type Alert = { id: string; severity: 'critical' | 'warning' | 'info'; title: string; detail: string };
  const alerts: Alert[] = [];

  const urgentDisputes = disputes.filter(d => daysUntil(d.deadline) <= 3 && daysUntil(d.deadline) >= 0);
  if (urgentDisputes.length > 0) {
    alerts.push({ id: 'dispute-deadline', severity: 'critical',
      title: `${urgentDisputes.length} Dispute${urgentDisputes.length > 1 ? 's' : ''} — Deadline in ≤3 Tagen`,
      detail: urgentDisputes.map(d => `${d.case_id} (${BRAND_META[d.brand]?.name ?? d.brand}): ${daysUntil(d.deadline)}d`).join(' · '),
    });
  }
  if (criticalTickets.length > 0) {
    alerts.push({ id: 'critical-support', severity: 'critical',
      title: `${criticalTickets.length} Critical Support-Ticket${criticalTickets.length > 1 ? 's' : ''}`,
      detail: criticalTickets.map(t => `${t.subject} (${BRAND_META[t.brand_id]?.name ?? t.brand_id})`).join(' · '),
    });
  }
  if (overdueInvoices.length > 0) {
    alerts.push({ id: 'overdue-invoices', severity: 'warning',
      title: `${overdueInvoices.length} überfällige Rechnung${overdueInvoices.length > 1 ? 'en' : ''}`,
      detail: `Gesamt: ${fmtCurrency(overdueInvoices.reduce((s, i) => s + i.amount, 0))}`,
    });
  }
  if (overdueTasks.length > 2) {
    alerts.push({ id: 'overdue-tasks', severity: 'warning',
      title: `${overdueTasks.length} überfällige Tasks`,
      detail: overdueTasks.slice(0, 3).map(t => t.title).join(', ') + (overdueTasks.length > 3 ? '...' : ''),
    });
  }
  const lowRoas = metrics.filter(m => m.roas != null && m.roas < 2.0 && (m.ad_spend ?? 0) > 0);
  if (lowRoas.length > 0) {
    alerts.push({ id: 'low-roas', severity: 'warning',
      title: `ROAS unter 2.0 bei ${lowRoas.length} Brand${lowRoas.length > 1 ? 's' : ''}`,
      detail: lowRoas.map(m => `${BRAND_META[m.brand_id]?.name ?? m.brand_id}: ${m.roas?.toFixed(1)}x`).join(' · '),
    });
  }

  return (
    <Section className="space-y-6">
      <GradientOrbs intensity="subtle" />

      {/* ── Executive Summary ── */}
      <ExecutiveSummary role={userRole} />

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lt-text-h1" style={{ fontSize: '1.5rem' }}>
            <ShinyText color="amber" speed="slow">Command Center</ShinyText>
          </h1>
          <p className="lt-text-meta mt-1">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            <span style={{ margin: '0 0.5rem', color: 'var(--light-text-muted)' }}>·</span>
            {BRANDS.length} Brands · {metrics.filter(m => m.ad_spend && m.ad_spend > 0).length} running ads
          </p>
        </div>
        <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
      </div>

      {/* ── Smart Alerts ── */}
      {alerts.filter(a => a.severity !== 'info').length > 0 && (
        <div className="space-y-2">
          {alerts.filter(a => a.severity !== 'info').map(a => (
            <Card key={a.id} padding="md">
              <div className="flex items-start gap-3">
                <span className={`lt-icon-pill ${a.severity === 'critical' ? 'lt-icon-pill-danger' : 'lt-icon-pill-warning'}`}>
                  {a.severity === 'critical' ? <IconAlert /> : <IconClock />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`lt-text-body ${a.severity === 'critical' ? 'lt-text-danger' : ''}`} style={a.severity === 'warning' ? { color: '#b35900' } : undefined}>
                    {a.title}
                  </p>
                  <p className="lt-text-meta mt-1">{a.detail}</p>
                </div>
                <Pill variant={a.severity === 'critical' ? 'danger' : 'warning'}>
                  {a.severity}
                </Pill>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Top-Level KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Ad Spend MTD" value={<AnimatedCounter value={totalAdSpend} format="currency" />} sub={`${campaigns.length} active`} size="md" />
        <StatCard label="Avg ROAS" value={avgRoas != null ? <AnimatedCounter value={avgRoas} decimals={1} suffix="x" /> : '—'} sub={avgRoas != null && avgRoas < 2 ? 'Below target' : undefined} variant={avgRoas != null && avgRoas < 2 ? 'danger' : 'default'} size="md" />
        <StatCard label="Disputes" value={<AnimatedCounter value={openDisputes} />} sub={openDisputes > 0 ? `${fmtCurrency(disputes.reduce((s, d) => s + d.amount, 0))} at risk` : 'All clear'} variant={openDisputes > 3 ? 'danger' : 'default'} size="md" />
        <StatCard label="Support" value={<AnimatedCounter value={openTickets.length} />} sub={criticalTickets.length > 0 ? `${criticalTickets.length} critical` : undefined} variant={criticalTickets.length > 0 ? 'danger' : 'default'} size="md" />
        <StatCard label="Overdue Tasks" value={<AnimatedCounter value={overdueTasks.length} />} variant={overdueTasks.length > 0 ? 'warning' : 'success'} size="md" />
        <StatCard label="Open Invoices" value={<AnimatedCounter value={openInvoiceSum} format="currency" />} sub={`${pipeline.length} items · ${overdueInvoices.length} overdue`} variant={overdueInvoices.length > 0 ? 'danger' : 'default'} size="md" />
      </div>

      {/* ── Brand Performance Grid ── */}
      <MetallicShine color="amber" intensity={0.1}>
      <Card padding="none">
        <div className="px-5 py-3.5 lt-header-divider">
          <span className="lt-text-label">Brand Performance</span>
        </div>
        <div className="lt-divide">
          {BRANDS.filter(b => b !== 'timber-john').map(b => {
            const metric = metricMap[b] ?? null;
            const bm = BRAND_META[b];
            const d = disputesByBrand(b);
            const tk = tasksByBrand(b);
            const ti = ticketsByBrand(b);
            return (
              <div key={b} className="flex items-center gap-3 py-3 px-5 hover:bg-black/[0.02] transition-colors">
                <span
                  className="w-2.5 h-8 rounded-full flex-shrink-0"
                  style={{ background: bm.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="lt-text-body">{bm.name}</p>
                  <p className="lt-text-meta mt-0.5">
                    {fmtNum(metric?.followers)} followers · Eng {fmtPct(metric?.engagement_rate)}
                  </p>
                </div>
                <div className="text-right" style={{ width: '4rem' }}>
                  <span className="lt-text-label">ROAS</span>
                  {metric?.roas != null ? (
                    <Pill variant={metric.roas >= 3 ? 'success' : metric.roas >= 2 ? 'warning' : 'danger'}>
                      {metric.roas.toFixed(1)}x
                    </Pill>
                  ) : <span className="lt-text-meta">—</span>}
                </div>
                <div className="text-right" style={{ width: '5rem' }}>
                  <span className="lt-text-label">Spend</span>
                  <p className="lt-text-meta lt-tabular">{fmtCurrency(metric?.ad_spend ?? null)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {d > 0 && <Pill variant="danger">{d}</Pill>}
                  {tk > 0 && <Pill variant="warning">{tk}</Pill>}
                  {ti > 0 && <Pill variant="blue">{ti}</Pill>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      </MetallicShine>

      {/* ── 3-Column Detail Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Column 1: Urgent Items */}
        <div className="space-y-4">
          <h3 className="lt-text-label">Requires Action</h3>

          {disputes.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="lt-text-body">Disputes</span>
                <Pill variant="danger">{disputes.length}</Pill>
              </div>
              <div className="lt-divide">
                {disputes.slice(0, 4).map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="lt-text-body truncate">{d.case_id}</p>
                      <p className="lt-text-meta">{BRAND_META[d.brand]?.name ?? d.brand} · {d.platform}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="lt-text-body lt-tabular">{d.amount} {d.currency}</p>
                      <p className="lt-text-meta" style={daysUntil(d.deadline) <= 3 ? { color: '#dc2626', fontWeight: 700 } : undefined}>
                        {daysUntil(d.deadline)}d left
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {criticalTickets.length > 0 && (
            <Card padding="md">
              <p className="lt-text-body lt-text-danger mb-3">Critical Support</p>
              <div className="lt-divide">
                {criticalTickets.slice(0, 3).map(t => (
                  <div key={t.id} className="py-2.5">
                    <p className="lt-text-body">{t.subject}</p>
                    <p className="lt-text-meta">{BRAND_META[t.brand_id]?.name ?? t.brand_id} · P{t.priority}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {overdueTasks.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-1.5 mb-3">
                <span className="lt-text-body" style={{ color: '#b35900' }}>Overdue Tasks</span>
                <Pill variant="warning">{overdueTasks.length}</Pill>
              </div>
              <div className="lt-divide">
                {overdueTasks.slice(0, 4).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="lt-text-body truncate">{t.title}</p>
                      <p className="lt-text-meta">{t.assigned_to_email?.split('@')[0] ?? '—'}</p>
                    </div>
                    <span className="lt-text-meta lt-text-danger shrink-0">{t.due_date}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Column 2: Performance */}
        <div className="space-y-4">
          <h3 className="lt-text-label">Performance</h3>

          <Card padding="md">
            <p className="lt-text-body mb-3">Top Campaigns</p>
            <div className="lt-divide">
              {campaigns.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="lt-text-body truncate">{c.campaign_name}</p>
                    <p className="lt-text-meta">{c.platform} · {BRAND_META[c.brand_id]?.name ?? c.brand_id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="lt-text-meta lt-tabular">{fmtCurrency(c.spend_mtd)}</span>
                    {c.roas != null && (
                      <Pill variant={c.roas >= 3 ? 'success' : c.roas >= 2 ? 'warning' : 'danger'}>
                        {c.roas.toFixed(1)}x
                      </Pill>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <p className="lt-text-body mb-3">Open Invoices</p>
            <div className="lt-divide">
              {pipeline.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="lt-text-body truncate">{p.vendor}</p>
                    <p className="lt-text-meta">{BRAND_META[p.entity]?.name ?? p.entity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="lt-text-body lt-tabular">{fmtCurrency(p.amount)}</p>
                    {p.status === 'ueberfaellig' && <Pill variant="danger">Überfällig</Pill>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Column 3: Activity */}
        <div className="space-y-4">
          <h3 className="lt-text-label">Activity</h3>
          <Card padding="md">
            {notifications.length === 0 ? (
              <div className="lt-empty">No recent activity</div>
            ) : (
              <div className="lt-divide">
                {notifications.map(n => (
                  <div key={n.id} className="flex gap-3 py-2.5 hover:bg-black/[0.02] rounded transition-colors">
                    <span
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: n.type === 'alert' ? '#dc2626' : n.type === 'dispute' ? '#d97706' : 'var(--tc-gold)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="lt-text-body">{n.title}</p>
                      {n.body && <p className="lt-text-meta mt-0.5" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</p>}
                    </div>
                    <span className="lt-text-meta lt-text-muted shrink-0">{relTime(n.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Data Sources ── */}
      <Card padding="md">
        <h3 className="lt-text-label mb-3">Connected Data Sources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[
            { name: 'Google Sheets', status: 'connected' as const, detail: 'Offene Posten, KPIs' },
            { name: 'Instagram', status: 'connected' as const, detail: 'Thiocyn live' },
            { name: 'Supabase', status: 'connected' as const, detail: `${metrics.length} brands tracked` },
            { name: 'Shopify', status: 'blocked' as const, detail: 'Permissions needed' },
            { name: 'Meta Ads', status: 'blocked' as const, detail: 'OAuth pending' },
            { name: 'GetKlar', status: 'blocked' as const, detail: 'API Key invalid' },
            { name: 'Notion', status: 'connected' as const, detail: 'Tasks + Wikis' },
            { name: 'Apple Mail', status: 'connected' as const, detail: '4 inboxen' },
            { name: 'PayPal', status: 'blocked' as const, detail: 'API Keys needed' },
            { name: 'Klaviyo', status: 'planned' as const, detail: 'Email marketing' },
            { name: 'Amazon', status: 'planned' as const, detail: 'Marketplace orders' },
            { name: 'Firecrawl', status: 'connected' as const, detail: 'Competitor scraping' },
          ].map(src => (
            <div
              key={src.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{
                background: src.status === 'connected' ? 'rgba(26,138,46,0.06)' : src.status === 'blocked' ? 'rgba(217,119,6,0.06)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${src.status === 'connected' ? 'rgba(26,138,46,0.2)' : src.status === 'blocked' ? 'rgba(217,119,6,0.2)' : 'rgba(0,0,0,0.06)'}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: src.status === 'connected' ? '#1a8a2e' : src.status === 'blocked' ? '#d97706' : 'var(--light-text-muted)',
                }}
              />
              <div className="min-w-0">
                <p className="lt-text-body" style={{ fontSize: '0.6875rem' }}>{src.name}</p>
                <p className="lt-text-meta" style={{ fontSize: '0.625rem' }}>{src.detail}</p>
              </div>
            </div>
          ))}
        </div>
        {syncs.length > 0 && (
          <p className="lt-text-meta lt-text-muted mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            Last sync: {syncs[0].source.replace(/_/g, ' ')} — {relTime(syncs[0].synced_at)} ago ({syncs[0].records_synced} records)
          </p>
        )}
      </Card>
    </Section>
  );
}
