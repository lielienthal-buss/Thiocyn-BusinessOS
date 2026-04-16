import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import { LoadingState, EmptyState } from '@/components/ui/DataStates';
import { useBrand } from '@/lib/BrandContext';

// ─── Types ──────────────────────────────────────────────────────────────────

type BriefType = 'all' | 'campaign' | 'daily' | 'agency' | 'creative';

interface CampaignBriefRow {
  id: string;
  campaign_id: string;
  objective: string | null;
  target_audience: string | null;
  insight: string | null;
  key_message: string | null;
  angle: string | null;
  offer: string | null;
  budget: number | null;
  timeline_start: string | null;
  timeline_end: string | null;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CampaignMeta {
  id: string;
  name: string | null;
  brand_slug: string | null;
  status: string | null;
}

interface DailyBriefingRow {
  id: string;
  user_id: string;
  date: string;
  summary: string | null;
  generated_at: string | null;
}

interface CreativeAngle {
  id: string;
  brand_slug: string;
  code: string;
  category: string;
  name: string;
  hook_de: string | null;
  hook_en: string | null;
  performance_tag: string;
  avg_ctr: number;
  avg_roas: number;
  total_assets: number;
  win_rate: number;
}

// Generated "agency briefs" — may be persisted to agency_briefs, or session-only if insert failed.
interface GeneratedBrief {
  id: string;
  brand: string;
  task_raw: string;
  assignee?: string;
  deadline?: string;
  context?: string;
  output: string;
  created_at: string;
  notSaved?: boolean; // true = insert failed, lives only in session state
}

type AgencyBriefType = 'agency' | 'task' | 'creative' | 'other';
type AgencyBriefStatus = 'draft' | 'sent' | 'in_progress' | 'completed' | 'archived';

interface AgencyBriefRow {
  id: string;
  type: AgencyBriefType;
  title: string;
  brand_id: string | null;
  agency_id: string | null;
  body: string;
  prompt_input: {
    brand?: string;
    task_raw?: string;
    assignee?: string;
    deadline?: string;
    context?: string;
    type?: AgencyBriefType;
  } | null;
  assignee: string | null;
  deadline: string | null;
  status: AgencyBriefStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<AgencyBriefStatus, string> = {
  draft: 'bg-slate-50 text-slate-700',
  sent: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  completed: 'bg-green-50 text-green-700',
  archived: 'bg-slate-100 text-slate-700',
};

const STATUS_LIST: AgencyBriefStatus[] = ['draft', 'sent', 'in_progress', 'completed', 'archived'];
const TYPE_LIST: AgencyBriefType[] = ['agency', 'task', 'creative', 'other'];

// ─── Constants ──────────────────────────────────────────────────────────────

const BRANDS = ['Thiocyn', 'Take A Shot', 'Dr. Severin', 'Paigh', 'Wristr', 'Timber & John'] as const;
type Brand = typeof BRANDS[number];

// Display name → DB brand slug. brand_id in agency_briefs must be slug, not display name.
const BRAND_NAME_TO_SLUG: Record<Brand, string> = {
  'Thiocyn': 'thiocyn',
  'Take A Shot': 'take-a-shot',
  'Dr. Severin': 'dr-severin',
  'Paigh': 'paigh',
  'Wristr': 'wristr',
  'Timber & John': 'timber-john',
};

const BRAND_SLUG_TO_NAME: Record<string, Brand> = Object.fromEntries(
  (Object.entries(BRAND_NAME_TO_SLUG) as [Brand, string][]).map(([n, s]) => [s, n])
) as Record<string, Brand>;

const TASK_EXAMPLES = [
  'Mach 3 UGC Creatives für Instagram — Sommer-Feeling, Conversion',
  '5 Hook-Varianten für Meta Ads, Cold Audience',
  'Email-Sequenz für Neukunden nach Erstkauf (3 Mails)',
  'Influencer-Outreach Template für Micro-Creator (10k-50k)',
  'Product-Launch Posting-Plan für nächste 2 Wochen',
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  problem: { label: 'Problem', emoji: '🔴' },
  mechanism: { label: 'Mechanism', emoji: '⚙️' },
  aspiration: { label: 'Aspiration', emoji: '✨' },
  social_proof: { label: 'Social Proof', emoji: '👥' },
  contrarian: { label: 'Contrarian', emoji: '⚡' },
  identity: { label: 'Identity', emoji: '🪞' },
  trust: { label: 'Trust', emoji: '🤝' },
};

const PERF_COLORS: Record<string, string> = {
  winner: 'bg-green-50 text-green-700',
  performer: 'bg-blue-50 text-blue-700',
  testing: 'bg-yellow-50 text-yellow-700',
  loser: 'bg-red-50 text-red-700',
  untested: 'bg-slate-50 text-slate-700',
  retired: 'bg-slate-100 text-slate-700',
};

// ─── Markdown Renderer (reused from BriefingGeneratorView, light-theme) ─────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length < 2) {
      tableRows = [];
      inTable = false;
      return;
    }
    const headers = tableRows[0];
    const rows = tableRows.slice(2);
    elements.push(
      <div key={key} className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="text-left text-slate-500 text-xs uppercase tracking-wider font-bold py-2 px-3 border-b border-slate-200"
                >
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="py-2 px-3 text-slate-700 text-sm"
                    dangerouslySetInnerHTML={{
                      __html: cell.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'),
                    }}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, i) => {
    const key = `line-${i}`;
    if (line.startsWith('|')) {
      inTable = true;
      tableRows.push(line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));
      return;
    }
    if (inTable) flushTable(`table-${i}`);

    if (line.startsWith('# ')) {
      elements.push(<h1 key={key} className="text-xl font-black text-slate-900 mt-2 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key} className="text-sm font-black text-slate-900 uppercase tracking-wider mt-5 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key} className="text-sm font-bold text-slate-700 mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key} className="border-slate-200 my-3" />);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li
          key={key}
          className="text-slate-700 text-sm ml-5 mb-0.5 list-disc"
          dangerouslySetInnerHTML={{
            __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>'),
          }}
        />
      );
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <li
          key={key}
          className="text-slate-700 text-sm ml-5 mb-0.5 list-decimal"
          dangerouslySetInnerHTML={{
            __html: line.replace(/^\d+\. /, '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>'),
          }}
        />
      );
    } else if (line.trim() !== '') {
      elements.push(
        <p
          key={key}
          className="text-slate-700 text-sm mb-2 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>'),
          }}
        />
      );
    } else {
      elements.push(<div key={key} className="h-1" />);
    }
  });
  if (inTable) flushTable('table-end');
  return elements;
}

// ─── Component ──────────────────────────────────────────────────────────────

const BriefsHubView: React.FC = () => {
  const { activeBrand } = useBrand();
  const [typeFilter, setTypeFilter] = useState<BriefType>('all');
  const [loading, setLoading] = useState(true);
  const [campaignBriefs, setCampaignBriefs] = useState<CampaignBriefRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [dailyBriefings, setDailyBriefings] = useState<DailyBriefingRow[]>([]);
  const [creativeAngles, setCreativeAngles] = useState<CreativeAngle[]>([]);
  const [generatedBriefs, setGeneratedBriefs] = useState<GeneratedBrief[]>([]);
  const [agencyBriefs, setAgencyBriefs] = useState<AgencyBriefRow[]>([]);

  const [drawerContent, setDrawerContent] = useState<
    | { kind: 'campaign'; brief: CampaignBriefRow; campaign: CampaignMeta | null }
    | { kind: 'daily'; briefing: DailyBriefingRow }
    | { kind: 'angle'; angle: CreativeAngle }
    | { kind: 'generated'; brief: GeneratedBrief }
    | { kind: 'agency'; brief: AgencyBriefRow }
    | null
  >(null);

  const [showCreateModal, setShowCreateModal] = useState<null | BriefType>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [cb, cm, db, ca, ab] = await Promise.all([
        supabase.from('campaign_briefs').select('*').order('created_at', { ascending: false }),
        supabase.from('campaigns').select('id, name, brand_slug, status'),
        supabase.from('daily_briefings').select('id, user_id, date, summary, generated_at').order('date', { ascending: false }).limit(30),
        supabase.from('creative_angles').select('*').order('brand_slug').order('code'),
        supabase.from('agency_briefs').select('*').order('created_at', { ascending: false }),
      ]);
      if (cb.data) setCampaignBriefs(cb.data as CampaignBriefRow[]);
      if (cm.data) setCampaigns(cm.data as CampaignMeta[]);
      if (db.data) setDailyBriefings(db.data as DailyBriefingRow[]);
      if (ca.data) setCreativeAngles(ca.data as CreativeAngle[]);
      if (ab.data) setAgencyBriefs(ab.data as AgencyBriefRow[]);
      setLoading(false);
    };
    load();
  }, []);

  // ─── Agency-brief mutators ────────────────────────────────────────────
  const updateAgencyBriefStatus = async (id: string, status: AgencyBriefStatus) => {
    const { error: err } = await supabase
      .from('agency_briefs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (err) {
      // eslint-disable-next-line no-console
      console.error('[BriefsHub] status update failed', err);
      return;
    }
    setAgencyBriefs(prev => prev.map(b => (b.id === id ? { ...b, status } : b)));
    setDrawerContent(d => (d && d.kind === 'agency' && d.brief.id === id ? { kind: 'agency', brief: { ...d.brief, status } } : d));
  };

  const deleteAgencyBrief = async (id: string) => {
    const { error: err } = await supabase.from('agency_briefs').delete().eq('id', id);
    if (err) {
      // eslint-disable-next-line no-console
      console.error('[BriefsHub] delete failed', err);
      return;
    }
    setAgencyBriefs(prev => prev.filter(b => b.id !== id));
    setDrawerContent(null);
  };

  const campaignById = useMemo(() => {
    const m = new Map<string, CampaignMeta>();
    campaigns.forEach(c => m.set(c.id, c));
    return m;
  }, [campaigns]);

  // ─── Brand-scoped derived lists ───────────────────────────────────────
  const activeSlug = activeBrand?.slug ?? null;

  const fCampaignBriefs = useMemo(() => {
    if (!activeSlug) return campaignBriefs;
    return campaignBriefs.filter(b => {
      const c = campaignById.get(b.campaign_id);
      return c?.brand_slug === activeSlug;
    });
  }, [campaignBriefs, campaignById, activeSlug]);

  const fCreativeAngles = useMemo(() => {
    if (!activeSlug) return creativeAngles;
    return creativeAngles.filter(a => a.brand_slug === activeSlug);
  }, [creativeAngles, activeSlug]);

  const fAgencyBriefs = useMemo(() => {
    if (!activeSlug) return agencyBriefs;
    return agencyBriefs.filter(b => b.brand_id === activeSlug);
  }, [agencyBriefs, activeSlug]);

  const fGeneratedBriefs = useMemo(() => {
    if (!activeSlug) return generatedBriefs;
    const expectedName = BRAND_SLUG_TO_NAME[activeSlug];
    return generatedBriefs.filter(g => g.brand === expectedName || g.brand === activeSlug);
  }, [generatedBriefs, activeSlug]);

  // ─── Counts (brand-scoped) ────────────────────────────────────────────
  const agencyCount = fAgencyBriefs.length + fGeneratedBriefs.length;
  const counts = {
    all:
      fCampaignBriefs.length + dailyBriefings.length + fCreativeAngles.length + agencyCount,
    campaign: fCampaignBriefs.length,
    daily: dailyBriefings.length,
    agency: agencyCount,
    creative: fCreativeAngles.length,
  };

  if (loading) return <LoadingState label="Briefs laden…" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Briefs Hub</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Alle Briefs an einem Ort: Campaign Briefs, Daily Briefings, Agency-/Task-Briefs, Creative Angles.
            {activeBrand && (
              <span className="ml-2 text-indigo-700 font-semibold">· {activeBrand.name}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal('agency')}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          + Neues Brief generieren
        </button>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { k: 'all', l: `All (${counts.all})` },
            { k: 'campaign', l: `Campaign (${counts.campaign})` },
            { k: 'daily', l: `Daily (Jarvis) (${counts.daily})` },
            { k: 'agency', l: `Agency / Task (${counts.agency})` },
            { k: 'creative', l: `Creative Angles (${counts.creative})` },
          ] as const
        ).map(t => (
          <button
            key={t.k}
            onClick={() => setTypeFilter(t.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ring-1 ${
              typeFilter === t.k
                ? 'bg-indigo-600 text-white ring-indigo-600'
                : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Sections (rendered based on filter) */}
      {(typeFilter === 'all' || typeFilter === 'campaign') && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Campaign Briefs</h3>
            <span className="text-xs text-slate-500">{fCampaignBriefs.length}</span>
          </div>
          {fCampaignBriefs.length === 0 ? (
            <EmptyState
              icon="📋"
              title="Keine Campaign Briefs"
              description="Lege zuerst eine Campaign an (Marketing → Campaigns) und erzeuge dort einen Brief."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-200">
                    <th className="text-left py-2 px-3">Campaign</th>
                    <th className="text-left py-2 px-3">Brand</th>
                    <th className="text-left py-2 px-3">Objective</th>
                    <th className="text-left py-2 px-3">Budget</th>
                    <th className="text-left py-2 px-3">Timeline</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {fCampaignBriefs.map(b => {
                    const c = campaignById.get(b.campaign_id) ?? null;
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setDrawerContent({ kind: 'campaign', brief: b, campaign: c })}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900">{c?.name ?? b.campaign_id.slice(0, 8)}</td>
                        <td className="py-2 px-3 text-slate-700">{c?.brand_slug ?? '—'}</td>
                        <td className="py-2 px-3 text-slate-700 max-w-[280px] truncate" title={b.objective ?? ''}>
                          {b.objective ?? '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {b.budget ? `${b.budget.toLocaleString('de-DE')} €` : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-xs">
                          {b.timeline_start ? new Date(b.timeline_start).toLocaleDateString('de-DE') : '—'}
                          {b.timeline_end ? ` → ${new Date(b.timeline_end).toLocaleDateString('de-DE')}` : ''}
                        </td>
                        <td className="py-2 px-3">
                          {b.approved_at ? (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700">approved</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-50 text-slate-700">draft</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-xs">
                          {new Date(b.updated_at).toLocaleDateString('de-DE')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(typeFilter === 'all' || typeFilter === 'daily') && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Daily Briefings (Jarvis)</h3>
            <span className="text-xs text-slate-500">{dailyBriefings.length}</span>
          </div>
          {dailyBriefings.length === 0 ? (
            <EmptyState icon="🌅" title="Noch keine Daily Briefings" />
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {dailyBriefings.slice(0, 12).map(d => (
                <button
                  key={d.id}
                  onClick={() => setDrawerContent({ kind: 'daily', briefing: d })}
                  className="text-left ring-1 ring-slate-200 hover:ring-slate-300 rounded-xl p-3 hover:bg-slate-50 transition-all"
                >
                  <div className="text-xs font-bold text-slate-500">
                    {new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </div>
                  <div className="text-sm text-slate-700 mt-1 line-clamp-2">
                    {d.summary ?? 'Kein Summary.'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(typeFilter === 'all' || typeFilter === 'agency') && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Agency / Task Briefs</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {fAgencyBriefs.length} gespeichert
                {fGeneratedBriefs.length > 0 ? ` · ${fGeneratedBriefs.length} unsaved` : ''}
              </span>
              <button
                onClick={() => setShowCreateModal('agency')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                + Neu
              </button>
            </div>
          </div>
          {fAgencyBriefs.length === 0 && fGeneratedBriefs.length === 0 ? (
            <EmptyState
              icon="⚡"
              title="Noch keine Briefs generiert"
              description="Klick '+ Neues Brief generieren' um den AI-Generator zu öffnen."
              action={{ label: 'Generator öffnen', onClick: () => setShowCreateModal('agency') }}
            />
          ) : (
            <div className="grid gap-2">
              {fAgencyBriefs.map(b => (
                <button
                  key={b.id}
                  onClick={() => setDrawerContent({ kind: 'agency', brief: b })}
                  className="text-left ring-1 ring-slate-200 hover:ring-slate-300 rounded-xl p-3 hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-[10px] font-bold">
                      {b.brand_id ?? '—'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded-full text-[10px] font-bold uppercase">
                      {b.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[b.status]}`}>
                      {b.status}
                    </span>
                    {b.deadline && (
                      <span className="text-[10px] text-slate-500">
                        ⏱ {new Date(b.deadline).toLocaleDateString('de-DE')}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 ml-auto">
                      {new Date(b.created_at).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">{b.title}</div>
                  {b.assignee && (
                    <div className="text-[11px] text-slate-500 mt-0.5">→ {b.assignee}</div>
                  )}
                </button>
              ))}
              {fGeneratedBriefs.map(g => (
                <button
                  key={g.id}
                  onClick={() => setDrawerContent({ kind: 'generated', brief: g })}
                  className="text-left ring-1 ring-amber-200 bg-amber-50 rounded-xl p-3 hover:ring-amber-300 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-[10px] font-bold">
                      {g.brand}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold">
                      🟡 Not saved
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(g.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">{g.task_raw}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {(typeFilter === 'all' || typeFilter === 'creative') && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Creative Angles</h3>
            <span className="text-xs text-slate-500">{fCreativeAngles.length}</span>
          </div>
          {fCreativeAngles.length === 0 ? (
            <EmptyState icon="🎯" title="Keine Creative Angles" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-slate-200">
                    <th className="text-left py-2 px-3">Brand</th>
                    <th className="text-left py-2 px-3">Code</th>
                    <th className="text-left py-2 px-3">Category</th>
                    <th className="text-left py-2 px-3">Hook</th>
                    <th className="text-center py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">CTR</th>
                    <th className="text-right py-2 px-3">ROAS</th>
                    <th className="text-right py-2 px-3">Assets</th>
                  </tr>
                </thead>
                <tbody>
                  {fCreativeAngles.slice(0, 50).map(a => {
                    const cat = CATEGORY_LABELS[a.category];
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => setDrawerContent({ kind: 'angle', angle: a })}
                      >
                        <td className="py-2 px-3 text-slate-700">{a.brand_slug}</td>
                        <td className="py-2 px-3 font-mono text-amber-700 text-xs">{a.code}</td>
                        <td className="py-2 px-3 text-slate-700">
                          {cat?.emoji} {cat?.label ?? a.category}
                        </td>
                        <td className="py-2 px-3 max-w-[300px] truncate text-slate-700" title={a.hook_de ?? ''}>
                          {a.hook_de ?? a.name}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${PERF_COLORS[a.performance_tag] ?? 'bg-slate-50 text-slate-700'}`}>
                            {a.performance_tag}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {a.avg_ctr > 0 ? `${(a.avg_ctr * 100).toFixed(2)}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {a.avg_roas > 0 ? `${a.avg_roas.toFixed(1)}x` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">{a.total_assets}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {fCreativeAngles.length > 50 && (
                <p className="text-xs text-slate-500 text-center mt-2">
                  {fCreativeAngles.length - 50} weitere Angles — siehe Creative Factory für Vollansicht.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Create Modal (AI Generator) ────────────────────────────────── */}
      {showCreateModal === 'agency' && (
        <GeneratorModal
          initialBrand={activeBrand ? BRAND_SLUG_TO_NAME[activeBrand.slug] ?? 'Take A Shot' : 'Take A Shot'}
          onClose={() => setShowCreateModal(null)}
          onPersisted={row => {
            setAgencyBriefs(prev => [row, ...prev]);
            setShowCreateModal(null);
            setDrawerContent({ kind: 'agency', brief: row });
          }}
          onPersistFailed={g => {
            setGeneratedBriefs(prev => [g, ...prev]);
            setShowCreateModal(null);
            setDrawerContent({ kind: 'generated', brief: g });
          }}
        />
      )}

      {/* ─── Drawer ──────────────────────────────────────────────────────── */}
      {drawerContent && (
        <Drawer onClose={() => setDrawerContent(null)}>
          {drawerContent.kind === 'campaign' && (
            <CampaignBriefDetail brief={drawerContent.brief} campaign={drawerContent.campaign} />
          )}
          {drawerContent.kind === 'daily' && <DailyBriefDetail briefing={drawerContent.briefing} />}
          {drawerContent.kind === 'angle' && <AngleDetail angle={drawerContent.angle} />}
          {drawerContent.kind === 'generated' && <GeneratedBriefDetail brief={drawerContent.brief} />}
          {drawerContent.kind === 'agency' && (
            <AgencyBriefDetail
              brief={drawerContent.brief}
              onStatusChange={s => updateAgencyBriefStatus(drawerContent.brief.id, s)}
              onDelete={() => deleteAgencyBrief(drawerContent.brief.id)}
            />
          )}
        </Drawer>
      )}
    </div>
  );
};

// ─── Drawer ─────────────────────────────────────────────────────────────────

const Drawer: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div className="fixed inset-0 z-50 flex justify-end">
    <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
    <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl ring-1 ring-slate-200">
      <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brief Detail</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-lg">
          ×
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

// ─── Detail Panels ──────────────────────────────────────────────────────────

const CampaignBriefDetail: React.FC<{ brief: CampaignBriefRow; campaign: CampaignMeta | null }> = ({
  brief,
  campaign,
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-lg font-black text-slate-900">{campaign?.name ?? 'Untitled Campaign'}</h3>
      <p className="text-xs text-slate-500">Brand: {campaign?.brand_slug ?? '—'}</p>
    </div>
    {(
      [
        ['Objective', brief.objective],
        ['Target Audience', brief.target_audience],
        ['Insight', brief.insight],
        ['Key Message', brief.key_message],
        ['Angle', brief.angle],
        ['Offer', brief.offer],
        ['Notes', brief.notes],
      ] as const
    ).map(([label, val]) => (
      <div key={label}>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-sm text-slate-700 whitespace-pre-wrap">{val ?? '—'}</div>
      </div>
    ))}
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Budget</div>
        <div className="text-sm text-slate-700">
          {brief.budget ? `${brief.budget.toLocaleString('de-DE')} €` : '—'}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Timeline</div>
        <div className="text-sm text-slate-700">
          {brief.timeline_start ? new Date(brief.timeline_start).toLocaleDateString('de-DE') : '—'}
          {brief.timeline_end ? ` → ${new Date(brief.timeline_end).toLocaleDateString('de-DE')}` : ''}
        </div>
      </div>
    </div>
  </div>
);

const DailyBriefDetail: React.FC<{ briefing: DailyBriefingRow }> = ({ briefing }) => (
  <div className="space-y-3">
    <h3 className="text-lg font-black text-slate-900">
      {new Date(briefing.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
    </h3>
    <p className="text-sm text-slate-700">{briefing.summary ?? 'Kein Summary.'}</p>
    <p className="text-xs text-slate-500">
      Komplettes Daily Briefing siehe <span className="font-semibold">Inbox → Daily Briefing</span>.
    </p>
  </div>
);

const AngleDetail: React.FC<{ angle: CreativeAngle }> = ({ angle }) => {
  const cat = CATEGORY_LABELS[angle.category];
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-amber-700">{angle.code}</span>
          <span className="text-xs text-slate-500">{angle.brand_slug}</span>
        </div>
        <h3 className="text-lg font-black text-slate-900 mt-1">{angle.name}</h3>
        <div className="text-xs text-slate-500 mt-1">
          {cat?.emoji} {cat?.label} · {angle.performance_tag}
        </div>
      </div>
      {angle.hook_de && (
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hook (DE)</div>
          <div className="text-sm text-slate-700">{angle.hook_de}</div>
        </div>
      )}
      {angle.hook_en && (
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Hook (EN)</div>
          <div className="text-sm text-slate-700">{angle.hook_en}</div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200">
        <Stat label="CTR" value={angle.avg_ctr > 0 ? `${(angle.avg_ctr * 100).toFixed(2)}%` : '—'} />
        <Stat label="ROAS" value={angle.avg_roas > 0 ? `${angle.avg_roas.toFixed(1)}x` : '—'} />
        <Stat label="Assets" value={String(angle.total_assets)} />
      </div>
    </div>
  );
};

const GeneratedBriefDetail: React.FC<{ brief: GeneratedBrief }> = ({ brief }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(brief.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-bold">{brief.brand}</span>
        <span className="text-xs text-slate-500">{new Date(brief.created_at).toLocaleString('de-DE')}</span>
        <button
          onClick={copy}
          className={`ml-auto text-xs font-bold px-3 py-1 rounded-lg ring-1 transition-all ${
            copied ? 'bg-green-100 ring-green-200 text-green-700' : 'bg-white ring-slate-200 text-slate-600 hover:ring-slate-300'
          }`}
        >
          {copied ? '✓ Kopiert' : 'Kopieren'}
        </button>
      </div>
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task</div>
        <div className="text-sm text-slate-700">{brief.task_raw}</div>
      </div>
      <hr className="border-slate-200" />
      <div>{renderMarkdown(brief.output)}</div>
    </div>
  );
};

const AgencyBriefDetail: React.FC<{
  brief: AgencyBriefRow;
  onStatusChange: (s: AgencyBriefStatus) => void;
  onDelete: () => void;
}> = ({ brief, onStatusChange, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(brief.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-bold">
          {brief.brand_id ?? '—'}
        </span>
        <span className="px-2 py-0.5 bg-slate-50 text-slate-700 rounded-full text-xs font-bold uppercase">
          {brief.type}
        </span>
        <span className="text-xs text-slate-500">
          {new Date(brief.created_at).toLocaleString('de-DE')}
        </span>
        <button
          onClick={copy}
          className={`ml-auto text-xs font-bold px-3 py-1 rounded-lg ring-1 transition-all ${
            copied ? 'bg-green-100 ring-green-200 text-green-700' : 'bg-white ring-slate-200 text-slate-600 hover:ring-slate-300'
          }`}
        >
          {copied ? '✓ Kopiert' : 'Kopieren'}
        </button>
      </div>

      <h3 className="text-lg font-black text-slate-900">{brief.title}</h3>

      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
          <select
            value={brief.status}
            onChange={e => onStatusChange(e.target.value as AgencyBriefStatus)}
            className="ring-1 ring-slate-200 rounded-lg px-2 py-1 text-sm bg-white"
          >
            {STATUS_LIST.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {brief.assignee && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assignee</div>
            <div className="text-sm text-slate-700">{brief.assignee}</div>
          </div>
        )}
        {brief.deadline && (
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deadline</div>
            <div className="text-sm text-slate-700">
              {new Date(brief.deadline).toLocaleDateString('de-DE')}
            </div>
          </div>
        )}
      </div>

      {brief.prompt_input?.task_raw && (
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task</div>
          <div className="text-sm text-slate-700 whitespace-pre-wrap">{brief.prompt_input.task_raw}</div>
        </div>
      )}

      <hr className="border-slate-200" />
      <div>{renderMarkdown(brief.body)}</div>

      <hr className="border-slate-200" />
      <div className="flex items-center justify-end gap-2">
        {confirmDelete ? (
          <>
            <span className="text-xs text-slate-600">Wirklich löschen?</span>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs font-bold px-3 py-1 rounded-lg ring-1 ring-slate-200 bg-white text-slate-600 hover:ring-slate-300"
            >
              Abbrechen
            </button>
            <button
              onClick={onDelete}
              className="text-xs font-bold px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white"
            >
              Löschen
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs font-bold px-3 py-1 rounded-lg ring-1 ring-red-200 bg-white text-red-600 hover:bg-red-50"
          >
            Brief löschen
          </button>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</div>
    <div className="text-sm font-bold text-slate-900 mt-0.5">{value}</div>
  </div>
);

// ─── Generator Modal ────────────────────────────────────────────────────────

const GeneratorModal: React.FC<{
  initialBrand?: Brand;
  onClose: () => void;
  onPersisted: (row: AgencyBriefRow) => void;
  onPersistFailed: (g: GeneratedBrief) => void;
}> = ({ initialBrand = 'Take A Shot', onClose, onPersisted, onPersistFailed }) => {
  const [brand, setBrand] = useState<Brand>(initialBrand);
  const [briefType, setBriefType] = useState<AgencyBriefType>('agency');
  const [taskRaw, setTaskRaw] = useState('');
  const [assignee, setAssignee] = useState('');
  const [deadline, setDeadline] = useState('');
  const [context, setContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!taskRaw.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-briefing', {
        body: {
          brand,
          task_raw: taskRaw.trim(),
          assignee: assignee.trim() || undefined,
          deadline: deadline.trim() || undefined,
          context: context.trim() || undefined,
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const body: string = data.briefing;
      const firstLine = body.split('\n').find(l => l.trim().length > 0)?.replace(/^#+\s*/, '').trim();
      const title = (firstLine || taskRaw.trim()).slice(0, 120);
      const trimmedTask = taskRaw.trim();
      const trimmedAssignee = assignee.trim() || undefined;
      const trimmedDeadlineRaw = deadline.trim() || undefined;
      const trimmedContext = context.trim() || undefined;
      // Accept deadline only if parseable as ISO date — DB column is DATE
      const deadlineIso = trimmedDeadlineRaw && /^\d{4}-\d{2}-\d{2}$/.test(trimmedDeadlineRaw)
        ? trimmedDeadlineRaw
        : null;

      const promptInput = {
        brand,
        task_raw: trimmedTask,
        assignee: trimmedAssignee,
        deadline: trimmedDeadlineRaw,
        context: trimmedContext,
        type: briefType,
      };

      // CRITICAL: brand_id must be the brand slug (DB convention), not the display name.
      const brandSlug = BRAND_NAME_TO_SLUG[brand];

      const { data: inserted, error: insertError } = await supabase
        .from('agency_briefs')
        .insert({
          type: briefType,
          title,
          brand_id: brandSlug,
          body,
          prompt_input: promptInput,
          assignee: trimmedAssignee ?? null,
          deadline: deadlineIso,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError || !inserted) {
        // eslint-disable-next-line no-console
        console.error('[BriefsHub] agency_briefs insert failed', insertError);
        onPersistFailed({
          id: `gen-${Date.now()}`,
          brand,
          task_raw: trimmedTask,
          assignee: trimmedAssignee,
          deadline: trimmedDeadlineRaw,
          context: trimmedContext,
          output: body,
          created_at: new Date().toISOString(),
          notSaved: true,
        });
      } else {
        onPersisted(inserted as AgencyBriefRow);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl ring-1 ring-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Agency / Task Brief generieren</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-lg">
            ×
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="w-40 shrink-0">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Brand</label>
              <select
                value={brand}
                onChange={e => setBrand(e.target.value as Brand)}
                className="w-full ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {BRANDS.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32 shrink-0">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
              <select
                value={briefType}
                onChange={e => setBriefType(e.target.value as AgencyBriefType)}
                className="w-full ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white capitalize"
              >
                {TYPE_LIST.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Task</label>
              <textarea
                value={taskRaw}
                onChange={e => setTaskRaw(e.target.value)}
                rows={3}
                placeholder="Mach 3 UGC Creatives für Instagram — Sommer, Conversion"
                className="w-full ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-1">Beispiele:</p>
            <div className="flex flex-wrap gap-1.5">
              {TASK_EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => setTaskRaw(ex)}
                  className="text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1 text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            {showAdvanced ? '▾ Weniger' : '▸ Mehr Optionen'} (Assignee, Deadline, Kontext)
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={assignee}
                onChange={e => setAssignee(e.target.value)}
                placeholder="Assignee (z.B. Mainak)"
                className="ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                placeholder="Deadline"
                className="ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
              <input
                type="text"
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Kontext (Budget, Audience, Kampagne…)"
                className="col-span-2 ring-1 ring-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 ring-1 ring-red-200 rounded-lg p-3">{error}</p>
          )}

          <button
            onClick={generate}
            disabled={loading || !taskRaw.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Spinner />
                <span>Generiere…</span>
              </>
            ) : (
              '⚡ Brief generieren'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BriefsHubView;
