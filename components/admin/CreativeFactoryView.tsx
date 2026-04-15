// @deprecated 2026-04-15 — consolidated into ContentCalendarView / BriefsHubView (Phase 3)
// Will be removed 2 weeks after user verifies the new consolidated views.
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Angle {
  id: string;
  brand_slug: string;
  code: string;
  category: string;
  name: string;
  hook_de: string | null;
  hook_en: string | null;
  persona: string[] | null;
  awareness_stage: string;
  format: string[] | null;
  performance_tag: string;
  avg_ctr: number;
  avg_roas: number;
  avg_completion: number;
  total_assets: number;
  total_winners: number;
  win_rate: number;
}

interface Asset {
  id: string;
  brand_slug: string;
  angle_id: string | null;
  campaign: string | null;
  asset_name: string;
  format: string;
  platform: string;
  version: number;
  hook_text: string | null;
  status: string;
  duration_sec: number | null;
  produced_by: string | null;
  created_at: string;
}

interface BrandHealth {
  brand_slug: string;
  brand_name: string;
  total_angles: number;
  untested: number;
  testing: number;
  winners: number;
  performers: number;
  losers: number;
  test_coverage_pct: number | null;
  overall_win_rate_pct: number | null;
}

interface Insight {
  id: string;
  brand_slug: string | null;
  insight_type: string;
  title: string;
  description: string;
  confidence: string;
  actionable: boolean;
  action_taken: boolean;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  problem:      { label: 'Problem',      emoji: '🔴', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  mechanism:    { label: 'Mechanism',     emoji: '⚙️', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  aspiration:   { label: 'Aspiration',    emoji: '✨', color: 'bg-[#E09B37]/12 text-[#E09B37] border-[#E09B37]/25' },
  social_proof: { label: 'Social Proof',  emoji: '👥', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  contrarian:   { label: 'Contrarian',    emoji: '⚡', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  identity:     { label: 'Identity',      emoji: '🪞', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  trust:        { label: 'Trust',         emoji: '🤝', color: 'bg-slate-500/10 text-[#515154] border-slate-500/20' },
};

const PERF_TAGS: Record<string, { label: string; color: string }> = {
  untested:  { label: 'Untested',  color: 'bg-slate-700 text-[#1d1d1f]' },
  testing:   { label: 'Testing',   color: 'bg-yellow-500/20 text-yellow-400' },
  winner:    { label: 'Winner',    color: 'bg-green-500/20 text-green-400' },
  performer: { label: 'Performer', color: 'bg-blue-500/20 text-blue-400' },
  loser:     { label: 'Loser',     color: 'bg-red-500/20 text-red-400' },
  retired:   { label: 'Retired',   color: 'bg-slate-600 text-[#515154]' },
};

const BRANDS = ['thiocyn', 'take-a-shot', 'paigh', 'dr-severin', 'wristr', 'timber-john'] as const;

// ─── Component ──────────────────────────────────────────────────────────────

const CreativeFactoryView: React.FC = () => {
  const [angles, setAngles] = useState<Angle[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [health, setHealth] = useState<BrandHealth[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [subTab, setSubTab] = useState<'scoreboard' | 'assets' | 'insights' | 'health'>('health');

  // ─── Data Fetching ──────────────────────────────────────────────────────

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [anglesRes, assetsRes, healthRes, insightsRes] = await Promise.all([
        supabase.from('creative_angles').select('*').order('brand_slug').order('code'),
        supabase.from('creative_assets').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('brand_creative_health').select('*'),
        supabase.from('angle_insights').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (anglesRes.data) setAngles(anglesRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);
      if (healthRes.data) setHealth(healthRes.data);
      if (insightsRes.data) setInsights(insightsRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ─── Filters ────────────────────────────────────────────────────────────

  const filteredAngles = useMemo(() => {
    return angles.filter(a => {
      if (selectedBrand !== 'all' && a.brand_slug !== selectedBrand) return false;
      if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
      return true;
    });
  }, [angles, selectedBrand, selectedCategory]);

  const filteredAssets = useMemo(() => {
    if (selectedBrand === 'all') return assets;
    return assets.filter(a => a.brand_slug === selectedBrand);
  }, [assets, selectedBrand]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const tested = filteredAngles.filter(a => a.performance_tag !== 'untested');
    return {
      total: filteredAngles.length,
      untested: filteredAngles.filter(a => a.performance_tag === 'untested').length,
      winners: filteredAngles.filter(a => a.performance_tag === 'winner').length,
      losers: filteredAngles.filter(a => a.performance_tag === 'loser').length,
      avgWinRate: tested.length > 0
        ? (tested.reduce((sum, a) => sum + a.win_rate, 0) / tested.length).toFixed(1)
        : '—',
    };
  }, [filteredAngles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1d1d1f]">Creative Factory</h2>
          <p className="text-sm text-[#515154] mt-1">
            Angle Libraries, Asset Tracking & Performance Feedback Loop
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedBrand}
            onChange={e => setSelectedBrand(e.target.value)}
            className="bg-slate-800 text-sm text-[#1d1d1f] border border-slate-700 rounded-lg px-3 py-1.5"
          >
            <option value="all">All Brands</option>
            {BRANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Angles', value: stats.total, color: 'text-[#1d1d1f]' },
          { label: 'Untested', value: stats.untested, color: 'text-[#515154]' },
          { label: 'Winners', value: stats.winners, color: 'text-green-400' },
          { label: 'Losers', value: stats.losers, color: 'text-red-400' },
          { label: 'Avg Win Rate', value: `${stats.avgWinRate}%`, color: 'text-[#E09B37]' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-[#6e6e73] mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        {(['health', 'scoreboard', 'assets', 'insights'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              subTab === tab
                ? 'bg-amber-500/20 text-[#E09B37]'
                : 'text-[#515154] hover:text-[#1d1d1f]'
            }`}
          >
            {tab === 'health' ? 'Brand Health' : tab === 'scoreboard' ? 'Angle Scoreboard' : tab === 'assets' ? 'Assets' : 'Insights'}
          </button>
        ))}
      </div>

      {/* ─── Brand Health Tab ───────────────────────────────────────────── */}
      {subTab === 'health' && (
        <div className="grid gap-4">
          {health.map(h => (
            <div key={h.brand_slug} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#1d1d1f] font-medium">{h.brand_name}</h3>
                <div className="flex gap-2 text-xs">
                  <span className="text-[#515154]">Coverage: <span className="text-[#E09B37]">{h.test_coverage_pct ?? 0}%</span></span>
                  <span className="text-[#515154]">Win Rate: <span className="text-green-400">{h.overall_win_rate_pct ?? 0}%</span></span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
                {h.winners > 0 && (
                  <div className="bg-green-500" style={{ width: `${(h.winners / h.total_angles) * 100}%` }} title={`${h.winners} Winners`} />
                )}
                {h.performers > 0 && (
                  <div className="bg-blue-500" style={{ width: `${(h.performers / h.total_angles) * 100}%` }} title={`${h.performers} Performers`} />
                )}
                {h.testing > 0 && (
                  <div className="bg-yellow-500" style={{ width: `${(h.testing / h.total_angles) * 100}%` }} title={`${h.testing} Testing`} />
                )}
                {h.losers > 0 && (
                  <div className="bg-red-500" style={{ width: `${(h.losers / h.total_angles) * 100}%` }} title={`${h.losers} Losers`} />
                )}
                {h.untested > 0 && (
                  <div className="bg-slate-600" style={{ width: `${(h.untested / h.total_angles) * 100}%` }} title={`${h.untested} Untested`} />
                )}
              </div>
              <div className="flex gap-3 mt-2 text-xs text-[#6e6e73]">
                <span>{h.total_angles} Angles</span>
                <span className="text-green-400">{h.winners} W</span>
                <span className="text-blue-400">{h.performers} P</span>
                <span className="text-yellow-400">{h.testing} T</span>
                <span className="text-red-400">{h.losers} L</span>
                <span className="text-[#515154]">{h.untested} U</span>
                {h.categories_missing > 0 && (
                  <span className="text-orange-400">{h.categories_missing} categories missing</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Angle Scoreboard Tab ───────────────────────────────────────── */}
      {subTab === 'scoreboard' && (
        <div>
          {/* Category filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                selectedCategory === 'all' ? 'bg-slate-600 text-[#1d1d1f] border-slate-500' : 'text-[#515154] border-slate-700 hover:border-slate-500'
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji, color }]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  selectedCategory === key ? color : 'text-[#515154] border-slate-700 hover:border-slate-500'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Angles table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#6e6e73] text-xs border-b border-slate-700">
                  <th className="text-left py-2 px-2">Brand</th>
                  <th className="text-left py-2 px-2">Code</th>
                  <th className="text-left py-2 px-2">Category</th>
                  <th className="text-left py-2 px-2 min-w-[200px]">Hook</th>
                  <th className="text-center py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">CTR</th>
                  <th className="text-right py-2 px-2">ROAS</th>
                  <th className="text-right py-2 px-2">Win Rate</th>
                  <th className="text-right py-2 px-2">Assets</th>
                </tr>
              </thead>
              <tbody>
                {filteredAngles.map(angle => {
                  const cat = CATEGORY_LABELS[angle.category];
                  const perf = PERF_TAGS[angle.performance_tag] ?? PERF_TAGS.untested;
                  return (
                    <tr key={angle.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="py-2 px-2 text-[#1d1d1f]">{angle.brand_slug}</td>
                      <td className="py-2 px-2 font-mono text-[#E09B37] text-xs">{angle.code}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${cat?.color ?? ''}`}>
                          {cat?.emoji} {cat?.label}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[#1d1d1f] truncate max-w-[300px]" title={angle.hook_de ?? ''}>
                        {angle.hook_de ?? angle.name}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${perf.color}`}>
                          {perf.label}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-[#1d1d1f]">
                        {angle.avg_ctr > 0 ? `${(angle.avg_ctr * 100).toFixed(2)}%` : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-[#1d1d1f]">
                        {angle.avg_roas > 0 ? `${angle.avg_roas.toFixed(1)}x` : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-[#1d1d1f]">
                        {angle.total_assets > 0 ? `${angle.win_rate}%` : '—'}
                      </td>
                      <td className="py-2 px-2 text-right text-[#515154]">{angle.total_assets}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Assets Tab ─────────────────────────────────────────────────── */}
      {subTab === 'assets' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#6e6e73] text-xs border-b border-slate-700">
                <th className="text-left py-2 px-2">Asset Name</th>
                <th className="text-left py-2 px-2">Format</th>
                <th className="text-left py-2 px-2">Platform</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-left py-2 px-2">Produced By</th>
                <th className="text-left py-2 px-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="py-2 px-2 font-mono text-xs text-[#E09B37]">{asset.asset_name}</td>
                  <td className="py-2 px-2 text-[#1d1d1f]">{asset.format}</td>
                  <td className="py-2 px-2 text-[#1d1d1f]">{asset.platform}</td>
                  <td className="py-2 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      asset.status === 'live' ? 'bg-green-500/20 text-green-400' :
                      asset.status === 'ready' ? 'bg-blue-500/20 text-blue-400' :
                      asset.status === 'retired' ? 'bg-slate-600 text-[#515154]' :
                      'bg-slate-700 text-[#1d1d1f]'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-[#515154] text-xs">{asset.produced_by ?? '—'}</td>
                  <td className="py-2 px-2 text-[#6e6e73] text-xs">
                    {new Date(asset.created_at).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
              {filteredAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6e6e73]">
                    No assets yet. Create your first creative asset to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Insights Tab ───────────────────────────────────────────────── */}
      {subTab === 'insights' && (
        <div className="space-y-3">
          {insights.length === 0 && (
            <div className="text-center py-8 text-[#6e6e73]">
              No insights yet. Run the Performance Feedback Loop to generate insights.
            </div>
          )}
          {insights.map(insight => (
            <div
              key={insight.id}
              className={`bg-slate-800/50 border rounded-xl p-4 ${
                insight.confidence === 'proven' ? 'border-green-500/30' :
                insight.confidence === 'high' ? 'border-amber-500/30' :
                'border-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      insight.insight_type === 'pattern' ? 'bg-purple-500/20 text-purple-400' :
                      insight.insight_type === 'cross_brand' ? 'bg-amber-500/20 text-[#E09B37]' :
                      insight.insight_type === 'warning' ? 'bg-red-500/20 text-red-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {insight.insight_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      insight.confidence === 'proven' ? 'bg-green-500/20 text-green-400' :
                      insight.confidence === 'high' ? 'bg-amber-500/20 text-[#E09B37]' :
                      'bg-slate-700 text-[#515154]'
                    }`}>
                      {insight.confidence}
                    </span>
                    {insight.brand_slug && (
                      <span className="text-xs text-[#6e6e73]">{insight.brand_slug}</span>
                    )}
                  </div>
                  <h4 className="text-[#1d1d1f] font-medium">{insight.title}</h4>
                  <p className="text-sm text-[#515154] mt-1">{insight.description}</p>
                </div>
                {insight.actionable && !insight.action_taken && (
                  <span className="px-2 py-1 bg-[#E09B37]/12 text-[#E09B37] text-xs rounded-lg whitespace-nowrap ml-3">
                    Action needed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreativeFactoryView;
