import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Constants ────────────────────────────────────────────────────────────────

export const BRAND_IDS = ['thiocyn', 'take-a-shot', 'dr-severin', 'paigh', 'wristr', 'timber-john'] as const;
export type BrandId = typeof BRAND_IDS[number];

export const BRAND_META: Record<BrandId, { name: string; emoji: string }> = {
  'thiocyn':     { name: 'Thiocyn',       emoji: '💊' },
  'take-a-shot': { name: 'Take A Shot',   emoji: '📸' },
  'dr-severin':  { name: 'Dr. Severin',   emoji: '🧬' },
  'paigh':       { name: 'Paigh',         emoji: '👜' },
  'wristr':      { name: 'Wristr',        emoji: '⌚' },
  'timber-john': { name: 'Timber & John', emoji: '🪵' },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandMetric {
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

const SOP_PHASE_COLORS = (phase: number) => {
  if (phase >= 5) return 'bg-green-500';
  if (phase >= 3) return 'bg-amber-400';
  if (phase >= 1) return 'bg-orange-400';
  return 'bg-gray-200';
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
    // Coerce TEXT columns from brand_metrics to numbers
    const parsed = (data ?? []).map((m: any) => ({
      ...m,
      followers: m.followers != null ? Number(m.followers) : null,
      engagement_rate: m.engagement_rate != null ? parseFloat(m.engagement_rate) : null,
      roas: m.roas != null ? Number(m.roas) : null,
      ad_spend: m.ad_spend != null ? Number(m.ad_spend) : null,
    }));
    setMetrics(parsed as BrandMetric[]);
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

export default BrandKPIsTab;
