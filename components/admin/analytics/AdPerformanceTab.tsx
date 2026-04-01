import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BRAND_IDS, BRAND_META, type BrandId } from './BrandKPIsTab';

// ─── Constants ────────────────────────────────────────────────────────────────

const AD_PLATFORMS = ['Meta', 'Google', 'TikTok'] as const;
type AdPlatform = typeof AD_PLATFORMS[number];

type CampaignStatus = 'active' | 'paused' | 'ended';

// ─── Types ────────────────────────────────────────────────────────────────────

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

const roasBadge = (roas: number | null) => {
  if (roas == null) return <span className="text-xs text-slate-500 font-semibold">—</span>;
  const cls =
    roas >= 3 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' :
    roas >= 2 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' :
                'bg-red-500/15 text-red-400 border-red-500/20';
  return (
    <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-full border ${cls}`}>
      {roas.toFixed(2)}x
    </span>
  );
};

const ctrBadge = (ctr: number | null) => {
  if (ctr == null) return <span className="text-xs text-slate-500">—</span>;
  const cls =
    ctr >= 1.5 ? 'text-emerald-400' :
    ctr >= 1.0 ? 'text-yellow-400' :
                 'text-red-400';
  return <span className={`font-bold text-xs ${cls}`}>{ctr.toFixed(2)}%</span>;
};

const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  paused: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  ended:  'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

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

// ─── Ad Performance Tab ───────────────────────────────────────────────────────

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
          <h3 className="text-base font-black text-white">Ad Performance</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} campaign{filtered.length !== 1 ? 's' : ''}
            {filterPlatform !== 'all' ? ` on ${filterPlatform}` : ' across all platforms'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Platform filter */}
          <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.06] rounded-full p-0.5">
            <button
              onClick={() => setFilterPlatform('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                filterPlatform === 'all' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All
            </button>
            {AD_PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                  filterPlatform === p ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'
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
          className="p-5 bg-surface-800/60 border-2 border-primary-500/30 rounded-2xl space-y-4 backdrop-blur-sm"
        >
          <p className="text-sm font-black text-white">Add Campaign</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Brand</label>
              <select
                required
                value={formData.brand_id}
                onChange={e => setFormData(f => ({ ...f, brand_id: e.target.value as BrandId }))}
                className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              >
                {BRAND_IDS.map(b => <option key={b} value={b}>{BRAND_META[b].name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Platform</label>
              <select
                required
                value={formData.platform}
                onChange={e => setFormData(f => ({ ...f, platform: e.target.value as AdPlatform }))}
                className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              >
                {AD_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Campaign Name</label>
              <input
                required
                type="text"
                value={formData.campaign_name}
                onChange={e => setFormData(f => ({ ...f, campaign_name: e.target.value }))}
                placeholder="e.g. Thiocyn – MOFU Retargeting"
                className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
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
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
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
                  className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
                />
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(f => ({ ...f, status: e.target.value as CampaignStatus }))}
                className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              >
                {CAMPAIGN_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Period Start</label>
              <input
                type="date"
                value={formData.period_start ?? ''}
                onChange={e => setFormData(f => ({ ...f, period_start: e.target.value || null }))}
                className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">Period End</label>
              <input
                type="date"
                value={formData.period_end ?? ''}
                onChange={e => setFormData(f => ({ ...f, period_end: e.target.value || null }))}
                className="w-full text-xs border border-white/[0.06] bg-surface-900/60 text-slate-100 rounded-lg px-2.5 py-2 focus:outline-none focus:border-primary-400"
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
              className="px-4 py-2 bg-white/[0.05] text-slate-300 text-xs font-bold rounded-lg hover:bg-white/[0.08] transition-colors"
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
          <p className="text-sm font-semibold text-slate-500">No campaigns found</p>
          <p className="text-xs text-slate-600 mt-1">
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
              <div key={brandId} className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden backdrop-blur-sm">
                {/* Brand group header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-surface-900/60 border-b border-white/[0.06]">
                  <span className="text-base">{emoji}</span>
                  <span className="text-sm font-black text-white">{name}</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-semibold">
                    {rows.length} campaign{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left">
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider">Campaign</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider">Platform</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider text-right">Daily Budget</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider text-right">Spend MTD</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider text-right">Impressions</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider text-right">CTR</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider text-right">Purchases</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider text-right">ROAS</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2.5 font-black text-slate-500 uppercase tracking-wider">Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((c, i) => (
                        <tr
                          key={c.id}
                          className={`border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors ${i % 2 === 1 ? 'bg-white/[0.02]' : ''}`}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-100 max-w-[200px] truncate">
                            {c.campaign_name}
                          </td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.platform}</td>
                          <td className="px-4 py-3 text-slate-300 text-right whitespace-nowrap">
                            {fmtCurrency(c.budget_daily)}
                          </td>
                          <td className="px-4 py-3 font-bold text-white text-right whitespace-nowrap">
                            {fmtCurrency(c.spend_mtd)}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-right whitespace-nowrap">
                            {c.impressions != null ? fmtNum(c.impressions) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {ctrBadge(c.ctr)}
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-right whitespace-nowrap font-semibold">
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
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[10px]">
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

export default AdPerformanceTab;
