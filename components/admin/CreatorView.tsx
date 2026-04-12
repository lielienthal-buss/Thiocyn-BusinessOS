import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Types & constants from shared module
import {
  type Creator,
  type CreatorTask,
  type CreatorScoreboard,
  type OperatorDashboard,
  type WeeklyPulse,
  BRANDS,
  BRAND_SLUGS,
  STATUSES,
  NEXT_STATUS,
  getBrandSlug,
} from './creator/types';

// Sub-tab components (created by separate agents)
import CreatorPipelineTab from './creator/CreatorPipelineTab';
import CreatorTasksTab from './creator/CreatorTasksTab';
import CreatorPerformanceTab from './creator/CreatorPerformanceTab';
import CreatorOperatorsTab from './creator/CreatorOperatorsTab';
import CreatorPulseTab from './creator/CreatorPulseTab';
import CreatorProspectsTab from './creator/CreatorProspectsTab';
import CreatorCommissionsTab from './creator/CreatorCommissionsTab';
import CreatorGiftingTab from './creator/CreatorGiftingTab';

// ─── Constants ──────────────────────────────────────────────────────────────

type SubTab = 'pipeline' | 'tasks' | 'performance' | 'operators' | 'pulse' | 'prospects' | 'commissions' | 'gifting';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'tasks', label: 'Weekly Tasks' },
  { key: 'performance', label: 'Performance' },
  { key: 'operators', label: 'Operators' },
  { key: 'pulse', label: 'Weekly Pulse' },
  { key: 'prospects', label: 'Prospects' },
  { key: 'commissions', label: 'Commissions' },
  { key: 'gifting', label: 'Gifting' },
];

const emptyForm = { name: '', instagram_url: '', email: '', brand: BRANDS[1] ?? '', status: 'Prospect', follower_range: '', notes: '' };

// ─── Component ──────────────────────────────────────────────────────────────

const CreatorView: React.FC = () => {
  // ── Shared state ────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<SubTab>('pipeline');
  const [brandFilter, setBrandFilter] = useState('All');

  // ── Pipeline state ──────────────────────────────────────────────────────
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');

  // Bulk-tag state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBrand, setBulkBrand] = useState('');
  const [bulkFitScore, setBulkFitScore] = useState<number | ''>('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showUntaggedOnly, setShowUntaggedOnly] = useState(false);

  // ── Tab-specific state ──────────────────────────────────────────────────
  const [tasks, setTasks] = useState<CreatorTask[]>([]);
  const [scoreboard, setScoreboard] = useState<CreatorScoreboard[]>([]);
  const [operators, setOperators] = useState<OperatorDashboard[]>([]);
  const [pulse, setPulse] = useState<WeeklyPulse[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // ── Modal state ─────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Data Fetching ───────────────────────────────────────────────────────

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
      } else if (subTab === 'pulse') {
        const { data } = await supabase.from('weekly_pulse').select('*');
        setPulse(data ?? []);
      }
      setTabLoading(false);
    };
    if (subTab !== 'pipeline') fetchTabData();
  }, [subTab]);

  // ── Derived data ────────────────────────────────────────────────────────

  const filtered = creators.filter(c => {
    const brandMatch = brandFilter === 'All' || c.brand === brandFilter;
    const statusMatch = statusFilter === 'All' || c.status === statusFilter;
    const untaggedMatch = !showUntaggedOnly || !c.brand_slug;
    return brandMatch && statusMatch && untaggedMatch;
  });

  const filteredTasks = useMemo(() => {
    if (brandFilter === 'All') return tasks;
    return tasks.filter(t => t.brand_slug === getBrandSlug(brandFilter));
  }, [tasks, brandFilter]);

  const filteredScoreboard = useMemo(() => {
    if (brandFilter === 'All') return scoreboard;
    return scoreboard.filter(s => s.brand_slug === getBrandSlug(brandFilter));
  }, [scoreboard, brandFilter]);

  const stats = useMemo(() => ({
    total: creators.length,
    active: creators.filter(c => c.status === 'Active').length,
    ambassadors: creators.filter(c => c.tier === 'ambassador').length,
    totalSales: creators.reduce((s, c) => s + (c.total_sales ?? 0), 0),
  }), [creators]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const callEdgeFunction = async (fnName: string, body: Record<string, unknown> = {}) => {
    setActionLoading(fnName);
    setActionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) throw error;
      setActionResult(JSON.stringify(data, null, 2));
      if (fnName === 'distribute-creator-tasks') setSubTab('tasks');
      if (fnName === 'snapshot-creator-performance') setSubTab('performance');
    } catch (err) {
      setActionResult(`Error: ${String(err)}`);
    }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const handleBulkTag = async () => {
    if (selectedIds.size === 0 || !bulkBrand) return;
    setBulkSaving(true);
    const slug = getBrandSlug(bulkBrand);
    const updates: Record<string, unknown> = { brand_slug: slug, brand: bulkBrand };
    if (bulkFitScore !== '') updates.brand_fit_score = bulkFitScore;
    const { error: err } = await supabase
      .from('creators')
      .update(updates)
      .in('id', Array.from(selectedIds));
    setBulkSaving(false);
    if (err) {
      setActionResult(`Bulk-Tag Error: ${err.message}`);
    } else {
      setActionResult(`${selectedIds.size} creators tagged to ${bulkBrand} (fit: ${bulkFitScore || '-'})`);
      setSelectedIds(new Set());
      setBulkBrand('');
      setBulkFitScore('');
      fetchCreators();
    }
  };

  const handleAdvanceStatus = async (creator: Creator) => {
    const next = NEXT_STATUS[creator.status];
    if (next === creator.status) return;
    await supabase.from('creators').update({ status: next }).eq('id', creator.id);
    fetchCreators();
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setActionLoading('csv-import');
    setActionResult(null);
    try {
      const text = await file.text();
      const { data, error } = await supabase.functions.invoke('import-creators-csv', { body: { csv: text } });
      if (error) throw error;
      setActionResult(JSON.stringify(data, null, 2));
      fetchCreators();
    } catch (err) {
      setActionResult(`CSV Import Error: ${String(err)}`);
    }
    setActionLoading(null);
    e.target.value = '';
  };

  const handleAddCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
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

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1d1d1f] tracking-tight">Creator Engine</h1>
          <p className="text-sm text-[#515154] mt-1">Pipeline, Tasks, Performance & Operator Management</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="text-sm border border-black/[0.06] bg-white/70 text-[#1d1d1f] rounded-lg px-3 py-1.5"
          >
            {BRANDS.map(b => <option key={b}>{b}</option>)}
          </select>
          <button
            onClick={() => callEdgeFunction('distribute-creator-tasks', brandFilter !== 'All' ? { brand_slug: getBrandSlug(brandFilter) } : {})}
            disabled={actionLoading === 'distribute-creator-tasks'}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-[#1d1d1f] rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {actionLoading === 'distribute-creator-tasks' ? '...' : 'Distribute Tasks'}
          </button>
          <button
            onClick={() => callEdgeFunction('snapshot-creator-performance')}
            disabled={actionLoading === 'snapshot-creator-performance'}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[#1d1d1f] rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {actionLoading === 'snapshot-creator-performance' ? '...' : 'Snapshot'}
          </button>
          <label className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-[#1d1d1f] rounded-lg text-xs font-bold transition-colors cursor-pointer">
            {actionLoading === 'csv-import' ? 'Importing...' : 'CSV Import'}
            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
          </label>
          <button
            onClick={() => { setShowModal(true); setFormError(null); setForm(emptyForm); }}
            className="px-4 py-2 bg-[#E09B37] hover:bg-[#c8832a] text-[#1d1d1f] rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            + Creator
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Creators', value: stats.total, color: 'text-[#1d1d1f]' },
          { label: 'Active', value: stats.active, color: 'text-green-400' },
          { label: 'Ambassadors', value: stats.ambassadors, color: 'text-violet-400' },
          { label: 'Total Sales', value: stats.totalSales, color: 'text-[#E09B37]' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/70 border border-black/[0.06] rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-[#6e6e73] mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Action Result */}
      {actionResult && (
        <div className="bg-white/70 border border-black/[0.06] rounded-xl p-3 text-xs font-mono text-[#1d1d1f] relative">
          <button onClick={() => setActionResult(null)} className="absolute top-2 right-2 text-[#6e6e73] hover:text-[#1d1d1f]">×</button>
          <pre className="whitespace-pre-wrap">{actionResult}</pre>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white/70 p-1 rounded-lg w-fit border border-black/[0.06]">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${
              subTab === tab.key
                ? 'bg-primary-500/20 text-primary-400'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {subTab === 'pipeline' && (
        <CreatorPipelineTab
          creators={creators}
          filtered={filtered}
          loading={loading}
          error={error}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          handleBulkTag={handleBulkTag}
          bulkBrand={bulkBrand}
          setBulkBrand={setBulkBrand}
          bulkFitScore={bulkFitScore}
          setBulkFitScore={setBulkFitScore}
          bulkSaving={bulkSaving}
          showUntaggedOnly={showUntaggedOnly}
          setShowUntaggedOnly={setShowUntaggedOnly}
          handleAdvanceStatus={handleAdvanceStatus}
          fetchCreators={fetchCreators}
        />
      )}
      {subTab === 'tasks' && (
        <CreatorTasksTab
          tasks={filteredTasks}
          tabLoading={tabLoading}
          actionLoading={actionLoading}
          setActionLoading={setActionLoading}
          actionResult={actionResult}
          setActionResult={setActionResult}
        />
      )}
      {subTab === 'performance' && (
        <CreatorPerformanceTab scoreboard={filteredScoreboard} tabLoading={tabLoading} />
      )}
      {subTab === 'operators' && (
        <CreatorOperatorsTab operators={operators} tabLoading={tabLoading} />
      )}
      {subTab === 'pulse' && (
        <CreatorPulseTab pulse={pulse} tabLoading={tabLoading} brandFilter={brandFilter} />
      )}
      {subTab === 'prospects' && (
        <CreatorProspectsTab brandFilter={brandFilter} />
      )}
      {subTab === 'commissions' && (
        <CreatorCommissionsTab brandFilter={brandFilter} />
      )}
      {subTab === 'gifting' && (
        <CreatorGiftingTab brandFilter={brandFilter} />
      )}

      {/* ── Add Creator Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white/70 border border-black/[0.06] rounded-2xl shadow-2xl w-full max-w-md p-8 relative backdrop-blur-sm">
            <button onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-[#6e6e73] hover:text-[#1d1d1f] text-xl font-black">×</button>
            <h2 className="text-xl font-black text-[#1d1d1f] mb-6">Add Creator</h2>
            <form onSubmit={handleAddCreator} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Name *</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-black/[0.06] bg-white/50 text-[#1d1d1f] rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="Creator name" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Instagram URL</label>
                <input type="url" value={form.instagram_url}
                  onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-black/[0.06] bg-white/50 text-[#1d1d1f] rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="https://www.instagram.com/handle/" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Brand</label>
                  <select value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-black/[0.06] bg-white/50 text-[#1d1d1f] rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none">
                    {BRANDS.filter(b => b !== 'All').map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-black/[0.06] bg-white/50 text-[#1d1d1f] rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Email (optional)</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-black/[0.06] bg-white/50 text-[#1d1d1f] rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none"
                  placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#6e6e73] mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-black/[0.06] bg-white/50 text-[#1d1d1f] rounded-xl text-sm focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none resize-none"
                  placeholder="Additional notes..." />
              </div>
              {formError && <p className="text-xs text-red-500 font-bold">{formError}</p>}
              <button type="submit" disabled={saving}
                className="w-full py-3 bg-[#E09B37] hover:bg-[#c8832a] text-[#1d1d1f] rounded-xl font-black text-sm uppercase tracking-widest transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Add Creator'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorView;
