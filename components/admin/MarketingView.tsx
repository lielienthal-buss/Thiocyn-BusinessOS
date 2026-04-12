import React, { useState, useEffect } from 'react';
import ResourceCardList from './ResourceCardList';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';
import { supabase } from '@/lib/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BrandCard {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  theme2026: string;
  cadence: string;
  planStatus: 'ready' | 'pending' | 'partial';
  notionHref: string;
  color: string;
  // Real data
  instagram: string;
  followers: string;
  engagement: string;
  engagementAlert: boolean;
  sopPhase: number; // 0–7 = highest phase reached
  primaryFormat: string;
  hookType: string;
  isActive: boolean;
  urgency?: string; // Q1/Q2 priority action
}

// ─── Brand Data (enriched from central-brand-dashboard + social-media-playbook) ─

const BRANDS: BrandCard[] = [
  {
    id: 'thiocyn',
    name: 'Thiocyn',
    emoji: '💊',
    tagline: 'Confidence that grows every day.',
    theme2026: 'Body-Own Science',
    cadence: '3–4×/week',
    planStatus: 'partial',
    notionHref: 'https://notion.so/306f0c850b0780db8acee733235218eb',
    color: 'border-amber-200 hover:border-amber-400',
    instagram: '@thiocyn',
    followers: '3.3k',
    engagement: '36–54% Reach Rate',
    engagementAlert: false,
    sopPhase: 3,
    primaryFormat: 'UGC Story / VSL (30–90s)',
    hookType: 'Mechanism / Shock',
    isActive: true,
    urgency: 'Reels-Frequenz erhöhen, Gifting-Programm ausbauen',
  },
  {
    id: 'paigh',
    name: 'Paigh',
    emoji: '👜',
    tagline: 'Freude. Mode. Bewegung.',
    theme2026: 'Movement & Identity',
    cadence: '5×/week + Daily Stories',
    planStatus: 'ready',
    notionHref: 'https://notion.so/30cf0c850b078181846cfd27087fdf96',
    color: 'border-indigo-200 hover:border-indigo-400',
    instagram: '@paigh',
    followers: '—',
    engagement: '—',
    engagementAlert: false,
    sopPhase: 2,
    primaryFormat: 'Lifestyle / Wohlfühlen',
    hookType: 'Einladung / Freude',
    isActive: true,
    urgency: 'Content Calendar implementieren, Daily Stories als Dialogue-Kanal',
  },
  {
    id: 'take-a-shot',
    name: 'Take A Shot',
    emoji: '📸',
    tagline: 'See the moment. Live it fully.',
    theme2026: '"See the moment. Live it fully."',
    cadence: '3–5×/week',
    planStatus: 'partial',
    notionHref: 'https://notion.so/306f0c850b07804dbb46d6e7e0ea3327',
    color: 'border-primary-200 hover:border-primary-400',
    instagram: '@takeashot.official',
    followers: '11k',
    engagement: '<0.03%',
    engagementAlert: true,
    sopPhase: 1,
    primaryFormat: 'Lifestyle Reel (Action First)',
    hookType: 'Visual Action',
    isActive: true,
    urgency: 'Trust-Rebuilding vor Content-Push (Kundenbeschwerden sichtbar)',
  },
  {
    id: 'dr-severin',
    name: 'Dr. Severin',
    emoji: '🧬',
    tagline: 'Science you can feel.',
    theme2026: '"Science you can feel"',
    cadence: '3–4×/week',
    planStatus: 'partial',
    notionHref: 'https://notion.so/306f0c850b07801aabe8e026c09d87ae',
    color: 'border-teal-200 hover:border-teal-400',
    instagram: '@dr.severin',
    followers: '3.2k',
    engagement: '~0.12%',
    engagementAlert: false,
    sopPhase: 1,
    primaryFormat: 'Dermatologist POV / Yuck Factor',
    hookType: 'Authority / Problem',
    isActive: true,
    urgency: 'BloggerBoxx ausbauen, Story Highlights conversion-optimieren',
  },
  {
    id: 'wristr',
    name: 'Wristr',
    emoji: '⌚',
    tagline: 'Dein Brand am Handgelenk.',
    theme2026: '12-Month Plan Active',
    cadence: '3×/week',
    planStatus: 'partial',
    notionHref: 'https://notion.so/306f0c850b0780688c65ed8e7cae6ffb',
    color: 'border-rose-200 hover:border-rose-400',
    instagram: '@wristr.official',
    followers: '58.1k',
    engagement: '0.06%',
    engagementAlert: true,
    sopPhase: 0,
    primaryFormat: 'ASMR Unboxing / Macro',
    hookType: 'Sensorik / Ästhetik',
    isActive: true,
    urgency: 'Follower-Base re-aktivieren via Reels-First (58k großteils inaktiv)',
  },
  {
    id: 'tj',
    name: 'Timber & John',
    emoji: '🪵',
    tagline: 'Naturverbunden. Zeitlos.',
    theme2026: 'Transition — Brand-Asset bleibt',
    cadence: 'Pausiert',
    planStatus: 'pending',
    notionHref: 'https://notion.so/306f0c850b0780eb8241f737999b3e96',
    color: 'border-orange-200 hover:border-orange-400',
    instagram: '—',
    followers: '—',
    engagement: '—',
    engagementAlert: false,
    sopPhase: 0,
    primaryFormat: 'Handwerk making-of',
    hookType: 'Ästhetik / Geschenk',
    isActive: false,
    urgency: 'Mantel-GmbH wird verkauft — kein aktiver Content-Betrieb',
  },
];

// SOP phases, hook examples, copy angles, content playbook data
// are stored in lib/translations.ts for full EN/DE i18n support.

// ─── Status helpers ───────────────────────────────────────────────────────────

// STATUS_CONFIG labels are now resolved via translations in BrandsTab
const STATUS_CLASSES = {
  ready: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  partial: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  pending: 'bg-slate-500/15 text-[#515154] border-slate-500/20',
};

const SOP_PHASE_COLOR = (phase: number) => {
  if (phase >= 5) return 'bg-green-500';
  if (phase >= 3) return 'bg-amber-400';
  if (phase >= 1) return 'bg-orange-400';
  return 'bg-white/[0.08]';
};

// ─── BrandsTab ────────────────────────────────────────────────────────────────

interface LiveMetric {
  followers: string | null;
  engagement_rate: string | null;
  reach_rate: string | null;
  sop_phase: number | null;
}

const BrandsTab: React.FC = () => {
  const { lang } = useLang();
  const tb = translations[lang].brandStatus;

  const [metrics, setMetrics] = useState<Record<string, LiveMetric>>({});

  useEffect(() => {
    supabase
      .from('brand_metrics')
      .select('brand_id, followers, engagement_rate, reach_rate, sop_phase')
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, LiveMetric> = {};
        data.forEach(row => { map[row.brand_id] = row; });
        setMetrics(map);
      });
  }, []);

  const updateSopPhase = async (brandId: string, phase: number) => {
    setMetrics(prev => ({
      ...prev,
      [brandId]: { ...prev[brandId], sop_phase: phase },
    }));
    await supabase.from('brand_metrics').update({ sop_phase: phase }).eq('brand_id', brandId);
  };

  const alertCount = BRANDS.filter(b => b.engagementAlert && b.isActive).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-[#1d1d1f]">{tb.title}</h3>
          <p className="text-xs text-[#6e6e73] mt-0.5">{tb.subtitle}</p>
        </div>
        <a
          href="https://notion.so/2fff0c8570b480cbb251ca124c1e6685"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1d1d1f] bg-white/70 border border-black/[0.06] rounded-lg hover:bg-black/[0.03] transition-colors"
        >
          <span>📓</span> {tb.notionBtn} ↗
        </a>
      </div>

      {/* KPI Reminder */}
      <div className="flex items-center gap-2 p-3 bg-blue-500/15 border border-blue-500/20 rounded-xl text-xs text-blue-400">
        <span>📊</span>
        <span><strong>KPI:</strong> {tb.kpiReminder}</span>
      </div>

      {/* Engagement alerts */}
      {alertCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/15 border border-red-500/20 rounded-xl text-sm">
          <span className="text-lg">🚨</span>
          <div>
            <p className="font-bold text-red-400">{tb.engagementAlertTitle(alertCount)}</p>
            <p className="text-red-400 text-xs mt-0.5">{tb.engagementAlertDesc}</p>
          </div>
        </div>
      )}

      {/* Brand grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {BRANDS.map(brand => {
          const m = metrics[brand.id];
          const liveFollowers = m?.followers ?? brand.followers;
          const liveEngagement = m?.engagement_rate ?? brand.engagement;
          const liveSopPhase = m?.sop_phase ?? brand.sopPhase;
          const status = STATUS_CLASSES[brand.planStatus];
          return (
            <div
              key={brand.id}
              className={`group flex flex-col gap-3 p-5 bg-white/70 border-2 rounded-2xl backdrop-blur-sm transition-all duration-200 ${brand.color} ${!brand.isActive ? 'opacity-60' : ''}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{brand.emoji}</span>
                  <div>
                    <p className="font-black text-[#1d1d1f] text-sm">{brand.name}</p>
                    <p className="text-[11px] text-[#6e6e73] leading-tight">{brand.tagline}</p>
                  </div>
                </div>
                {!brand.isActive && (
                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-500/15 text-[#515154] px-2 py-0.5 rounded-full">Pausiert</span>
                )}
              </div>

              {/* Instagram + Engagement */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6e6e73] font-medium">{brand.instagram}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#6e6e73]">{liveFollowers}</span>
                  {brand.engagementAlert ? (
                    <span className="text-red-600 font-bold flex items-center gap-0.5">
                      ⚠️ {liveEngagement}
                    </span>
                  ) : liveEngagement !== '—' ? (
                    <span className="text-green-600 font-bold">✅ {liveEngagement}</span>
                  ) : (
                    <span className="text-[#6e6e73]">{liveEngagement}</span>
                  )}
                </div>
              </div>

              {/* 2026 Theme */}
              <div className="bg-white/50 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6e6e73] mb-0.5">{tb.theme2026Label}</p>
                <p className="text-xs font-semibold text-[#1d1d1f] italic">{brand.theme2026}</p>
              </div>

              {/* Content Format + Hook */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[#6e6e73]">{tb.formatLabel}</span>
                  <span className="font-semibold text-[#1d1d1f]">{brand.primaryFormat}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-[#6e6e73]">{tb.hookLabel}</span>
                  <span className="font-semibold text-[#1d1d1f]">{brand.hookType}</span>
                </div>
              </div>

              {/* Meta + SOP Phase */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-[#6e6e73]">
                  <span>📆</span>
                  <span className="font-semibold">{brand.cadence}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#6e6e73]">{tb.sopLabel}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(p => (
                      <button
                        key={p}
                        onClick={() => updateSopPhase(brand.id, p === liveSopPhase ? p - 1 : p)}
                        className={`w-2.5 h-2.5 rounded-full transition-all hover:scale-125 cursor-pointer ${p <= liveSopPhase ? SOP_PHASE_COLOR(liveSopPhase) : 'bg-white/[0.08] hover:bg-white/[0.15]'}`}
                        title={`Set Phase ${p}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-[#6e6e73]">{liveSopPhase}/7</span>
                </div>
              </div>

              {/* Plan status */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-black/[0.06]">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CLASSES[brand.planStatus]}`}>
                  {brand.planStatus === 'ready' ? tb.planReady : brand.planStatus === 'partial' ? tb.planPartial : tb.planPending}
                </span>
                <a
                  href={brand.notionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-primary-600 hover:text-primary-800 transition-colors"
                >
                  {tb.openNotion}
                </a>
              </div>

              {/* Urgency hint */}
              {brand.isActive && tb.urgencyLabels[brand.id] && (
                <p className="text-[10px] text-[#6e6e73] italic leading-snug">{tb.urgencyLabels[brand.id]}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── SOPTrackerTab ────────────────────────────────────────────────────────────

const SOPTrackerTab: React.FC = () => {
  const { lang } = useLang();
  const ts = translations[lang].sopTracker;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-[#1d1d1f]">{ts.title}</h3>
        <p className="text-xs text-[#6e6e73] mt-0.5">{ts.subtitle}</p>
      </div>

      {/* Phase Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {ts.phases.map(({ phase, name, description }) => (
          <div key={phase} className="p-3 bg-white/50 rounded-xl border border-black/[0.06]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black text-[#6e6e73]">P{phase}</span>
              <span className="text-xs font-bold text-[#1d1d1f]">{name}</span>
            </div>
            <p className="text-[10px] text-[#6e6e73] leading-snug">{description}</p>
          </div>
        ))}
      </div>

      {/* Brand Progress Table — desktop */}
      <div className="hidden md:block bg-white/70 border border-black/[0.06] rounded-2xl overflow-x-auto backdrop-blur-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-black/[0.06] bg-white/50">
              <th className="text-left px-4 py-3 font-black text-[#6e6e73] uppercase tracking-wider">Brand</th>
              {ts.phases.map(({ phase, name }) => (
                <th key={phase} className="text-center px-2 py-3 font-black text-[#6e6e73] uppercase tracking-wider">
                  P{phase}<br /><span className="font-normal normal-case text-[9px]">{name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BRANDS.filter(b => b.isActive).map((brand, i) => (
              <tr key={brand.id} className={`border-b border-black/[0.06] ${i % 2 === 0 ? '' : 'bg-black/[0.02]'}`}>
                <td className="px-4 py-3 font-bold text-[#1d1d1f] whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{brand.emoji}</span>
                    <span>{brand.name}</span>
                  </div>
                </td>
                {[1, 2, 3, 4, 5, 6, 7].map(phase => (
                  <td key={phase} className="text-center px-2 py-3">
                    {phase <= brand.sopPhase ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px]">✓</span>
                    ) : phase === brand.sopPhase + 1 ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E09B37]/15 text-[#E09B37] text-[10px]">→</span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/[0.03] text-[#86868b] text-[10px]">○</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Brand Progress Cards — mobile */}
      <div className="md:hidden space-y-3">
        {BRANDS.filter(b => b.isActive).map(brand => (
          <div key={brand.id} className="bg-white/70 border border-black/[0.06] rounded-2xl p-4 space-y-3 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">{brand.emoji}</span>
              <span className="font-bold text-[#1d1d1f] text-sm">{brand.name}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map(phase => (
                <div key={phase} className="flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-[#6e6e73] font-bold">P{phase}</span>
                  {phase <= brand.sopPhase ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px]">✓</span>
                  ) : phase === brand.sopPhase + 1 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E09B37]/15 text-[#E09B37] text-[10px]">→</span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/[0.03] text-[#86868b] text-[10px]">○</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Principles */}
      <div className="p-4 bg-gray-900 rounded-2xl text-[#1d1d1f] space-y-2">
        <p className="text-xs font-black uppercase tracking-wider text-gray-400">{ts.principlesTitle}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ts.principles.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-300">
              <span className="text-primary-400 mt-0.5">→</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── ContentPlaybookTab ───────────────────────────────────────────────────────

const ContentPlaybookTab: React.FC = () => {
  const { lang } = useLang();
  const tc = translations[lang].contentPlaybook;
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-base font-black text-[#1d1d1f]">{tc.title}</h3>
        <p className="text-xs text-[#6e6e73] mt-0.5">{tc.subtitle}</p>
      </div>

      {/* KPI Hierarchy */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.kpiTitle}</h4>
        <div className="flex flex-wrap gap-2">
          {tc.kpis.map(({ kpi, priority, color }) => (
            <div key={kpi} className={`px-3 py-2 rounded-xl border text-xs font-bold ${color}`}>
              {kpi} <span className="font-normal opacity-70">— {priority}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#6e6e73] italic">{tc.kpiNote}</p>
      </section>

      {/* 5 Content Formats */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.formatsTitle}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {tc.formats.map(({ format, fn, example }) => (
            <div key={format} className="p-3 bg-white/70 border border-black/[0.06] rounded-xl space-y-1 backdrop-blur-sm">
              <p className="text-xs font-black text-[#1d1d1f]">{format}</p>
              <p className="text-[11px] text-[#6e6e73]">{fn}</p>
              <p className="text-[10px] text-primary-600 italic">{example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hook Framework */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.hookTitle}</h4>
        <div className="p-3 bg-white/50 rounded-xl border border-black/[0.06] text-xs font-mono text-[#1d1d1f]">
          {tc.hookFormula}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tc.hooks.map(({ type, pattern, example }) => (
            <div key={type} className="p-3 bg-white/70 border border-black/[0.06] rounded-xl backdrop-blur-sm">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary-500 mb-1">{type} Hook</p>
              <p className="text-[11px] text-[#6e6e73] mb-1">{pattern}</p>
              <p className="text-xs font-semibold text-[#1d1d1f] italic">"{example}"</p>
            </div>
          ))}
        </div>
        <div className="p-3 bg-red-500/15 border border-red-500/20 rounded-xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-red-400 mb-1">{tc.hookAntiPatternsTitle}</p>
          <div className="flex flex-wrap gap-2">
            {tc.antiPatterns.map(a => (
              <span key={a} className="text-[10px] text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full">✗ {a}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Video Script Structure */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.scriptTitle}</h4>
        <div className="space-y-1">
          {tc.scriptSteps.map(({ time, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-2.5 bg-white/70 border border-black/[0.06] rounded-lg backdrop-blur-sm">
              <span className="text-[10px] font-mono text-[#6e6e73] w-16 shrink-0 mt-0.5">{time}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-primary-600 w-16 shrink-0 mt-0.5">{label}</span>
              <span className="text-[11px] text-[#1d1d1f]">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Copy Angles */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.anglesTitle}</h4>
        <p className="text-[11px] text-[#6e6e73]">{tc.anglesNote}</p>
        <div className="space-y-2">
          {tc.angles.map(({ angle, pattern, when, example }) => (
            <div key={angle} className="p-3 bg-white/70 border border-black/[0.06] rounded-xl backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs font-black text-[#1d1d1f]">{angle}</p>
                <span className="text-[9px] text-[#6e6e73] bg-white/50 px-2 py-0.5 rounded-full shrink-0">{when}</span>
              </div>
              <p className="text-[11px] text-[#6e6e73] font-mono mb-1">"{pattern}"</p>
              <p className="text-[10px] text-primary-600 italic">{example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Weekly Rhythm */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.rhythmTitle}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {tc.weeklyRhythm.map(({ day, focus }) => (
            <div key={day} className="p-3 bg-white/50 border border-black/[0.06] rounded-xl text-center">
              <p className="text-sm font-black text-[#1d1d1f] mb-1">{day}</p>
              <p className="text-[10px] text-[#6e6e73] leading-snug">{focus}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Intern Roles */}
      <section className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-[#6e6e73]">{tc.rolesTitle}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tc.internRoles.map(({ role, tasks }) => (
            <div key={role} className="p-3 bg-white/70 border border-black/[0.06] rounded-xl backdrop-blur-sm">
              <p className="text-xs font-black text-[#1d1d1f] mb-1">{role}</p>
              <p className="text-[11px] text-[#6e6e73]">{tasks}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ─── ResourcesTab ─────────────────────────────────────────────────────────────

interface ResourcesTabProps { isAdmin: boolean; }
const ResourcesTab: React.FC<ResourcesTabProps> = ({ isAdmin }) => {
  const { lang } = useLang();
  const tr = translations[lang].resources;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-black text-[#1d1d1f]">{tr.title}</h3>
        <p className="text-xs text-[#6e6e73] mt-0.5">{tr.subtitle}</p>
      </div>
      <ResourceCardList section="marketing" isAdmin={isAdmin} />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface MarketingViewProps {
  activeTab: string;
  isAdmin: boolean;
}

const MarketingView: React.FC<MarketingViewProps> = ({ activeTab, isAdmin }) => {
  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {activeTab === 'marketingBrands' && <BrandsTab />}
      {activeTab === 'marketingSOPTracker' && <SOPTrackerTab />}
      {activeTab === 'marketingContentPlaybook' && <ContentPlaybookTab />}
      {activeTab === 'marketingResources' && <ResourcesTab isAdmin={isAdmin} />}
    </div>
  );
};

export default MarketingView;
