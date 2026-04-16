import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BRAND_IDS, BRAND_META, type BrandId } from './BrandKPIsTab';
import { useBrand } from '@/lib/BrandContext';

// Type guard: slug string → BrandId (narrowing to union of known ids)
function isBrandId(s: string): s is BrandId {
  return (BRAND_IDS as readonly string[]).includes(s);
}

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
    roas >= 3 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    roas >= 2 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {roas.toFixed(2)}x
    </span>
  );
};

const ctrBadge = (ctr: number | null) => {
  if (ctr == null) return <span className="text-xs text-slate-500">—</span>;
  const cls =
    ctr >= 1.5 ? 'text-emerald-700' :
    ctr >= 1.0 ? 'text-amber-700' :
                 'text-rose-700';
  return <span className={`font-semibold text-xs ${cls}`}>{ctr.toFixed(2)}%</span>;
};

const CAMPAIGN_STATUS_STYLES: Record<CampaignStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  paused: 'bg-amber-50 text-amber-700 border-amber-200',
  ended:  'bg-slate-100 text-slate-600 border-slate-200',
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
  const { activeBrand } = useBrand();
  // Map activeBrand.slug → BrandId if it matches known set, else 'all'
  const filterBrand: BrandId | 'all' =
    activeBrand && isBrandId(activeBrand.slug) ? activeBrand.slug : 'all';

  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlatform, setFilterPlatform] = useState<AdPlatform | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_CAMPAIGN);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdCampaign>>({});

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

  const startEdit = (c: AdCampaign) => {
    setEditingId(c.id);
    setEditForm({ ...c });
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setSaveError(null);
    const { id, ...rest } = editForm as AdCampaign;
    const { error } = await supabase.from('ad_campaigns').update(rest).eq('id', editingId);
    if (error) { setSaveError(error.message); setSaving(false); return; }
    setEditingId(null);
    setSaving(false);
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('ad_campaigns').delete().eq('id', id);
    if (error) fetchCampaigns();
  };

  const handleStatusToggle = async (c: AdCampaign) => {
    const next: CampaignStatus = c.status === 'active' ? 'paused' : c.status === 'paused' ? 'active' : c.status;
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
    const { error } = await supabase.from('ad_campaigns').update({ status: next }).eq('id', c.id);
    if (error) fetchCampaigns();
  };

  const filtered = campaigns.filter(c =>
    (filterPlatform === 'all' || c.platform === filterPlatform) &&
    (filterBrand === 'all' || c.brand_id === filterBrand)
  );

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('ad_campaigns').insert(formData);
    if (error) { setSaveError(error.message); setSaving(false); return; }
    setFormData(EMPTY_CAMPAIGN);
    setShowAddForm(false);
    setSaving(false);
    fetchCampaigns();
  };

  const CAMPAIGN_STATUSES: CampaignStatus[] = ['active', 'paused', 'ended'];

  const inputCls = "w-full text-xs ring-1 ring-slate-200 bg-white text-slate-900 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Ad Performance</h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {filtered.length} campaign{filtered.length !== 1 ? 's' : ''}
            {filterPlatform !== 'all' ? ` on ${filterPlatform}` : ' across all platforms'}
            {filterBrand !== 'all' ? ` • ${BRAND_META[filterBrand].name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand filter is driven by global BrandSwitcher in Dashboard header */}

          {/* Platform filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
            <button
              onClick={() => setFilterPlatform('all')}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${
                filterPlatform === 'all' ? 'bg-white text-indigo-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            {AD_PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  filterPlatform === p ? 'bg-white text-indigo-700 ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Campaign
          </button>
        </div>
      </div>

      {/* Add campaign form */}
      {showAddForm && (
        <form
          onSubmit={handleAddCampaign}
          className="p-5 bg-white ring-1 ring-slate-200 rounded-2xl space-y-4"
        >
          <p className="text-sm font-semibold text-slate-900">Add Campaign</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Brand</label>
              <select required value={formData.brand_id}
                onChange={e => setFormData(f => ({ ...f, brand_id: e.target.value as BrandId }))}
                className={inputCls}>
                {BRAND_IDS.map(b => <option key={b} value={b}>{BRAND_META[b].name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select required value={formData.platform}
                onChange={e => setFormData(f => ({ ...f, platform: e.target.value as AdPlatform }))}
                className={inputCls}>
                {AD_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Campaign Name</label>
              <input required type="text" value={formData.campaign_name}
                onChange={e => setFormData(f => ({ ...f, campaign_name: e.target.value }))}
                placeholder="e.g. Thiocyn – MOFU Retargeting"
                className={inputCls} />
            </div>

            {([
              { key: 'budget_daily',  label: 'Daily Budget (€)',  step: '1' },
              { key: 'spend_mtd',     label: 'Spend MTD (€)',     step: '1' },
              { key: 'impressions',   label: 'Impressions',       step: '1' },
              { key: 'clicks',        label: 'Clicks',            step: '1' },
              { key: 'ctr',           label: 'CTR (%)',           step: '0.01' },
              { key: 'purchases',     label: 'Purchases',         step: '1' },
              { key: 'roas',          label: 'ROAS',              step: '0.01' },
            ] as const).map(field => (
              <div key={field.key}>
                <label className={labelCls}>{field.label}</label>
                <input type="number" step={field.step} min="0"
                  value={(formData as any)[field.key] ?? ''}
                  onChange={e => setFormData(f => ({
                    ...f,
                    [field.key]: e.target.value === '' ? null : parseFloat(e.target.value),
                  }))}
                  className={inputCls} />
              </div>
            ))}

            <div>
              <label className={labelCls}>Status</label>
              <select value={formData.status}
                onChange={e => setFormData(f => ({ ...f, status: e.target.value as CampaignStatus }))}
                className={inputCls}>
                {CAMPAIGN_STATUSES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Period Start</label>
              <input type="date" value={formData.period_start ?? ''}
                onChange={e => setFormData(f => ({ ...f, period_start: e.target.value || null }))}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Period End</label>
              <input type="date" value={formData.period_end ?? ''}
                onChange={e => setFormData(f => ({ ...f, period_end: e.target.value || null }))}
                className={inputCls} />
            </div>
          </div>

          {saveError && <p className="text-xs text-rose-700 font-semibold">{saveError}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Campaign'}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setSaveError(null); }}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Flat campaigns table — brand as column instead of grouping */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-sm font-semibold text-slate-700">No campaigns found</p>
          <p className="text-xs text-slate-500 mt-1">
            {filterPlatform !== 'all' || filterBrand !== 'all'
              ? 'Try adjusting filters above.'
              : 'Add a campaign above to get started.'}
          </p>
        </div>
      ) : (
        <div className="bg-white ring-1 ring-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Brand</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Campaign</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Platform</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] text-right">Daily Budget</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] text-right">Spend MTD</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] text-right">Impressions</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] text-right">CTR</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] text-right">Purchases</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] text-right">ROAS</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Period</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 uppercase tracking-wider text-[10px] w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                        <span>{BRAND_META[c.brand_id]?.emoji}</span>
                        <span>{BRAND_META[c.brand_id]?.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-[200px] truncate">
                      {c.campaign_name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{c.platform}</td>
                    <td className="px-4 py-3 text-slate-700 text-right whitespace-nowrap">
                      {fmtCurrency(c.budget_daily)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-right whitespace-nowrap">
                      {fmtCurrency(c.spend_mtd)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-right whitespace-nowrap">
                      {c.impressions != null ? fmtNum(c.impressions) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {ctrBadge(c.ctr)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-right whitespace-nowrap font-semibold">
                      {c.purchases ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {roasBadge(c.roas)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${CAMPAIGN_STATUS_STYLES[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-[10px]">
                      {c.period_start
                        ? `${new Date(c.period_start).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}${c.period_end ? ` – ${new Date(c.period_end).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}` : ''}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStatusToggle(c)}
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            c.status === 'active'
                              ? 'text-amber-700 hover:bg-amber-50'
                              : c.status === 'paused'
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                          disabled={c.status === 'ended'}
                          title={c.status === 'active' ? 'Pause' : c.status === 'paused' ? 'Activate' : ''}
                        >
                          {c.status === 'active' ? '⏸' : c.status === 'paused' ? '▶' : '—'}
                        </button>
                        <button onClick={() => startEdit(c)}
                          className="text-xs text-slate-500 hover:text-indigo-700 transition-colors px-1"
                          title="Edit">
                          ✏️
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this campaign?')) handleDelete(c.id); }}
                          className="text-xs text-slate-500 hover:text-rose-700 transition-colors px-1"
                          title="Delete">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Edit Campaign</h3>
              <button onClick={() => { setEditingId(null); setSaveError(null); }}
                className="text-slate-500 hover:text-slate-900 text-lg leading-none transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Campaign Name</label>
                <input type="text" value={(editForm as any).campaign_name ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, campaign_name: e.target.value }))}
                  className={inputCls} />
              </div>
              {([
                { key: 'budget_daily', label: 'Daily Budget (€)' },
                { key: 'spend_mtd',    label: 'Spend MTD (€)' },
                { key: 'impressions',  label: 'Impressions' },
                { key: 'clicks',       label: 'Clicks' },
                { key: 'ctr',          label: 'CTR (%)' },
                { key: 'purchases',    label: 'Purchases' },
                { key: 'roas',         label: 'ROAS' },
              ] as const).map(field => (
                <div key={field.key}>
                  <label className={labelCls}>{field.label}</label>
                  <input type="number" step="0.01"
                    value={(editForm as any)[field.key] ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, [field.key]: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    className={inputCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>Status</label>
                <select value={(editForm as any).status ?? 'active'}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as CampaignStatus }))}
                  className={inputCls}>
                  {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            {saveError && <p className="text-xs text-rose-700 font-semibold mt-2">{saveError}</p>}
            <div className="flex gap-2 pt-4">
              <button onClick={handleSaveEdit} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => { setEditingId(null); setSaveError(null); }}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdPerformanceTab;
