import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { LandingConfig } from '../types';
import TopNav from './TopNav';

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

export default function HartLimesLanding({ forceMode }: { forceMode?: LandingConfig['mode'] }) {
  const [cfg, setCfg] = useState<LandingConfig>(DEFAULT_CONFIG);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  return (
    <div className="min-h-screen w-full bg-[#080808] text-white font-sans overflow-x-hidden">
      {/* Full-width ambient glow */}
      <div className="fixed inset-0 pointer-events-none -z-0">
        <div className="absolute -top-10 left-[5%] w-[700px] h-[500px] bg-indigo-900/20 rounded-full blur-[140px]" />
        <div className="absolute top-20 right-[5%] w-[400px] h-[400px] bg-violet-900/15 rounded-full blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <TopNav />
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-16 pt-32 pb-36 max-w-5xl mx-auto">

        <div className="relative">
          <p className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-10">
            <span className="w-5 h-px bg-gray-700" />
            {isInfluencer ? 'Creator Program' : 'House of Sustainable Brands'}
          </p>
          <h1 className="text-6xl md:text-[82px] font-black tracking-[-0.03em] text-white leading-[0.88] mb-10">
            {cfg.hero_tagline}
          </h1>
          <p className="text-base text-gray-500 max-w-xl mb-14 leading-relaxed">
            {cfg.hero_subtitle}
          </p>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-8 mb-14 border-t border-b border-white/5 py-6">
            <div>
              <div className="text-2xl font-black text-white tabular-nums">6</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-1">Brands</div>
            </div>
            <div className="w-px bg-white/5" />
            <div>
              <div className="text-2xl font-black text-white tabular-nums">200+</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-1">Creator</div>
            </div>
            <div className="w-px bg-white/5" />
            <div>
              <div className="text-2xl font-black text-white">DACH</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-1">Markt</div>
            </div>
            <div className="w-px bg-white/5" />
            <div>
              <div className="text-2xl font-black text-white">D2C</div>
              <div className="text-[9px] text-gray-600 uppercase tracking-[0.2em] mt-1">Fokus</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={cfg.cta_primary_url}
              className="px-8 py-4 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-colors"
            >
              {cfg.cta_primary_text}
            </a>
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

      <div className="border-t border-white/5 mx-6 md:mx-16" />

      {/* Portfolio */}
      {cfg.show_portfolio && (
        <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {BRANDS.map(brand => (
              <div
                key={brand.name}
                className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-7 flex flex-col gap-5 transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)] cursor-default"
              >
                {/* Top accent line on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(90deg, transparent, ${brand.accent}88, transparent)` }}
                />

                {/* Logo */}
                <div className="h-8 flex items-center">
                  {brand.logo ? (
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="h-7 w-auto object-contain object-left max-w-[130px] brightness-0 invert opacity-90"
                    />
                  ) : (
                    <span className="font-black text-lg text-white tracking-tight">{brand.name}</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="text-[9px] font-black text-gray-600 uppercase tracking-[0.25em]">{brand.category}</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{brand.tagline}</p>
                </div>

                {/* Accent bar — grows on hover */}
                <div
                  className="h-[1px] rounded-full transition-all duration-500 w-5 group-hover:w-12"
                  style={{ background: brand.accent }}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {cfg.show_portfolio && <div className="border-t border-white/5 mx-6 md:mx-16" />}

      {/* Tiers — only on influencer/creator page */}
      {isInfluencer && (
        <>
          <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Ambassador Program</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-3">
              4 Stufen.<br />
              <span className="text-gray-600">Ein Weg nach oben.</span>
            </h2>
            <p className="text-gray-600 text-sm mb-14 max-w-md leading-relaxed">
              Jeder startet als Affiliate. Wer liefert, steigt auf. Provision wächst mit dir.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <a
                href="/apply/creator"
                className="inline-block px-10 py-4 bg-white text-gray-900 text-sm font-black rounded-full hover:bg-gray-100 transition-colors"
              >
                Jetzt bewerben →
              </a>
              <p className="text-gray-700 text-xs mt-3">Kein Mindestumsatz. Kein Followerziel. Nur Fit.</p>
            </div>
          </section>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* Approach — only shown on partner/holding page, not influencer */}
      {cfg.show_approach && !isInfluencer && (
        <>
          <section className="px-6 md:px-16 py-24 max-w-5xl mx-auto">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-3">Methodik</p>
            <h2 className="text-3xl md:text-5xl font-black tracking-[-0.03em] leading-none mb-4">
              Buy · Build · Scale
            </h2>
            <p className="text-gray-600 text-sm mb-16 max-w-md leading-relaxed">
              Drei Phasen. Ein System. Jede Brand profitiert von dem, was die anderen aufgebaut haben.
            </p>

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
          </section>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* Jobs */}
      {cfg.show_jobs_link && (
        <>
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
              href="/"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/5 border border-white/10 text-gray-300 text-sm font-bold rounded-full hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Offene Stellen ansehen
              <span className="opacity-60">→</span>
            </a>
          </section>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* FAQ */}
      {cfg.show_faq && (
        <>
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
                  {openFaq === i && (
                    <div className="px-6 pb-5 pt-1 text-sm text-gray-500 leading-relaxed border-t border-white/5">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
          <div className="border-t border-white/5 mx-6 md:mx-16" />
        </>
      )}

      {/* CTA — inverted white card on dark page */}
      <section className="px-6 md:px-16 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl bg-white px-10 md:px-20 py-20 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 mb-6">
              {isInfluencer ? 'Bereit?' : 'Zusammenarbeit'}
            </p>
            <h2 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-gray-900 leading-[0.9] mb-6">
              {isInfluencer ? 'Werde Teil der Crew.' : 'Lass uns reden.'}
            </h2>
            <p className="text-gray-500 text-base mb-12 leading-relaxed max-w-md mx-auto">
              {isInfluencer
                ? 'Bewirb dich jetzt — wir melden uns innerhalb von 48 Stunden.'
                : 'Ob Kooperation, Akquisition oder Karriere — wir antworten innerhalb von 24 Stunden.'}
            </p>
            <a
              href={cfg.cta_primary_url}
              className="inline-block px-10 py-4 bg-gray-900 text-white text-sm font-black rounded-full hover:bg-gray-800 transition-colors"
            >
              {cfg.cta_primary_text}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-16 py-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
        <div>
          <span className="font-black text-gray-400">Hart Limes GmbH</span>
          <span className="ml-3">House of Sustainable Brands</span>
        </div>
        <div className="flex gap-5">
          <a href="/" className="hover:text-gray-300 transition-colors">Portal</a>
          <a href="/imprint" className="hover:text-gray-300 transition-colors">Impressum</a>
          <a href="/privacy" className="hover:text-gray-300 transition-colors">Datenschutz</a>
        </div>
      </footer>
    </div>
  );
}
