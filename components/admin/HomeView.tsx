import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Dispute {
  id: string;
  brand: string;
  case_id: string;
  platform: string;
  amount: number;
  currency: string;
  deadline: string;
  status: 'open' | 'pending' | 'resolved';
  notes?: string;
}

interface TeamTask {
  id: string;
  title: string;
  assigned_to_email: string;
  brand: string;
  priority: number;
  due_date: string;
  status: string;
  created_at: string;
}

interface BrandMetric {
  brand_id: string;
  followers: number;
  engagement_rate: number;
  sop_phase: number;
  roas: number;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  created_at: string;
  type: string;
}

interface NewTaskForm {
  title: string;
  assigned_to_email: string;
  brand: string;
  due_date: string;
  priority: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANDS = [
  'thiocyn',
  'take-a-shot',
  'dr-severin',
  'paigh',
  'wristr',
  'timber-john',
] as const;

const BRAND_LABELS: Record<string, string> = {
  'thiocyn': 'Thiocyn',
  'take-a-shot': 'Take A Shot',
  'dr-severin': 'Dr. Severin',
  'paigh': 'Paigh',
  'wristr': 'Wristr',
  'timber-john': 'Timber & John',
};

const NOTIFICATION_ICONS: Record<string, string> = {
  dispute: '⚖️',
  task: '✅',
  payment: '💳',
  alert: '🚨',
  info: 'ℹ️',
  marketing: '📣',
  system: '⚙️',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'bg-slate-600',
  2: 'bg-sky-500',
  3: 'bg-amber-400',
  4: 'bg-orange-500',
  5: 'bg-red-500',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Normal',
  3: 'Medium',
  4: 'High',
  5: 'Critical',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

function formatFollowers(n: number): string {
  if (!n) return '--';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const BRAND_ACCENT: Record<string, string> = {
  'thiocyn':     'border-violet-500/60',
  'take-a-shot': 'border-amber-500/60',
  'dr-severin':  'border-emerald-500/60',
  'paigh':       'border-rose-500/60',
  'wristr':      'border-sky-500/60',
  'timber-john': 'border-orange-500/60',
};

function roasColor(roas: number): string {
  if (!roas) return 'bg-white/5 text-slate-500';
  if (roas >= 3) return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
  if (roas >= 2) return 'bg-amber-500/15 text-amber-400 border border-amber-500/25';
  return 'bg-red-500/15 text-red-400 border border-red-500/25';
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function plusDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3">
      <span className="w-4 h-px bg-amber-500/40 inline-block" />
      {children}
    </h2>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] p-4 bg-surface-800/60 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-6 text-slate-600 text-sm">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: Dispute['status'] }) {
  const map: Record<Dispute['status'], string> = {
    open:     'bg-red-500/15 text-red-400 border border-red-500/25',
    pending:  'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    resolved: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
      {status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: number }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[priority] ?? 'bg-gray-300'}`}
      title={PRIORITY_LABELS[priority] ?? `P${priority}`}
    />
  );
}

// ─── Column 1: Urgent ─────────────────────────────────────────────────────────

const DisputeRow: React.FC<{
  dispute: Dispute;
  expanded: boolean;
  onToggle: () => void;
}> = ({ dispute, expanded, onToggle }) => {
  const days = daysUntil(dispute.deadline);
  const isUrgent = days <= 7;

  return (
    <div
      className="border-b border-white/[0.05] last:border-0 cursor-pointer hover:bg-white/[0.03] transition-colors rounded-lg"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between py-2 px-1 gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-200 truncate">{dispute.case_id}</span>
            <span className="text-xs text-slate-500">{BRAND_LABELS[dispute.brand] ?? dispute.brand}</span>
            <span className="text-xs text-slate-600">{dispute.platform}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-semibold text-slate-300">
              {dispute.amount} {dispute.currency}
            </span>
            <span className={`text-xs font-medium ${isUrgent ? 'text-red-400' : 'text-slate-500'}`}>
              {days < 0
                ? `${Math.abs(days)}d overdue`
                : days === 0
                ? 'Due today'
                : `${days}d left`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={dispute.status} />
          <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && dispute.notes && (
        <div className="px-1 pb-2">
          <p className="text-xs text-slate-400 bg-white/[0.04] rounded-lg p-2">{dispute.notes}</p>
        </div>
      )}
      {expanded && !dispute.notes && (
        <div className="px-1 pb-2">
          <p className="text-xs text-slate-600 italic">No notes attached.</p>
        </div>
      )}
    </div>
  );
}

const OverdueTaskRow: React.FC<{ task: TeamTask }> = ({ task }) => {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] rounded transition-colors">
      <PriorityDot priority={task.priority} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200 truncate">{task.title}</p>
        <p className="text-xs text-slate-500 truncate">
          {task.assigned_to_email} · {BRAND_LABELS[task.brand] ?? task.brand}
        </p>
      </div>
      <span className="text-xs text-red-400 flex-shrink-0">{formatDate(task.due_date)}</span>
    </div>
  );
}

// ─── Column 2: This Week ──────────────────────────────────────────────────────

const WeekTaskGroup: React.FC<{ brand: string; tasks: TeamTask[] }> = ({ brand, tasks }) => {
  return (
    <div className="mb-3 last:mb-0">
      <p className={`text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 pl-2 border-l-2 ${BRAND_ACCENT[brand] ?? 'border-slate-600'}`}>
        {BRAND_LABELS[brand] ?? brand}
      </p>
      {tasks.map((t) => (
        <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
          <PriorityDot priority={t.priority} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-300 truncate">{t.title}</p>
            <p className="text-xs text-slate-500 truncate">{t.assigned_to_email}</p>
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(t.due_date)}</span>
        </div>
      ))}
    </div>
  );
}

const UpcomingDisputeRow: React.FC<{ dispute: Dispute }> = ({ dispute }) => {
  const days = daysUntil(dispute.deadline);
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] rounded transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200 truncate">{dispute.case_id}</p>
        <p className="text-xs text-slate-500">{dispute.platform} · {BRAND_LABELS[dispute.brand] ?? dispute.brand}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-slate-500">{days}d</span>
        <StatusBadge status={dispute.status} />
      </div>
    </div>
  );
}

// ─── Column 3: Brand Pulse ────────────────────────────────────────────────────

const BrandPulseCard: React.FC<{ brandId: string; metric?: BrandMetric }> = ({ brandId, metric }) => {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0 pl-2 border-l-2 ${BRAND_ACCENT[brandId] ?? 'border-slate-600'} hover:bg-white/[0.02] transition-colors rounded-r`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-200">{BRAND_LABELS[brandId]}</p>
        <p className="text-xs text-slate-500">
          {metric ? formatFollowers(metric.followers) : '--'} followers
          {metric?.engagement_rate != null
            ? ` · ${(metric.engagement_rate * 100).toFixed(1)}% eng`
            : ''}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {metric?.sop_phase != null && (
          <span className="text-xs text-slate-500">SOP {metric.sop_phase}</span>
        )}
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            metric?.roas != null ? roasColor(metric.roas) : 'bg-white/5 text-slate-500'
          }`}
        >
          {metric?.roas != null ? `${metric.roas.toFixed(1)}x` : '--'}
        </span>
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

const ActivityItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  const icon = NOTIFICATION_ICONS[notification.type] ?? '📌';
  return (
    <div className="flex gap-3 py-3 border-b border-white/[0.05] last:border-0 hover:bg-white/[0.02] rounded transition-colors">
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-200">{notification.title}</p>
        {notification.body && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
      </div>
      <span className="text-xs text-slate-600 flex-shrink-0 mt-0.5">
        {formatRelativeTime(notification.created_at)}
      </span>
    </div>
  );
}

// ─── Add Task Quick Form ──────────────────────────────────────────────────────

function AddTaskForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<NewTaskForm>({
    title: '',
    assigned_to_email: '',
    brand: 'thiocyn',
    due_date: plusDays(3),
    priority: 2,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'priority' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { error: dbError } = await supabase.from('team_tasks').insert([
      {
        title: form.title.trim(),
        assigned_to_email: form.assigned_to_email.trim() || null,
        brand: form.brand,
        due_date: form.due_date,
        priority: form.priority,
        status: 'todo',
      },
    ]);
    setSubmitting(false);
    if (dbError) {
      setError(dbError.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div className="bg-surface-800 rounded-2xl shadow-2xl border border-white/[0.08] w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100">Add Task</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-lg leading-none transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Title *</label>
            <input
              name="title" value={form.title} onChange={handleChange}
              placeholder="What needs to be done?"
              className="w-full text-sm bg-white/[0.05] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Assign to</label>
              <input
                name="assigned_to_email" type="email" value={form.assigned_to_email} onChange={handleChange}
                placeholder="name@example.com"
                className="w-full text-sm bg-white/[0.05] border border-white/[0.08] text-slate-200 placeholder-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Brand</label>
              <select name="brand" value={form.brand} onChange={handleChange}
                className="w-full text-sm bg-surface-700 border border-white/[0.08] text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                {BRANDS.map((b) => <option key={b} value={b}>{BRAND_LABELS[b]}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Due date</label>
              <input name="due_date" type="date" value={form.due_date} onChange={handleChange}
                className="w-full text-sm bg-white/[0.05] border border-white/[0.08] text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange}
                className="w-full text-sm bg-surface-700 border border-white/[0.08] text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/30">
                {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{p} — {PRIORITY_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 text-sm border border-white/[0.08] text-slate-400 rounded-lg px-4 py-2 hover:bg-white/[0.05] hover:text-slate-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 text-sm bg-amber-500 hover:bg-amber-400 text-black rounded-lg px-4 py-2 font-bold disabled:opacity-50 transition-colors">
              {submitting ? 'Saving…' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomeView() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<TeamTask[]>([]);
  const [weekTasks, setWeekTasks] = useState<TeamTask[]>([]);
  const [brandMetrics, setBrandMetrics] = useState<BrandMetric[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const fetchAll = useCallback(async () => {
    const todayStr = today();
    const weekEnd = plusDays(7);

    const [
      disputesRes,
      overdueRes,
      weekRes,
      metricsRes,
      notifRes,
    ] = await Promise.all([
      supabase
        .from('disputes')
        .select('*')
        .neq('status', 'resolved')
        .order('deadline', { ascending: true }),
      supabase
        .from('team_tasks')
        .select('*')
        .neq('status', 'done')
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true }),
      supabase
        .from('team_tasks')
        .select('*')
        .neq('status', 'done')
        .gte('due_date', todayStr)
        .lte('due_date', weekEnd)
        .order('due_date', { ascending: true }),
      supabase
        .from('brand_metrics')
        .select('*')
        .in('brand_id', BRANDS as unknown as string[]),
      supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    setDisputes((disputesRes.data ?? []) as Dispute[]);
    setOverdueTasks((overdueRes.data ?? []) as TeamTask[]);
    setWeekTasks((weekRes.data ?? []) as TeamTask[]);
    setBrandMetrics((metricsRes.data ?? []) as BrandMetric[]);
    setNotifications((notifRes.data ?? []) as Notification[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Derived data
  const urgentDisputes = disputes.filter((d) => daysUntil(d.deadline) <= 7);
  const upcomingDisputes = disputes.filter((d) => {
    const days = daysUntil(d.deadline);
    return days > 7 && days <= 30;
  });

  const weekTasksByBrand = weekTasks.reduce<Record<string, TeamTask[]>>((acc, t) => {
    const b = t.brand || 'unassigned';
    if (!acc[b]) acc[b] = [];
    acc[b].push(t);
    return acc;
  }, {});

  const metricMap = brandMetrics.reduce<Record<string, BrandMetric>>((acc, m) => {
    acc[m.brand_id] = m;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 animate-[fadeIn_0.4s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('de-DE', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => setShowAddTask(true)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black px-4 py-2 rounded-xl transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 hover:-translate-y-0.5"
        >
          <span className="text-sm leading-none">+</span>
          Add Task
        </button>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* ── Column 1: Urgent ── */}
        <div className="space-y-4">
          <SectionTitle>Urgent</SectionTitle>

          <Card>
            <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <span>⚖️</span> Disputes
              {urgentDisputes.length > 0 && (
                <span className="ml-1 bg-red-500/20 text-red-400 border border-red-500/25 text-xs rounded-full px-1.5 py-0.5 leading-none font-black">
                  {urgentDisputes.length}
                </span>
              )}
            </p>
            {urgentDisputes.length === 0 ? (
              <EmptyState message="No urgent disputes" />
            ) : (
              urgentDisputes.map((d) => (
                <DisputeRow key={d.id} dispute={d}
                  expanded={expandedDispute === d.id}
                  onToggle={() => setExpandedDispute((prev) => (prev === d.id ? null : d.id))}
                />
              ))
            )}
          </Card>

          <Card>
            <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <span>🔴</span> Overdue Tasks
              {overdueTasks.length > 0 && (
                <span className="ml-1 bg-red-500/20 text-red-400 border border-red-500/25 text-xs rounded-full px-1.5 py-0.5 leading-none font-black">
                  {overdueTasks.length}
                </span>
              )}
            </p>
            {overdueTasks.length === 0 ? (
              <EmptyState message="No overdue tasks" />
            ) : (
              overdueTasks.map((t) => <OverdueTaskRow key={t.id} task={t} />)
            )}
          </Card>
        </div>

        {/* ── Column 2: This Week ── */}
        <div className="space-y-4">
          <SectionTitle>This Week</SectionTitle>

          <Card>
            <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <span>📋</span> Tasks due this week
            </p>
            {Object.keys(weekTasksByBrand).length === 0 ? (
              <EmptyState message="No tasks due this week" />
            ) : (
              Object.entries(weekTasksByBrand).map(([brand, tasks]) => (
                <WeekTaskGroup key={brand} brand={brand} tasks={tasks} />
              ))
            )}
          </Card>

          <Card>
            <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <span>📅</span> Upcoming deadlines (7–30d)
            </p>
            {upcomingDisputes.length === 0 ? (
              <EmptyState message="No upcoming deadlines" />
            ) : (
              upcomingDisputes.map((d) => <UpcomingDisputeRow key={d.id} dispute={d} />)
            )}
          </Card>
        </div>

        {/* ── Column 3: Brand Pulse ── */}
        <div className="space-y-4">
          <SectionTitle>Brand Pulse</SectionTitle>
          <Card>
            <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
              <span>📊</span> Live metrics
            </p>
            {BRANDS.map((b) => (
              <BrandPulseCard key={b} brandId={b} metric={metricMap[b]} />
            ))}
          </Card>
        </div>
      </div>

      {/* Activity Feed */}
      <Card>
        <SectionTitle>Activity Feed</SectionTitle>
        {notifications.length === 0 ? (
          <EmptyState message="No recent activity" />
        ) : (
          notifications.map((n) => <ActivityItem key={n.id} notification={n} />)
        )}
      </Card>

      {showAddTask && (
        <AddTaskForm onClose={() => setShowAddTask(false)} onSuccess={fetchAll} />
      )}
    </div>
  );
}
