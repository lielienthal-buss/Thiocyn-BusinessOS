import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { LandingConfig } from '@/types';
import TopNav from './TopNav';

// ─── useInView ────────────────────────────────────────────────────────────────
function useInView(threshold = 0.15): [React.RefCallback<HTMLDivElement>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold }
    );
    observerRef.current.observe(node);
  }, [threshold]);

  return [ref, isVisible];
}

// ─── AnimatedSection ──────────────────────────────────────────────────────────
const AnimatedSection: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: string;
}> = ({ children, className = '', delay = '' }) => {
  const [ref, isVisible] = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${delay} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
};

// ─── useCounter ───────────────────────────────────────────────────────────────
function useCounter(target: number, duration = 1400, enabled = true): number {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!enabled || hasRun.current) return;
    hasRun.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => requestAnimationFrame(step), 300);
    return () => clearTimeout(timeout);
  }, [target, duration, enabled]);

  return count;
}

// ─── StatItem ─────────────────────────────────────────────────────────────────
const StatItem: React.FC<{
  value: number | string;
  suffix?: string;
  label: string;
  isNumber?: boolean;
}> = ({ value, suffix = '', label, isNumber = false }) => {
  const [ref, isVisible] = useInView(0.1);
  const numericValue = isNumber && typeof value === 'number' ? value : 0;
  const count = useCounter(numericValue, 1400, isNumber && isVisible);

  return (
    <div ref={ref}>
      <div className="text-2xl font-black text-white tabular-nums">
        {isNumber ? `${count}${suffix}` : value}
      </div>
      <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-1">{label}</div>
    </div>
  );
};

// ─── Media Assets (add video URLs here when available) ───────────────────────
const VIDEO_ASSETS = {
  // Hero background loop — muted autoplay, shows behind mesh gradient
  // e.g. 'https://cdn.shopify.com/s/files/1/xxxx/files/hero-loop.mp4'
  hero: null as string | null,
};

// ─── Data ─────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIG: LandingConfig = {
  mode: 'partner',
  hero_tagline: 'House of Sustainable Brands.',
  hero_subtitle:
    'Wir erwerben, bauen und skalieren nachhaltige D2C-Brands — mit geteilter Infrastruktur, einem Creator-Netzwerk und systematischem Performance Marketing.',
  cta_primary_text: 'Zusammenarbeit anfragen',
  cta_primary_url: 'mailto:info@hartlimesgmbh.de',
  cta_secondary_text: 'Creator werden',
  cta_secondary_url: '/creators',
  show_portfolio: true,
  show_approach: true,
  show_jobs_link: true,
  show_faq: true,
};

const BRANDS = [
  {
    name: 'Paigh',
    category: 'Fashion & Lifestyle',
    tagline: 'Slow fashion für Frauen, die sich selbst treu bleiben.',
    accent: '#F43F5E',
    logo: 'https://cdn.shopify.com/s/files/1/0286/1062/5667/files/paigh-logo-farbe.png?v=1647510676',
  },
  {
    name: 'Take A Shot',
    category: 'Eyewear & Outdoor',
    tagline: 'Sustainable sunglasses for conscious explorers.',
    accent: '#F59E0B',
    logo: 'https://www.takeashot.de/cdn/shop/files/Logo-Take-A-Shot.png?v=1694524980&width=400',
  },
  {
    name: 'Wristr',
    category: 'Apple Watch Bands',
    tagline: 'Premium bands for the minimal, tech-forward professional.',
    accent: '#94A3B8',
    logo: null,
  },
  {
    name: 'Thiocyn',
    category: 'Hair Care',
    tagline: 'Body-own hair science. No promises. Just results.',
    accent: '#A78BFA',
    logo: 'https://thiocyn.com/cdn/shop/files/logo.svg?v=1684917460',
  },
  {
    name: 'Dr. Severin',
    category: 'Body Care',
    tagline: 'Science you can feel. Clean ingredients, visible results.',
    accent: '#38BDF8',
    logo: 'https://drseverin.com/cdn/shop/files/DRS-Logo-Black.png?v=1669046917',
  },
  {
    name: 'Timber & John',
    category: 'Nature Fashion',
    tagline: 'Naturmode mit Seele. Handwerk, das bleibt.',
    accent: '#4ADE80',
    logo: 'https://www.timber-john.com/cdn/shop/files/TimberJohn-Logo-grau_1a7d228e-bab0-497f-a607-0b7c54ce91d3.png?v=1716822338&width=600',
  },
];

const TIERS = [
  {
    id: '01',
    name: 'Starter',
    tagline: 'Einstieg ins Programm.',
    commission: '5%',
    perks: ['Affiliate-Link', 'Produktgeschenke', 'Organisches Reposting'],
    accent: '#6B7280',
  },
  {
    id: '02',
    name: 'Silver',
    tagline: 'Du lieferst. Wir skalieren.',
    commission: '10%',
    perks: ['Höhere Provision', 'Whitelisting auf Anfrage', 'Priority Support'],
    accent: '#94A3B8',
  },
  {
    id: '03',
    name: 'Gold',
    tagline: 'Langfristige Partnerschaft.',
    commission: '12%',
    perks: ['Retainer möglich', 'Content-Briefings', 'Co-Creation Zugang'],
    accent: '#F59E0B',
  },
  {
    id: '04',
    name: 'Ambassador',
    tagline: 'Du bist das Gesicht der Brand.',
    commission: '15%',
    perks: ['Paid Usage Rights (12 Mon.)', 'Fester Retainer', 'Exklusive Kollaborationen'],
    accent: '#A78BFA',
    featured: true,
  },
];

const APPROACH = [
  {
    phase: '01',
    title: 'Acquire',
    description:
      'Wir identifizieren unterbewertete D2C-Brands mit echter Kundenbasis, starkem Produkt und unausgeschöpftem Potenzial.',
  },
  {
    phase: '02',
    title: 'Build',
    description:
      'Shared Infrastructure: ein Tech-Stack, ein Creator-Netzwerk, ein System — deployed für alle Brands gleichzeitig.',
  },
  {
    phase: '03',
    title: 'Scale',
    description:
      'Performance Marketing, UGC-Pipelines und AI-Operations — systematisch und messbar, nicht zufällig.',
  },
];

const PILLARS = [
  {
    label: '01',
    title: 'Shared Infrastructure',
    body: 'Ein Tech-Stack für alle Brands. Kein redundanter Aufbau — volle Hebelwirkung.',
  },
  {
    label: '02',
    title: 'Performance Marketing',
    body: 'Meta, TikTok, Google — zentralisiert gesteuert mit brand-spezifischen Creatives.',
  },
  {
    label: '03',
    title: 'Creator Network',
    body: '200+ Creator, die authentischen UGC für alle Brands liefern.',
  },
  {
    label: '04',
    title: 'AI Operations',
    body: 'Automatisierte Pipelines für Content, Support und Analytics — skalierbar ohne Headcount.',
  },
];

const TEAM_MEMBERS = [
  { name: 'Peter Hart',   role: 'Managing Director',  accent: '#A78BFA' },
  { name: 'Jan-Luis L.',  role: 'Founders Associate', accent: '#38BDF8' },
  { name: 'Open Role',    role: 'Head of Growth',     accent: '#4ADE80' },
  { name: 'Open Role',    role: 'Brand Lead',         accent: '#F59E0B' },
];

const FAQ_PARTNER = [
  {
    q: 'Was ist Hart Limes GmbH?',
    a: 'Hart Limes ist eine Brand-Holding spezialisiert auf den Erwerb und die Skalierung nachhaltiger D2C-Brands in DACH und international.',
  },
  {
    q: 'Kauft ihr neue Brands?',
    a: 'Ja — wenn eine Brand zu unserer Philosophie passt (nachhaltig, echte Kundenbasis, D2C-fähig), sprechen wir gerne. Schreib uns direkt an.',
  },
  {
    q: 'Wie kann ich als Partner zusammenarbeiten?',
    a: 'Wir kooperieren mit Agenturen, Tech-Anbietern, Lieferanten und Creatorn. Schreib uns einfach an — wir antworten innerhalb von 24h.',
  },
  {
    q: 'Gibt es offene Stellen?',
    a: 'Ja. Wir suchen regelmäßig Praktikant:innen, Werkstudent:innen und Festangestellte. Details auf unserem Portal.',
  },
];

const FAQ_INFLUENCER = [
  {
    q: 'Brauche ich eine Mindestanzahl an Followern?',
    a: 'Nein. Wir schauen auf Authentizität, Engagement und Brand-Fit — nicht auf Followerzahlen.',
  },
  {
    q: 'Wie läuft die Zusammenarbeit ab?',
    a: 'Nach deiner Bewerbung prüfen wir den Brand-Fit und melden uns innerhalb von 48h. Bei einem Match besprechen wir alles Weitere persönlich.',
  },
  {
    q: 'Für welche Brands kann ich mich bewerben?',
    a: 'Du kannst dich allgemein bewerben — wir ordnen dir die passende Brand zu. Oder du nennst direkt eine Brand in deiner Bewerbung.',
  },
  {
    q: 'Was bekomme ich als Creator?',
    a: 'Produkte, eine Affiliate-Provision und bei langfristiger Zusammenarbeit einen festen Retainer. Details besprechen wir individuell.',
  },
];

const CREATOR_QUOTES = [
  {
    quote: 'Innerhalb von 3 Monaten bin ich vom Starter zum Gold-Tier aufgestiegen. Die Zusammenarbeit ist professionell und die Produkte verkaufen sich von selbst.',
    name: 'Creator, Paigh',
    tier: 'Gold',
    accent: '#F59E0B',
  },
  {
    quote: 'Kein Followerziel, kein Druck. Nur echter Content der zu mir passt — und eine faire Provision. So soll Influencer-Marketing sein.',
    name: 'Creator, Thiocyn',
    tier: 'Silver',
    accent: '#A78BFA',
  },
  {
    quote: 'Das Onboarding war schnell, der Support ist erreichbar. Ich empfehle das Programm jedem Creator der langfristige Partnerships sucht.',
    name: 'Creator, Take A Shot',
    tier: 'Ambassador',
    accent: '#F43F5E',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HartLimesLanding({
  forceMode,
  onApplyClick,
}: {
  forceMode?: LandingConfig['mode'];
  onApplyClick?: () => void;
}) {
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_CONFIG);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroOpacity, setHeroOpacity] = useState(1);

  useEffect(() => {
    const handler = () => setHeroOpacity(Math.max(0, 1 - window.scrollY / 320));
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    supabase
      .from('recruiter_settings')
      .select('landing_config')
      .single()
      .then(({ data }) => {
        if (data?.landing_config) setCfg({ ...DEFAULT_CONFIG, ...data.landing_config });
      });
  }, []);

  const isInfluencer = (forceMode ?? cfg.mode) === 'influencer';
  const faqItems = isInfluencer ? FAQ_INFLUENCER : FAQ_PARTNER;

  const applyButtonClasses =
    'inline-block px-10 py-4 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-colors';

  return (
    <div className="min-h-screen w-full bg-[#080808] text-white font-sans overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <TopNav variant="dark" />
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-16 pt-20 md:pt-32 pb-20 md:pb-36 max-w-5xl mx-auto overflow-hidden">
        {/* Video background (activates when VIDEO_ASSETS.hero is set) */}
        {VIDEO_ASSETS.hero && (
          <video
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            src={VIDEO_ASSETS.hero}
            autoPlay
            muted
            loop
            playsInline
          />
        )}

        {/* Animated mesh gradient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Primary orbs */}
          <div className="absolute -top-32 -left-24 w-[500px] h-[500px] bg-purple-700/[0.12] rounded-full blur-[160px] animate-mesh-1" />
          <div className="absolute top-1/4 -right-32 w-[420px] h-[420px] bg-indigo-600/[0.10] rounded-full blur-[140px] animate-mesh-2" />
          <div className="absolute -bottom-24 left-1/3 w-[380px] h-[380px] bg-violet-600/[0.08] rounded-full blur-[130px] animate-mesh-3" />
          <div className="absolute top-0 right-1/4 w-[280px] h-[280px] bg-pink-700/[0.06] rounded-full blur-[100px] animate-mesh-4" />
          {/* Subtle warm accent bottom-right */}
          <div
            className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-600/[0.05] rounded-full blur-[100px] animate-blob"
            style={{ animationDelay: '4s' }}
          />
          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          {/* Vignette — keeps edges dark */}
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, #080808 100%)',
            }}
          />
        </div>

        <div className="relative">
          <p className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-8 md:mb-10">
            <span className="w-5 h-px bg-gray-700" />
            {isInfluencer ? 'Creator Program' : 'House of Sustainable Brands'}
          </p>
          <h1
            className="text-[44px] md:text-[82px] font-black tracking-[-0.03em] text-white leading-[0.9] mb-8 md:mb-10"
            style={{ opacity: heroOpacity, transform: `translateY(${(1 - heroOpacity) * -16}px)`, transition: 'none' }}
          >
            {cfg.hero_tagline}
          </h1>
          <p className="text-base text-gray-500 max-w-xl mb-14 leading-relaxed">
            {cfg.hero_subtitle}
          </p>

          {/* Stats strip */}
          <AnimatedSection>
            <div className="flex flex-wrap gap-8 mb-14 border-t border-b border-white/5 py-6">
              <StatItem value={6} label="Brands" isNumber />
              <div className="w-px bg-white/5" />
              <StatItem value={200} suffix="+" label="Creator" isNumber />
              <div className="w-px bg-white/5" />
              <StatItem value="DACH" label="Markt" />
              <div className="w-px bg-white/5" />
              <StatItem value="D2C" label="Fokus" />
            </div>
          </AnimatedSection>

          <div className="flex flex-wrap gap-3">
            {isInfluencer && onApplyClick ? (
              <button
                onClick={onApplyClick}
                className="px-8 py-4 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-colors"
              >
                {cfg.cta_primary_text}
              </button>
            ) : (
              <a
                href={cfg.cta_primary_url}
                className="px-8 py-4 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-colors"
              >
                {cfg.cta_primary_text}
              </a>
            )}
            {cfg.cta_secondary_text && (
              <a
                href={cfg.cta_secondary_url}
                className="px-8 py-4 bg-white/5 text-gray-300 text-sm font-bold rounded-full border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                {cfg.cta_secondary_text}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Brand Ticker */}
      <div className="relative py-6 overflow-hidden border-y border-white/[0.04]">
        <div className="flex w-max animate-marquee gap-16 items-center">
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <div key={i} className="flex items-center gap-3 shrink-0 opacity-30 hover:opacity-70 transition-opacity duration-300">
              {brand.logo ? (
                <img
                  src={brand.logo}
                  alt={brand.name}
                  loading="lazy"
                  className="h-5 w-auto object-contain brightness-0 invert max-w-[90px]"
                />
              ) : (
                <span className="text-xs font-black text-white uppercase tracking-[0.2em]">{brand.name}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio */}
      {cfg.show_portfolio && (
        <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
          <AnimatedSection delay="delay-[100ms]">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Portfolio</p>
                <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none">
                  {isInfluencer ? '6 Brands.' : '6 Brands.'}<br />
                  <span className="text-gray-600">{isInfluencer ? 'Eine Crew.' : 'Ein System.'}</span>
                </h2>
              </div>
              <p className="hidden md:block text-sm text-gray-600 max-w-xs leading-relaxed text-right">
                {isInfluencer
                  ? 'Such dir die Brand aus, zu der du wirklich passst.'
                  : 'Geteilte Infrastruktur. Getrennte Identitäten.'}
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {BRANDS.map((brand, index) => (
              <AnimatedSection
                key={brand.name}
                className="h-full"
                delay=""
              >
                <div
                  className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-7 flex flex-col gap-5 transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] cursor-default h-full"
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  {/* Top accent line on hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(90deg, transparent, ${brand.accent}88, transparent)` }}
                  />

                  {/* Color reveal radial glow on hover */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at top left, ${brand.accent}22, transparent 70%)` }}
                  />

                  {/* Logo */}
                  <div className="h-8 flex items-center">
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        loading="lazy"
                        decoding="async"
                        className="h-7 w-auto object-contain object-left max-w-[130px] brightness-0 invert opacity-60 group-hover:brightness-100 group-hover:invert-0 group-hover:opacity-100 transition-all duration-500"
                      />
                    ) : (
                      <span className="font-black text-lg text-white tracking-tight">{brand.name}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="text-[9px] font-black text-gray-600 uppercase tracking-[0.25em]">{brand.category}</div>
                    <p className="text-sm text-gray-500 leading-relaxed">{brand.tagline}</p>
                  </div>

                  {/* Expand row — shop link appears on hover */}
                  <div className="overflow-hidden transition-all duration-500 max-h-0 group-hover:max-h-8 opacity-0 group-hover:opacity-100">
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color: brand.accent }}
                    >
                      Shop ansehen →
                    </span>
                  </div>

                  {/* Accent bar — grows on hover */}
                  <div
                    className="h-[1px] rounded-full transition-all duration-500 w-5 group-hover:w-12"
                    style={{ background: brand.accent }}
                  />
                </div>
              </AnimatedSection>
            ))}
          </div>
        </section>
      )}

      {cfg.show_portfolio && <div className="border-t border-white/5 mx-6 md:mx-16" />}

      {/* Tiers — only on influencer/creator page */}
      {isInfluencer && (
        <>
          <AnimatedSection>
            <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Ambassador Program</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-3">
                4 Stufen.<br />
                <span className="text-gray-600">Ein Weg nach oben.</span>
              </h2>
              <p className="text-gray-600 text-sm mb-14 max-w-md leading-relaxed">
                Jeder startet als Affiliate. Wer liefert, steigt auf. Provision wächst mit dir.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TIERS.map(tier => (
                  <div
                    key={tier.id}
                    className={`relative flex flex-col gap-5 p-6 rounded-2xl border transition-all duration-300 ${
                      tier.featured
                        ? 'bg-white/[0.06] border-white/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    {tier.featured && (
                      <div className="absolute -top-3 left-6">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full bg-white text-gray-900">
                          Top
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] mb-1">{tier.id}</div>
                      <div className="font-black text-lg text-white">{tier.name}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{tier.tagline}</div>
                    </div>
                    <div
                      className="text-3xl font-black tabular-nums"
                      style={{ color: tier.accent }}
                    >
                      {tier.commission}
                      <span className="text-sm font-bold text-gray-600 ml-1">Provision</span>
                    </div>
                    <ul className="space-y-2 flex-1">
                      {tier.perks.map(perk => (
                        <li key={perk} className="flex items-start gap-2 text-xs text-gray-500">
                          <span className="mt-0.5 shrink-0" style={{ color: tier.accent }}>—</span>
                          {perk}
                        </li>
                      ))}
                    </ul>
                    <div className="h-[1px] rounded-full w-full opacity-30" style={{ background: tier.accent }} />
                  </div>
                ))}
              </div>

              <div className="mt-10 text-center">
                {onApplyClick ? (
                  <button onClick={onApplyClick} className={applyButtonClasses}>
                    Jetzt bewerben →
                  </button>
                ) : (
                  <a href="/apply/creator" className={applyButtonClasses}>
                    Jetzt bewerben →
                  </a>
                )}
                <p className="text-gray-700 text-xs mt-3">Kein Mindestumsatz. Kein Followerziel. Nur Fit.</p>
              </div>
            </section>
          </AnimatedSection>
          <div className="border-t border-white/5 mx-6 md:mx-16" />

          {/* Social Proof — Creator quotes */}
          <AnimatedSection>
            <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Creator Stimmen</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-14">
                Was unsere Creator sagen.
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CREATOR_QUOTES.map(item => (
                  <div
                    key={item.name}
                    className="relative flex flex-col gap-5 p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                  >
                    <p className="text-sm text-gray-400 italic leading-relaxed flex-1">"{item.quote}"</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[9px] text-gray-600 uppercase tracking-[0.2em]">{item.name}</span>
                      <span
                        className="text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                        style={{
                          color: item.accent,
                          background: `${item.accent}18`,
                          border: `1px solid ${item.accent}40`,
                        }}
                      >
                        {item.tier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </AnimatedSection>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* Approach — only shown on partner/holding page, not influencer */}
      {cfg.show_approach && !isInfluencer && (
        <>
          <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
            <AnimatedSection>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Methodik</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-4">
                Buy · Build · Scale
              </h2>
              <p className="text-gray-600 text-sm mb-16 max-w-md leading-relaxed">
                Drei Phasen. Ein System. Jede Brand profitiert von dem, was die anderen aufgebaut haben.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              {APPROACH.map(step => (
                <div
                  key={step.phase}
                  className="group relative flex flex-col gap-4 p-7 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                >
                  <div className="absolute top-4 right-5 text-[56px] font-black text-white/[0.04] leading-none select-none group-hover:text-white/[0.07] transition-colors duration-300">
                    {step.phase}
                  </div>
                  <div className="text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">{step.phase}</div>
                  <div className="font-black text-xl text-white">{step.title}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Pillars */}
            <AnimatedSection delay="delay-[100ms]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PILLARS.map(p => (
                  <div
                    key={p.title}
                    className="flex gap-5 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                  >
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em] shrink-0 mt-1">{p.label}</span>
                    <div>
                      <div className="font-black text-sm text-white mb-1.5">{p.title}</div>
                      <p className="text-xs text-gray-500 leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
          </section>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* Team — only on partner/holding page */}
      {!isInfluencer && (
        <>
          <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
            <AnimatedSection>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Team</p>
              <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-4">
                Menschen, die liefern.
              </h2>
              <p className="text-gray-600 text-sm mb-14 max-w-md leading-relaxed">
                Hinter jedem System stehen echte Menschen. Unser Team verbindet Founder-Mentalität mit operativer Präzision.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEAM_MEMBERS.map((member, i) => (
                <AnimatedSection key={member.name} delay={`${i * 70}ms`}>
                  <div className="group relative rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-500 hover:-translate-y-0.5 p-6 flex flex-col gap-4">
                    {/* Accent glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                      style={{ background: `radial-gradient(ellipse at top left, ${member.accent}14, transparent 70%)` }}
                    />
                    {/* Initials avatar */}
                    <div
                      className="relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-black"
                      style={{ background: `${member.accent}18`, color: member.accent, border: `1px solid ${member.accent}33` }}
                    >
                      {member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div className="relative">
                      <div className="font-black text-sm text-white">{member.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-0.5">{member.role}</div>
                    </div>
                    {/* Accent bar */}
                    <div className="h-[1px] rounded-full w-5 group-hover:w-10 transition-all duration-500" style={{ background: member.accent }} />
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </section>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* Jobs */}
      {cfg.show_jobs_link && (
        <>
          <AnimatedSection>
            <section className="px-6 md:px-16 py-24 max-w-4xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">
                {isInfluencer ? 'Stellenausschreibungen' : 'Team & Karriere'}
              </p>
              <h2 className="text-3xl md:text-4xl font-black tracking-[-0.03em] mb-4">
                {isInfluencer ? 'Du willst fest dabei sein?' : 'Werde Teil des Teams.'}
              </h2>
              <p className="text-gray-500 text-sm mb-10 max-w-xl leading-relaxed">
                Neben dem Creator-Programm gibt es bei Hart Limes offene Stellen als Praktikant:in, Werkstudent:in oder in Festanstellung. Bewirb dich direkt über unser Portal.
              </p>
              <a
                href="/hiring"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/5 border border-white/10 text-gray-300 text-sm font-bold rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
              >
                Offene Stellen ansehen
                <span className="opacity-60">→</span>
              </a>
            </section>
          </AnimatedSection>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* FAQ */}
      {cfg.show_faq && (
        <>
          <AnimatedSection>
            <section className="px-6 md:px-16 py-24 max-w-3xl mx-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">FAQ</p>
              <h2 className="text-3xl font-black tracking-[-0.03em] mb-12">Häufige Fragen</h2>
              <div className="space-y-2">
                {faqItems.map((item, i) => (
                  <div key={i} className="border border-white/[0.06] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between font-semibold text-white hover:bg-white/[0.03] transition-colors"
                    >
                      <span className="text-sm">{item.q}</span>
                      <span className="text-gray-600 ml-4 shrink-0 text-lg leading-none font-light">
                        {openFaq === i ? '−' : '+'}
                      </span>
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ maxHeight: openFaq === i ? '200px' : '0px' }}
                    >
                      <div className="px-6 pb-5 pt-1 text-sm text-gray-500 leading-relaxed border-t border-white/5">
                        {item.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </AnimatedSection>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* CTA — dark glass for creators, white card for partners */}
      <section className="px-6 md:px-16 py-20">
        <div className="max-w-5xl mx-auto">
          {isInfluencer ? (
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-white/[0.02] px-6 md:px-20 py-16 md:py-28 text-center">
              {/* Ambient glow */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[280px] bg-primary-500/[0.08] rounded-full blur-[100px]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[50%] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <p className="relative text-[10px] font-black uppercase tracking-[0.4em] text-primary-400 mb-6">Bereit?</p>
              <h2 className="relative text-4xl md:text-7xl font-black tracking-[-0.04em] text-white leading-[0.88] mb-5">
                Werde Teil<br />
                <span className="text-gray-500">der Crew.</span>
              </h2>
              <p className="relative text-gray-500 text-base mb-10 max-w-sm mx-auto leading-relaxed">
                2 Minuten. Kein Followerziel. Wir melden uns in 48h.
              </p>
              {onApplyClick ? (
                <button
                  onClick={onApplyClick}
                  className="relative inline-block px-12 py-5 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_60px_rgba(255,255,255,0.08)]"
                >
                  Jetzt bewerben →
                </button>
              ) : (
                <a
                  href="/apply/creator"
                  className="relative inline-block px-12 py-5 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_60px_rgba(255,255,255,0.08)]"
                >
                  Jetzt bewerben →
                </a>
              )}
              <p className="relative text-gray-700 text-xs mt-5 uppercase tracking-widest font-black">Kein Mindestumsatz · Kein Followerziel · Nur Fit</p>
            </div>
          ) : (
            <div className="rounded-3xl bg-white px-6 md:px-20 py-12 md:py-20 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6">Zusammenarbeit</p>
              <h2 className="text-3xl md:text-6xl font-black tracking-[-0.03em] text-gray-900 leading-[0.9] mb-6">
                Lass uns reden.
              </h2>
              <p className="text-gray-500 text-sm md:text-base mb-10 md:mb-12 leading-relaxed max-w-md mx-auto">
                Ob Kooperation, Akquisition oder Karriere — wir antworten innerhalb von 24 Stunden.
              </p>
              <a
                href={cfg.cta_primary_url}
                className="inline-block px-10 py-4 bg-gray-900 text-white text-sm font-black rounded-full hover:bg-gray-800 transition-colors"
              >
                {cfg.cta_primary_text}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-16 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
        <div>
          <span className="font-black text-gray-400">Hart Limes GmbH</span>
          <span className="ml-3">House of Sustainable Brands</span>
        </div>
        <div className="flex gap-5">
          <a href="/admin" className="hover:text-gray-300 transition-colors">Portal</a>
          <a href="/hiring" className="hover:text-gray-300 transition-colors">Karriere</a>
          <a href="/brand-ambassador" className="hover:text-gray-300 transition-colors">Ambassador</a>
          <a href="/imprint" className="hover:text-gray-300 transition-colors">Impressum</a>
          <a href="/privacy" className="hover:text-gray-300 transition-colors">Datenschutz</a>
        </div>
      </footer>

      {/* Mobile Sticky CTA — only on creators page, only on mobile */}
      {isInfluencer && (
        <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden pb-safe">
          <div className="bg-[#080808]/90 backdrop-blur-xl border-t border-white/[0.08] px-4 py-3">
            {onApplyClick ? (
              <button
                onClick={onApplyClick}
                className="w-full py-3.5 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-colors"
              >
                Jetzt bewerben →
              </button>
            ) : (
              <a
                href="/apply/creator"
                className="block w-full py-3.5 bg-white text-gray-900 text-sm font-black rounded-full text-center hover:bg-gray-100 transition-colors"
              >
                Jetzt bewerben →
              </a>
            )}
            <p className="text-center text-[10px] text-gray-600 mt-1.5">Kein Mindestumsatz. Kein Followerziel.</p>
          </div>
        </div>
      )}
    </div>
  );
}