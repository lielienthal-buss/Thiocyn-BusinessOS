import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Creator {
  id: string;
  name: string;
  instagram_url: string;
  email: string | null;
  brand: string;
  status: string;
  follower_range: string | null;
  notes: string | null;
  created_at: string;
  // Extended fields (from migration)
  tier?: string;
  affiliate_code?: string;
  total_sales?: number;
  total_revenue?: number;
  content_count?: number;
  last_content_date?: string;
  assigned_operator?: string;
  onboarding_status?: string;
  brand_slug?: string;
}

interface CreatorTask {
  id: string;
  creator_id: string;
  brand_slug: string;
  week_number: number;
  year: number;
  content_direction: string;
  angle_code: string | null;
  deadline: string | null;
  status: string;
  submission_url: string | null;
  feedback: string | null;
  feedback_given_at: string | null;
  quality_rating: number | null;
  repost_worthy: boolean;
  creator_name?: string;
}

interface CreatorScoreboard {
  id: string;
  name: string;
  brand_slug: string;
  tier: string;
  total_sales: number;
  total_revenue: number;
  content_count: number;
  avg_delivery_rate_4w: number;
  top_videos_4w: number;
  sales_4w: number;
  creator_grade: string;
  rank: number;
}

interface OperatorDashboard {
  assigned_operator: string;
  operator_name: string;
  total_creators: number;
  active_creators: number;
  ambassadors: number;
  total_sales: number;
  total_revenue: number;
  open_tasks_this_week: number;
  delivered_this_week: number;
  delivery_rate_this_week: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BRANDS = ['All', 'Paigh', 'Take A Shot', 'Wristr', 'Thiocyn', 'Dr. Severin', 'Timber & John'];
const STATUSES = ['Prospect', 'Contacted', 'Interested', 'Product sent', 'Content posted', 'Active'];

const STATUS_COLORS: Record<string, string> = {
  Prospect: 'bg-slate-500/15 text-slate-400',
  Contacted: 'bg-blue-500/15 text-blue-400',
  Interested: 'bg-yellow-500/15 text-yellow-400',
  'Product sent': 'bg-orange-500/15 text-orange-400',
  'Content posted': 'bg-emerald-500/15 text-emerald-400',
  Active: 'bg-violet-500/15 text-violet-400',
};

const NEXT_STATUS: Record<string, string> = {
  Prospect: 'Contacted',
  Contacted: 'Interested',
  Interested: 'Product sent',
  'Product sent': 'Content posted',
  'Content posted': 'Active',
  Active: 'Active',
};

const TIER_COLORS: Record<string, string> = {
  starter: 'bg-slate-500/15 text-slate-400',
  silver: 'bg-slate-300/15 text-slate-300',
  gold: 'bg-amber-500/15 text-amber-400',
  ambassador: 'bg-violet-500/15 text-violet-400',
};

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400',
  B: 'bg-yellow-500/20 text-yellow-400',
  C: 'bg-red-500/20 text-red-400',
};

const TASK_STATUS_COLORS: Record<string, string> = {
  sent: 'bg-blue-500/15 text-blue-400',
  acknowledged: 'bg-cyan-500/15 text-cyan-400',
  submitted: 'bg-amber-500/15 text-amber-400',
  feedback_given: 'bg-emerald-500/15 text-emerald-400',
  approved: 'bg-green-500/15 text-green-400',
  overdue: 'bg-red-500/15 text-red-400',
  skipped: 'bg-slate-500/15 text-slate-400',
};

const DIRECTION_LABELS: Record<string, string> = {
  problem_solution: 'Problem → Lösung',
  storytelling: 'Storytelling',
  aesthetic: 'Ästhetik / Routine',
  myth_buster: 'Mythos brechen',
};

const emptyForm = { name: '', instagram_url: '', email: '', brand: 'Paigh', status: 'Prospect', follower_range: '', notes: '' };

// ─── Component ──────────────────────────────────────────────────────────────

const CreatorView: React.FC = () => {
  // Shared state
  const [subTab, setSubTab] = useState<'pipeline' | 'tasks' | 'performance' | 'operators'>('pipeline');
  const [brandFilter, setBrandFilter] = useState('All');

  // Pipeline state (original)
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New tab state
  const [tasks, setTasks] = useState<CreatorTask[]>([]);
  const [scoreboard, setScoreboard] = useState<CreatorScoreboard[]>([]);
  const [operators, setOperators] = useState<OperatorDashboard[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchCreators = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('creators')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setCreators(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchCreators(); }, []);

  // Fetch tab-specific data when switching tabs
  useEffect(() => {
    const fetchTabData = async () => {
      setTabLoading(true);
      if (subTab === 'tasks') {
        const { data } = await supabase
          .from('creator_tasks')
          .select('*, creators!inner(name)')
          .order('year', { ascending: false })
          .order('week_number', { ascending: false })
          .limit(100);
        setTasks((data ?? []).map((t: Record<string, unknown>) => ({
          ...t,
          creator_name: (t.creators as { name: string })?.name,
        })) as CreatorTask[]);
      } else if (subTab === 'performance') {
        const { data } = await supabase.from('creator_scoreboard').select('*');
        setScoreboard(data ?? []);
      } else if (subTab === 'operators') {
        const { data } = await supabase.from('creator_operator_dashboard').select('*');
        setOperators(data ?? []);
      }
      setTabLoading(false);
    };
    if (subTab !== 'pipeline') fetchTabData();
  }, [subTab]);

  // ─── Filters ────────────────────────────────────────────────────────────

  const filtered = creators.filter(c => {
    const brandMatch = brandFilter === 'All' || c.brand === brandFilter;
    const statusMatch = statusFilter === 'All' || c.status === statusFilter;
    return brandMatch && statusMatch;
  });

  const filteredTasks = useMemo(() => {
    if (brandFilter === 'All') return tasks;
    const slugMap: Record<string, string> = {
      'Thiocyn': 'thiocyn', 'Take A Shot': 'take-a-shot', 'Paigh': 'paigh',
      'Dr. Severin': 'dr-severin', 'Wristr': 'wristr', 'Timber & John': 'timber-john',
    };
    return tasks.filter(t => t.brand_slug === slugMap[brandFilter]);
  }, [tasks, brandFilter]);

  const filteredScoreboard = useMemo(() => {
    if (brandFilter === 'All') return scoreboard;
    const slugMap: Record<string, string> = {
      'Thiocyn': 'thiocyn', 'Take A Shot': 'take-a-shot', 'Paigh': 'paigh',
      'Dr. Severin': 'dr-severin', 'Wristr': 'wristr', 'Timber & John': 'timber-john',
    };
    return scoreboard.filter(s => s.brand_slug === slugMap[brandFilter]);
  }, [scoreboard, brandFilter]);

  // ─── KPIs ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: creators.length,
    active: creators.filter(c => c.status === 'Active').length,
    ambassadors: creators.filter(c => c.tier === 'ambassador').length,
    totalSales: creators.reduce((s, c) => s + (c.total_sales ?? 0), 0),
  }), [creators]);

  // ─── Edge Function Triggers ──────────────────────────────────────────────

  const callEdgeFunction = async (fnName: string, body: Record<string, unknown> = {}) => {
    setActionLoading(fnName);
    setActionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      setActionResult(JSON.stringify(data, null, 2));
      // Refresh tab data
      if (fnName === 'distribute-creator-tasks') setSubTab('tasks');
      if (fnName === 'snapshot-creator-performance') setSubTab('performance');
    } catch (err) {
      setActionResult(`Error: ${String(err)}`);
    }
    setActionLoading(null);
  };

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleAddCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name ist erforderlich.'); return; }
    setSaving(true);
    setFormError(null);
    const { error: err } = await supabase.from('creators').insert([{
      name: form.name.trim(),
      instagram_url: form.instagram_url.trim() || null,
      email: form.email.trim() || null,
      brand: form.brand,
      status: form.status,
      follower_range: form.follower_range || null,
      notes: form.notes.trim() || null,
    }]);
    setSaving(false);
    if (err) { setFormError(err.message); return; }
    setShowModal(false);
    setForm(emptyForm);
    fetchCreators();
  };

  const handleAdvanceStatus = async (creator: Creator) => {
    const next = NEXT_STATUS[creator.status];
    if (next === creator.status) return;
    await supabase.from('creators').update({ status: next }).eq('id', creator.id);
    fetchCreators();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Creator Engine</h1>
          <p className="text-sm text-slate-400 mt-1">Pipeline, Tasks, Performance & Operator Management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="text-sm border border-white/[0.06] bg-surface-800/60 text-slate-300 rounded-lg px-3 py-1.5"
          >
            {BRANDS.map(b => <option key={b}>{b}</option>)}
          </select>
          <button
            onClick={() => callEdgeFunction('distribute-creator-tasks', brandFilter !== 'All' ? { brand_slug: brandFilter.toLowerCase().replace(/\s+/g, '-') } : {})}
            disabled={actionLoading === 'distribute-creator-tasks'}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {actionLoading === 'distribute-creator-tasks' ? '...' : 'Tasks verteilen'}
          </button>
          <button
            onClick={() => callEdgeFunction('snapshot-creator-performance')}
            disabled={actionLoading === 'snapshot-creator-performance'}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {actionLoading === 'snapshot-creator-performance' ? '...' : 'Snapshot'}
          </button>
          <button
            onClick={() => { setShowModal(true); setFormError(null); setForm(emptyForm); }}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            + Creator
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Creators', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-green-400' },
          { label: 'Ambassadors', value: stats.ambassadors, color: 'text-violet-400' },
          { label: 'Total Sales', value: stats.totalSales, color: 'text-amber-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Action Result */}
      {actionResult && (
        <div className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 text-xs font-mono text-slate-300 relative">
          <button onClick={() => setActionResult(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white">×</button>
          <pre className="whitespace-pre-wrap">{actionResult}</pre>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-surface-800/60 p-1 rounded-lg w-fit border border-white/[0.06]">
        {([
          { key: 'pipeline', label: 'Pipeline' },
          { key: 'tasks', label: 'Weekly Tasks' },
          { key: 'performance', label: 'Performance' },
          { key: 'operators', label: 'Operators' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
              subTab === tab.key
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Pipeline Tab (original) ─────────────────────────────────── */}
      {subTab === 'pipeline' && (
        <>
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-white/[0.06] bg-surface-800/60 text-slate-300 rounded-lg px-3 py-1.5"
            >
              <option>All</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20 text-slate-500 text-sm">Lade Creator...</div>
          ) : error ? (
            <div className="p-4 bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <span className="text-4xl mb-3">🤳</span>
              <p className="text-sm font-medium">Keine Creator gefunden.</p>
            </div>
          ) : (
            <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-900/60 border-b border-white/[0.06]">
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Instagram</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Brand</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Tier</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Sales</th>
                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.map(c => (
                    <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{c.name}</td>
                      <td className="px-4 py-3">
                        {c.instagram_url ? (
                          <a href={c.instagram_url} target="_blank" rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-800 hover:underline truncate max-w-[160px] block">
                            {c.instagram_url.replace('https://www.instagram.com/', '@').replace(/\/$/, '')}
                          </a>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{c.brand}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${TIER_COLORS[c.tier ?? 'starter']}`}>
                          {c.tier ?? 'starter'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.total_sales ?? 0}</td>
                      <td className="px-4 py-3">
                        {c.status !== 'Active' && (
                          <button onClick={() => handleAdvanceStatus(c)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-bold transition-colors">
                            → {NEXT_STATUS[c.status]}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ─── Weekly Tasks Tab ────────────────────────────────────────── */}
      {subTab === 'tasks' && (
        tabLoading ? (
          <div className="flex justify-center py-20 text-slate-500 text-sm">Lade Tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">📋</span>
            <p className="text-sm font-medium">Keine Tasks vorhanden. Verteile montags die erste Content-Richtung.</p>
          </div>
        ) : (
          <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-900/60 border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Creator</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">KW</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Direction</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Angle</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Rating</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Repost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredTasks.map(t => (
                  <tr key={t.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{t.creator_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">KW{t.week_number}/{t.year}</td>
                    <td className="px-4 py-3 text-slate-300 text-xs">{DIRECTION_LABELS[t.content_direction] ?? t.content_direction}</td>
                    <td className="px-4 py-3 font-mono text-amber-400 text-xs">{t.angle_code ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${TASK_STATUS_COLORS[t.status] ?? ''}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {t.quality_rating ? '★'.repeat(t.quality_rating) + '☆'.repeat(5 - t.quality_rating) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.repost_worthy ? <span className="text-green-400 font-bold">✓</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ─── Performance Tab ─────────────────────────────────────────── */}
      {subTab === 'performance' && (
        tabLoading ? (
          <div className="flex justify-center py-20 text-slate-500 text-sm">Lade Performance...</div>
        ) : filteredScoreboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">📊</span>
            <p className="text-sm font-medium">Noch keine Performance-Daten. Daten werden nach den ersten Tasks automatisch aggregiert.</p>
          </div>
        ) : (
          <div className="bg-surface-800/60 rounded-xl border border-white/[0.06] overflow-hidden backdrop-blur-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-900/60 border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Creator</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Brand</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Grade</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-500">Tier</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Delivery %</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Top Videos</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Sales (4w)</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredScoreboard.map(s => (
                  <tr key={s.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3 text-slate-500 text-xs">#{s.rank}</td>
                    <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{s.brand_slug}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${GRADE_COLORS[s.creator_grade] ?? ''}`}>
                        {s.creator_grade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${TIER_COLORS[s.tier] ?? ''}`}>
                        {s.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">{s.avg_delivery_rate_4w}%</td>
                    <td className="px-4 py-3 text-right text-slate-300">{s.top_videos_4w}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{s.sales_4w}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{s.total_sales}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ─── Operators Tab ───────────────────────────────────────────── */}
      {subTab === 'operators' && (
        tabLoading ? (
          <div className="flex justify-center py-20 text-slate-500 text-sm">Lade Operator-Daten...</div>
        ) : operators.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">👤</span>
            <p className="text-sm font-medium">Keine Operators zugewiesen. Weise Creatorn einen Operator zu (assigned_operator).</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {operators.map(op => (
              <div key={op.assigned_operator} className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold">{op.operator_name ?? op.assigned_operator}</h3>
                  <div className="flex gap-3 text-xs text-slate-400">
                    <span>{op.total_creators} Creator</span>
                    <span className="text-green-400">{op.active_creators} aktiv</span>
                    {op.ambassadors > 0 && <span className="text-violet-400">{op.ambassadors} Ambassadors</span>}
                  </div>
                </div>
                {/* Delivery bar */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-3 rounded-full overflow-hidden bg-surface-900/60">
                    <div
                      className={`h-full rounded-full transition-all ${
                        op.delivery_rate_this_week >= 80 ? 'bg-green-500' :
                        op.delivery_rate_this_week >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(op.delivery_rate_this_week, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white w-12 text-right">{op.delivery_rate_this_week}%</span>
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Offen: <span className="text-amber-400 font-bold">{op.open_tasks_this_week}</span></span>
                  <span>Geliefert: <span className="text-green-400 font-bold">{op.delivered_this_week}</span></span>
                  <span>Sales total: <span className="text-white font-bold">{op.total_sales}</span></span>
                  <span>Revenue: <span className="text-white font-bold">€{(op.total_revenue ?? 0).toFixed(0)}</span></span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── Add Creator Modal (preserved from original) ────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl shadow-2xl w-full max-w-md p-8 relative backdrop-blur-sm">
            <button onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xl font-black">×</button>
            <h2 className="text-xl font-black text-white mb-6">Add Creator</h2>
            <form onSubmit={handleAddCreator} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Name *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="Max Mustermann" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Instagram URL</label>
                <input type="url" value={form.instagram_url}
                  onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="https://www.instagram.com/profil/" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Brand</label>
                  <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none">
                    {BRANDS.filter(b => b !== 'All').map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email (optional)</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="creator@mail.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none resize-none"
                  placeholder="Infos zum Creator..." />
              </div>
              {formError && <p className="text-xs text-red-500 font-bold">{formError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50">
                {saving ? 'Speichern...' : 'Creator hinzufügen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorView;
