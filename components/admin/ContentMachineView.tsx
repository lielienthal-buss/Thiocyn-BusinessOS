import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BrandHealth {
  brand_slug: string;
  brand_name: string;
  total_angles: number;
  untested: number;
  winners: number;
  performers: number;
  losers: number;
  test_coverage_pct: number | null;
  overall_win_rate_pct: number | null;
}

interface HashtagStrategy {
  brand_slug: string;
  branded_hashtag: string;
  niche_hashtags_high: string[];
  niche_hashtags_mid: string[];
  niche_hashtags_micro: string[];
  banned_hashtags: string[];
  rotation_rules: string;
}

interface ContentDirection {
  brand_slug: string;
  week_in_cycle: number;
  direction_key: string;
  title: string;
  description: string;
  angle_categories: string[];
}

interface PipelineItem {
  source: string;
  brand_slug: string;
  content_name: string;
  format: string | null;
  status: string;
  angle_code: string | null;
  angle_category: string | null;
  performance_tag: string | null;
  ctr: number | null;
  roas: number | null;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const BRANDS = ['all', 'thiocyn', 'take-a-shot', 'paigh', 'dr-severin', 'wristr'] as const;

const DIRECTION_LABELS: Record<string, { label: string; emoji: string }> = {
  problem_solution: { label: 'Problem → Lösung', emoji: '🔴' },
  storytelling: { label: 'Storytelling', emoji: '📖' },
  aesthetic: { label: 'Ästhetik / Routine', emoji: '✨' },
  myth_buster: { label: 'Mythos brechen', emoji: '⚡' },
};

// ─── Component ──────────────────────────────────────────────────────────────

const ContentMachineView: React.FC = () => {
  const [health, setHealth] = useState<BrandHealth[]>([]);
  const [hashtags, setHashtags] = useState<HashtagStrategy[]>([]);
  const [directions, setDirections] = useState<ContentDirection[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [subTab, setSubTab] = useState<'overview' | 'hashtags' | 'directions' | 'pipeline'>('overview');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [healthRes, hashRes, dirRes, pipeRes] = await Promise.all([
        supabase.from('brand_creative_health').select('*'),
        supabase.from('hashtag_strategies').select('*'),
        supabase.from('content_directions').select('*').order('brand_slug').order('week_in_cycle'),
        supabase.from('content_pipeline_overview').select('*').limit(100),
      ]);
      if (healthRes.data) setHealth(healthRes.data);
      if (hashRes.data) setHashtags(hashRes.data);
      if (dirRes.data) setDirections(dirRes.data);
      if (pipeRes.data) setPipeline(pipeRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filteredHashtags = selectedBrand === 'all' ? hashtags : hashtags.filter(h => h.brand_slug === selectedBrand);
  const filteredDirections = selectedBrand === 'all' ? directions : directions.filter(d => d.brand_slug === selectedBrand);
  const filteredPipeline = selectedBrand === 'all' ? pipeline : pipeline.filter(p => p.brand_slug === selectedBrand);

  // Current week in 4-week cycle
  const currentWeekInCycle = ((Math.floor((Date.now() - new Date('2026-01-05').getTime()) / (7 * 24 * 60 * 60 * 1000)) % 4) + 1);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-400" />
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Content Machine</h2>
          <p className="text-sm text-slate-400 mt-1">
            AI Creatives + Creator Content — Angles, Hashtags, Content-Richtungen
          </p>
        </div>
        <select
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          className="bg-slate-800 text-sm text-slate-200 border border-slate-700 rounded-lg px-3 py-1.5"
        >
          <option value="all">All Brands</option>
          {BRANDS.filter(b => b !== 'all').map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg w-fit">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'hashtags', label: 'Hashtag Strategies' },
          { key: 'directions', label: 'Content Directions' },
          { key: 'pipeline', label: 'Content Pipeline' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              subTab === tab.key ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ────────────────────────────────────────────── */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Current week direction */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <div className="text-xs text-amber-400 font-bold mb-1">Diese Woche: Content-Richtung {currentWeekInCycle}/4</div>
            <div className="text-white font-bold text-lg">
              {DIRECTION_LABELS[['problem_solution', 'storytelling', 'aesthetic', 'myth_buster'][currentWeekInCycle - 1]]?.emoji}{' '}
              {DIRECTION_LABELS[['problem_solution', 'storytelling', 'aesthetic', 'myth_buster'][currentWeekInCycle - 1]]?.label}
            </div>
          </div>

          {/* Brand Health Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {health.map(h => (
              <div key={h.brand_slug} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium">{h.brand_name}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="text-slate-400">Coverage: <span className="text-amber-400">{h.test_coverage_pct ?? 0}%</span></span>
                    <span className="text-slate-400">Win: <span className="text-green-400">{h.overall_win_rate_pct ?? 0}%</span></span>
                  </div>
                </div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-700">
                  {h.winners > 0 && <div className="bg-green-500" style={{ width: `${(h.winners / h.total_angles) * 100}%` }} />}
                  {h.performers > 0 && <div className="bg-blue-500" style={{ width: `${(h.performers / h.total_angles) * 100}%` }} />}
                  {h.losers > 0 && <div className="bg-red-500" style={{ width: `${(h.losers / h.total_angles) * 100}%` }} />}
                  {h.untested > 0 && <div className="bg-slate-600" style={{ width: `${(h.untested / h.total_angles) * 100}%` }} />}
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                  <span>{h.total_angles} Angles</span>
                  <span className="text-green-400">{h.winners}W</span>
                  <span className="text-red-400">{h.losers}L</span>
                  <span className="text-slate-400">{h.untested}U</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{hashtags.length}</div>
              <div className="text-xs text-slate-500">Hashtag Strategies</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{pipeline.filter(p => p.source === 'ai').length}</div>
              <div className="text-xs text-slate-500">AI Creatives</div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-white">{pipeline.filter(p => p.source === 'creator').length}</div>
              <div className="text-xs text-slate-500">Creator Content</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hashtag Strategies Tab ──────────────────────────────────── */}
      {subTab === 'hashtags' && (
        <div className="space-y-4">
          {filteredHashtags.map(h => (
            <div key={h.brand_slug} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold">{h.brand_slug}</h3>
                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-sm font-bold">{h.branded_hashtag}</span>
              </div>
              <div className="grid md:grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">High Volume</div>
                  <div className="flex flex-wrap gap-1">
                    {(h.niche_hashtags_high ?? []).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mid Volume</div>
                  <div className="flex flex-wrap gap-1">
                    {(h.niche_hashtags_mid ?? []).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Micro</div>
                  <div className="flex flex-wrap gap-1">
                    {(h.niche_hashtags_micro ?? []).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
              {(h.banned_hashtags ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Banned</div>
                  <div className="flex flex-wrap gap-1">
                    {h.banned_hashtags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-xs line-through">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {h.rotation_rules && (
                <p className="text-xs text-slate-500 mt-2 italic">{h.rotation_rules}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── Content Directions Tab ──────────────────────────────────── */}
      {subTab === 'directions' && (
        <div className="space-y-4">
          {/* Group by brand */}
          {[...new Set(filteredDirections.map(d => d.brand_slug))].map(brand => (
            <div key={brand} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <h3 className="text-white font-bold mb-3">{brand}</h3>
              <div className="grid md:grid-cols-4 gap-3">
                {filteredDirections.filter(d => d.brand_slug === brand).map(d => {
                  const dir = DIRECTION_LABELS[d.direction_key];
                  const isThisWeek = d.week_in_cycle === currentWeekInCycle;
                  return (
                    <div key={d.week_in_cycle}
                      className={`rounded-lg p-3 border ${isThisWeek ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700/50'}`}>
                      <div className="text-xs text-slate-500 mb-1">Woche {d.week_in_cycle}{isThisWeek ? ' ← jetzt' : ''}</div>
                      <div className="text-white font-medium text-sm">{dir?.emoji} {d.title}</div>
                      <p className="text-xs text-slate-400 mt-1">{d.description}</p>
                      <div className="flex gap-1 mt-2">
                        {d.angle_categories.map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px]">{cat}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Content Pipeline Tab ────────────────────────────────────── */}
      {subTab === 'pipeline' && (
        filteredPipeline.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            Noch kein Content in der Pipeline. Erstelle AI Creatives oder verteile Creator Tasks.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-slate-700">
                  <th className="text-left py-2 px-2">Source</th>
                  <th className="text-left py-2 px-2">Brand</th>
                  <th className="text-left py-2 px-2">Content</th>
                  <th className="text-left py-2 px-2">Format</th>
                  <th className="text-left py-2 px-2">Angle</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">CTR</th>
                  <th className="text-right py-2 px-2">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPipeline.map((p, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        p.source === 'ai' ? 'bg-blue-500/20 text-blue-400' : 'bg-violet-500/20 text-violet-400'
                      }`}>
                        {p.source === 'ai' ? 'AI' : 'Creator'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-300">{p.brand_slug}</td>
                    <td className="py-2 px-2 text-slate-300 truncate max-w-[200px]">{p.content_name}</td>
                    <td className="py-2 px-2 text-slate-400 text-xs">{p.format ?? '—'}</td>
                    <td className="py-2 px-2 font-mono text-amber-400 text-xs">{p.angle_code ?? '—'}</td>
                    <td className="py-2 px-2 text-slate-300 text-xs">{p.status}</td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      {p.ctr ? `${(p.ctr * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-300">
                      {p.roas ? `${p.roas.toFixed(1)}x` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

export default ContentMachineView;
