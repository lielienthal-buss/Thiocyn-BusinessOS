import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_IDS = ['thiocyn', 'take-a-shot', 'dr-severin', 'paigh', 'wristr', 'timber-john'] as const;
type BrandId = typeof BRAND_IDS[number];

const BRAND_META: Record<BrandId, { name: string; emoji: string }> = {
  'thiocyn':     { name: 'Thiocyn',       emoji: '💊' },
  'take-a-shot': { name: 'Take A Shot',   emoji: '📸' },
  'dr-severin':  { name: 'Dr. Severin',   emoji: '🧬' },
  'paigh':       { name: 'Paigh',         emoji: '👜' },
  'wristr':      { name: 'Wristr',        emoji: '⌚' },
  'timber-john': { name: 'Timber & John', emoji: '🪵' },
};

const AD_PLATFORMS = ['Meta', 'Google', 'TikTok'] as const;
type AdPlatform = typeof AD_PLATFORMS[number];

type CampaignStatus = 'active' | 'paused' | 'ended';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandMetric {
  id: string;
  brand_id: BrandId;
  followers: number | null;
  engagement_rate: number | null;
  roas: number | null;
  ad_spend: number | null;
  sop_phase: number | null;
  notes: string | null;
  updated_at: string | null;
}

interface AdCampaign {
  id: string;
  brand_id: BrandId;
  platform: AdPlatform;
  campaign_name: string;
  budget_daily: number | null;
  spend_mtd: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  purchases: number | null;
  roas: number | null;
  status: CampaignStatus;
  period_start: string | null;
  period_end: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number | null | undefined) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};

const fmtNum = (n: number | null | undefined, decimals = 0) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: decimals }).format(n);
};

const fmtTs = (ts: string | null | undefined) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const roasBadge = (roas: number | null) => {
  if (roas == null) return <span className="text-xs text-gray-400 font-semibold">—</span>;
  const cls =
    roas >= 3 ? 'bg-green-50 text-green-700 border-green-200' :
    roas >= 2 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border ${cls}`}>
      {roas.toFixed(2)}x
    </span>
  );
};

const ctrBadge = (ctr: number | null) => {
  if (ctr == null) return <span className="text-xs text-gray-400">—</span>;
  const cls =
    ctr >= 1.5 ? 'text-green-700' :
    ctr >= 1.0 ? 'text-yellow-600' :
                 'text-red-600';
  return <span className={`font-bold text-xs ${cls}`}>{ctr.toFixed(2)}%</span>;
};

const SOP_PHASE_COLORS = (phase: number) => {
  if (phase >= 5) return 'bg-green-500';
  if (phase >= 3) return 'bg-amber-400';
  if (phase >= 1) return 'bg-orange-400';
  return 'bg-gray-200';
};

const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  paused: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  ended:  'bg-gray-100 text-gray-500 border-gray-200',
};

// ─── Brand KPIs Tab ───────────────────────────────────────────────────────────

const BrandKPIsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<BrandMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BrandMetric>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('brand_metrics')
      .select('id, brand_id, followers, engagement_rate, roas, ad_spend, sop_phase, notes, updated_at')
      .order('brand_id');
    setMetrics((data as BrandMetric[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // Summary row
  const activeMetrics = metrics.filter(m => m.roas != null || m.ad_spend != null);
  const avgRoas = activeMetrics.length
    ? activeMetrics.filter(m => m.roas != null).reduce((acc, m) => acc + (m.roas ?? 0), 0) /
      (activeMetrics.filter(m => m.roas != null).length || 1)
    : null;
  const totalSpend = metrics.reduce((acc, m) => acc + (m.ad_spend ?? 0), 0);
  const bestBrand = metrics.reduce<BrandMetric | null>((best, m) => {
    if (m.roas == null) return best;
    if (!best || m.roas > (best.roas ?? 0)) return m;
    return best;
  }, null);

  const startEdit = (m: BrandMetric) => {
    setEditingId(m.id);
    setEditForm({
      followers: m.followers,
      engagement_rate: m.engagement_rate,
      roas: m.roas,
      ad_spend: m.ad_spend,
      sop_phase: m.sop_phase,
      notes: m.notes,
    });
    setSaveError(null);
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase
      .from('brand_metrics')
      .update({ ...editForm, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setEditingId(null);
    setSaving(false);
    fetchMetrics();
  };

  const cards = BRAND_IDS.map(brandId => {
    const m = metrics.find(x => x.brand_id === brandId) ?? null;
    return { brandId, m };
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-gray-900">Brand KPIs</h3>
        <p className="text-xs text-gray-500 mt-0.5">Live performance metrics per brand from Supabase</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-gray-100 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Avg ROAS (all brands)</p>
          <p className="text-2xl font-black text-gray-900">{avgRoas != null ? `${avgRoas.toFixed(2)}x` : '—'}</p>
        </div>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Total Ad Spend MTD</p>
          <p className="text-2xl font-black text-gray-900">{totalSpend > 0 ? fmtCurrency(totalSpend) : '—'}</p>
        </div>
        <div className="p-4 bg-white border border-gray-100 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Best Performing Brand</p>
          <p className="text-2xl font-black text-gray-900">
            {bestBrand
              ? `${BRAND_META[bestBrand.brand_id]?.emoji} ${BRAND_META[bestBrand.brand_id]?.name}`
              : '—'}
          </p>
          {bestBrand?.roas != null && (
            <p className="text-xs text-gray-400 mt-0.5">{bestBrand.roas.toFixed(2)}x ROAS</p>
          )}
        </div>
      </div>

      {/* Brand KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(({ brandId, m }) => {
          const { name, emoji } = BRAND_META[brandId];
          const isEditing = m != null && editingId === m.id;

          return (
            <div
              key={brandId}
              className="flex flex-col gap-3 p-5 bg-white border-2 border-gray-100 hover:border-primary-200 rounded-2xl transition-all duration-200"
            >
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="font-black text-gray-900 text-sm">{name}</p>
                    {m?.sop_phase != null && (
                      <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-primary-50 text-primary-600 border border-primary-200 px-1.5 py-0.5 rounded-full mt-0.5">
                        Phase {m.sop_phase}
                      </span>
                    )}
                  </div>
                </div>
                {m && !isEditing && (
                  <button
                    onClick={() => startEdit(m)}
                    className="text-[10px] font-bold text-gray-400 hover:text-primary-600 transition-colors px-2 py-1 rounded-lg hover:bg-primary-50"
                  >
                    Edit KPIs
                  </button>
                )}
              </div>

              {isEditing ? (
                /* Inline edit form */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { key: 'followers', label: 'Followers', type: 'number' },
                        { key: 'engagement_rate', label: 'Engagement %', type: 'number', step: '0.01' },
                        { key: 'roas', label: 'ROAS', type: 'number', step: '0.01' },
                        { key: 'ad_spend', label: 'Ad Spend (€)', type: 'number', step: '1' },
                        { key: 'sop_phase', label: 'SOP Phase (1-7)', type: 'number', min: '0', max: '7' },
                      ] as const
                    ).map(field => (
                      <div key={field.key}>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          step={'step' in field ? field.step : undefined}
                          min={'min' in field ? field.min : undefined}
                          max={'max' in field ? field.max : undefined}
                          value={(editForm as any)[field.key] ?? ''}
                          onChange={e =>
                            setEditForm(f => ({
                              ...f,
                              [field.key]: e.target.value === '' ? null : parseFloat(e.target.value),
                            }))
                          }
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
                        />
                      </div>
                    ))}
                    <div className="col-span-2">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-gray-400 mb-0.5">Notes</label>
                      <input
                        type="text"
                        value={editForm.notes ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary-400"
                        placeholder="Optional note..."
                      />
                    </div>
                  </div>
                  {saveError && <p className="text-[10px] text-red-600 font-semibold">{saveError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(m!.id)}
                      disabled={saving}
                      className="px-3 py-1.5 bg-primary-600 text-white text-[10px] font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setSaveError(null); }}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : m == null ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                  <span className="text-xs font-black text-gray-300">—</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-400 rounded-full border border-gray-200">
                    No data yet
                  </span>
                </div>
              ) : (
                <>
                  {/* Followers + Engagement */}
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold">Followers</p>
                      <p className="font-black text-gray-900 text-base mt-0.5">
                        {m.followers != null ? fmtNum(m.followers) : '—'}
                        {/* Trend arrow placeholder */}
                        <span className="text-gray-300 text-xs ml-1" title="Trend data not yet available">↔</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-semibold">Engagement</p>
                      <p className="font-black text-gray-900 text-base mt-0.5">
                        {m.engagement_rate != null ? `${m.engagement_rate.toFixed(2)}%` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* ROAS + Ad Spend */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold mb-1">ROAS</p>
                      {roasBadge(m.roas)}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-semibold">Ad Spend MTD</p>
                      <p className="font-bold text-gray-700 text-xs mt-0.5">{fmtCurrency(m.ad_spend)}</p>
                    </div>
                  </div>

                  {/* SOP Phase dots */}
                  {m.sop_phase != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 mr-1">SOP</span>
                      {[1, 2, 3, 4, 5, 6, 7].map(p => (
                        <div
                          key={p}
                          className={`w-2 h-2 rounded-full ${p <= m.sop_phase! ? SOP_PHASE_COLORS(m.sop_phase!) : 'bg-gray-100'}`}
                          title={`Phase ${p}`}
                        />
                      ))}
                      <span className="text-[10px] text-gray-400 ml-1">{m.sop_phase}/7</span>
                    </div>
                  )}

                  {/* Notes */}
                  {m.notes && (
                    <p className="text-[10px] text-gray-400 italic leading-snug">{m.notes}</p>
                  )}

                  {/* Footer */}
                  <p className="text-[10px] text-gray-300 mt-auto pt-2 border-t border-gray-50">
                    Updated {fmtTs(m.updated_at)}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Ad Performance Tab ───────────────────────────────────────────────────────

const EMPTY_CAMPAIGN: Omit<AdCampaign, 'id'> = {
  brand_id: 'thiocyn',
  platform: 'Meta',
  campaign_name: '',
  budget_daily: null,
  spend_mtd: null,
  impressions: null,
  clicks: null,
  ctr: null,
  purchases: null,
  roas: null,
  status: 'active',
  period_start: null,
  period_end: null,
};

const AdPerformanceTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<AdPlatform | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_CAMPAIGN);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ad_campaigns')
      .select('*')
      .order('brand_id')
      .order('status');
    setCampaigns((data as AdCampaign[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const filtered = campaigns.filter(c =>
    filterPlatform === 'all' || c.platform === filterPlatform
  );

  // Group by brand_id
  const grouped: Record<string, AdCampaign[]> = {};
  for (const c of filtered) {
    if (!grouped[c.brand_id]) grouped[c.brand_id] = [];
    grouped[c.brand_id].push(c);
  }

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('ad_campaigns').insert(formData);
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setFormData(EMPTY_CAMPAIGN);
    setShowAddForm(false);
    setSaving(false);
    fetchCampaigns();
  };

  const CAMPAIGN_STATUSES: CampaignStatus[] = ['active', 'paused', 'ended'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-gray-900">Ad Performance</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {filtered.length} campaign{filtered.length !== 1 ? 's' : ''}
            {filterPlatform !== 'all' ? ` on ${filterPlatform}` : ' across all platforms'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
            <button
              onClick={() => setFilterPlatform('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                filterPlatform === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              All
            </button>
            {AD_PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  filterPlatform === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors"
          >
            + Add Campaign
          </button>
        </div>
      </div>

      {/* Add campaign form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCampaign}
          className="p-5 bg-white border-2 border-primary-200 rounded-2xl space-y-4"
        >
          <p className="text-sm font-black text-gray-900">Add Campaign</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Brand</label>
              <select
                required
                value={formData.brand_id}
                onChange={e => setFormData(f => ({ ...f, brand_id: e.target.value as BrandId }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-primary-400"
              >
                {BRAND_IDS.map(b => <option key={b} value={b}>{BRAND_META[b].name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Platform</label>
              <select
                required
                value={formData.platform}
                onChange={e => setFormData(f => ({ ...f, platform: e.target.value as AdPlatform }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-primary-400"
              >
                {AD_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Campaign Name</label>
              <input
                required
                type="text"
                value={formData.campaign_name}
                onChange={e => setFormData(f => ({ ...f, campaign_name: e.target.value }))}
                placeholder="e.g. Thiocyn – MOFU Retargeting"
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              />
            </div>

            {(
              [
                { key: 'budget_daily',  label: 'Daily Budget (€)',  type: 'number', step: '1' },
                { key: 'spend_mtd',     label: 'Spend MTD (€)',     type: 'number', step: '1' },
                { key: 'impressions',   label: 'Impressions',       type: 'number', step: '1' },
                { key: 'clicks',        label: 'Clicks',            type: 'number', step: '1' },
                { key: 'ctr',           label: 'CTR (%)',           type: 'number', step: '0.01' },
                { key: 'purchases',     label: 'Purchases',         type: 'number', step: '1' },
                { key: 'roas',          label: 'ROAS',              type: 'number', step: '0.01' },
              ] as const
            ).map(field => (
              <div key={field.key}>
                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  step={field.step}
                  min="0"
                  value={(formData as any)[field.key] ?? ''}
                  onChange={e =>
                    setFormData(f => ({
                      ...f,
                      [field.key]: e.target.value === '' ? null : parseFloat(e.target.value),
                    }))
                  }
                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
                />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(f => ({ ...f, status: e.target.value as CampaignStatus }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-primary-400"
              >
                {CAMPAIGN_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Period Start</label>
              <input
                type="date"
                value={formData.period_start ?? ''}
                onChange={e => setFormData(f => ({ ...f, period_start: e.target.value || null }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Period End</label>
              <input
                type="date"
                value={formData.period_end ?? ''}
                onChange={e => setFormData(f => ({ ...f, period_end: e.target.value || null }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {saveError && <p className="text-xs text-red-600 font-semibold">{saveError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Campaign'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setSaveError(null); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Campaigns table — grouped by brand */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-sm font-semibold text-gray-500">No campaigns found</p>
          <p className="text-xs text-gray-400 mt-1">
            {filterPlatform !== 'all'
              ? `No ${filterPlatform} campaigns yet.`
              : 'Add a campaign above to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {BRAND_IDS.filter(b => grouped[b]?.length).map(brandId => {
            const { name, emoji } = BRAND_META[brandId];
            const rows = grouped[brandId];
            return (
              <div key={brandId} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {/* Brand group header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <span className="text-base">{emoji}</span>
                  <span className="text-sm font-black text-gray-900">{name}</span>
                  <span className="ml-auto text-[10px] text-gray-400 font-semibold">
                    {rows.length} campaign{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-50 text-left">
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider">Campaign</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider">Platform</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider text-right">Daily Budget</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider text-right">Spend MTD</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider text-right">Impressions</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider text-right">CTR</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider text-right">Purchases</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider text-right">ROAS</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2.5 font-black text-gray-400 uppercase tracking-wider">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/20' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold text-gray-800 max-w-[200px] truncate">
                            {c.campaign_name}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.platform}</td>
                          <td className="px-4 py-3 text-gray-700 text-right whitespace-nowrap">
                            {fmtCurrency(c.budget_daily)}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900 text-right whitespace-nowrap">
                            {fmtCurrency(c.spend_mtd)}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-right whitespace-nowrap">
                            {c.impressions != null ? fmtNum(c.impressions) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {ctrBadge(c.ctr)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-right whitespace-nowrap font-semibold">
                            {c.purchases ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {roasBadge(c.roas)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${CAMPAIGN_STATUS_STYLES[c.status]}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-[10px]">
                            {c.period_start
                              ? `${new Date(c.period_start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}${c.period_end ? ` – ${new Date(c.period_end).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}` : ''}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type AnalyticsTab = 'brandKPIs' | 'adPerformance';

const AnalyticsView: React.FC = () => {
  const [tab, setTab] = useState<AnalyticsTab>('brandKPIs');

  const TABS: { id: AnalyticsTab; label: string }[] = [
    { id: 'brandKPIs',     label: 'Brand KPIs' },
    { id: 'adPerformance', label: 'Ad Performance' },
  ];

  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Cross-brand KPIs and ad campaign performance</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              tab === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'brandKPIs'     && <BrandKPIsTab />}
      {tab === 'adPerformance' && <AdPerformanceTab />}
    </div>
  );
};

export default AnalyticsView;
