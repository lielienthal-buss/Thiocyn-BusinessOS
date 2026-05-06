import React, { Suspense } from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import Spinner from '@/components/ui/Spinner';
import { useLocale } from '@/lib/landing/i18n';
import { BRANDS } from '@/lib/landing/brands';

const ApplicationForm = React.lazy(() => import('@/components/ApplicationForm'));

type Locale = 'de' | 'en';

const COPY = {
  de: {
    eyebrow: '/ 01 · FOUNDERS UNIVERSITY',
    titleLines: ['6 Marken.', '12 Wochen.', 'Du baust mit.'] as const,
    titleMidIndex: 1,
    sub: 'Du arbeitest 12 Wochen parallel an unseren 6 Marken — Beauty, Fashion, Accessoires, Home. Mit echten Budgets, eigenen Pitches und direktem Draht zum Founder. Marketing, E-Commerce, Ops, AI.',
    ctaPrimary: 'Jetzt bewerben',
    ctaSecondary: 'Was dich erwartet',
    brandsLabel: 'Du arbeitest gleichzeitig für',
    whyHeading: 'Was du bei uns bekommst.',
    why: [
      { tag: 'REAL OPS', title: 'Kein Pitch-Deck-Job', body: 'Du arbeitest an echten Kampagnen, echten Budgets, echten Kund:innen. Von Tag 1 bis zur letzten Woche. Output wird gemessen.' },
      { tag: 'CROSS-BRAND', title: '6 Marken, 1 Team', body: 'Du arbeitest gleichzeitig für Thiocyn, Paigh, Dr. Severin, Take A Shot, Wristr und Timber & John. Beauty, Fashion, Accessoires, Home — sechs Märkte als sechs Labors. Du siehst was funktioniert, wo und warum.' },
      { tag: 'PITCH IT', title: 'Eigene Ideen werden live', body: 'Du siehst etwas, das anders besser wäre? Pitch es. Funktioniert es, geht es live — auf einer der 6 Marken. Kein "haben wir notiert", sondern echte Ownership ab Woche 1.' },
      { tag: 'MENTORING', title: 'Direkter Draht zum Founder', body: 'Kein Corporate-Reporting-Chain. Wöchentliches Interns Jour Fixe mit Peter (Founder) — er reviewed deine Projekte direkt. Dazu: Buddy aus dem Team.' },
      { tag: 'AI-NATIVE', title: 'Du arbeitest mit unserem AI-Stack', body: 'Higgsfield für Video, automatisierte Content-Workflows, AI-Agenten im Tagesgeschäft. Du arbeitest täglich mit dem Stack, den außerhalb von Top-Startups kaum jemand kennt.' },
    ],
    fitHeading: 'Für wen es passt.',
    fitBody: 'Du hast etwas gebaut oder versucht zu bauen — Brand, Side-Project, Content-Account, Kampagne. Du willst nicht nur ausführen, sondern verstehen warum. Du ziehst echtes Shipping dem perfekten Plan vor.',
    howHeading: 'So läuft es ab.',
    steps: [
      { n: '01', dur: 'jetzt', title: 'Bewerbung', body: 'Formular unten (4 Steps, ~10 Min). Wir fragen nach Basics, deinem stärksten Projekt, Präferenzen und 15 Persönlichkeitsfragen.' },
      { n: '02', dur: '~1 Woche', title: 'Review', body: 'Wir lesen jede Bewerbung. Nicht nur CV — auch was du konkret gebaut hast.' },
      { n: '03', dur: '~2 Wochen', title: 'Intro-Call', body: 'Bei Fit: 30-Minuten-Call mit Onboarding Lead und/oder Peter. Beide Seiten prüfen Match.' },
      { n: '04', dur: 'danach', title: 'Case + Start', body: 'Kurzer Praxis-Case (~2h). Bei Zusage: Startdatum, Buddy, Einarbeitung.' },
    ],
    trackRecordHeading: 'Für dich gemacht. Mit dir verbessert.',
    trackRecordBody: 'Founders University wird von ehemaligen Praktikanten konstant weiterentwickelt — mit jedem neuen Durchgang. Dein Feedback, deine Pitches, deine Ideen prägen die nächste Iteration. Das Ziel: nicht ein Standard-Praktikum, sondern das richtige für dich. 3 Monate ohne Festgehalt, dafür mit leistungsbasierten Incentives. Wer wirklich was bewegt, hat danach eine echte Chance auf Übernahme — denselben Weg sind die Macher selbst gegangen.',
    trustHeading: 'Wir investieren in dich, nicht umgekehrt.',
    trustBody: 'Keine Teilnahmegebühr, keine Kursgebühren, kein verstecktes Paywall. Das Fellowship ist unentgeltlich und full remote — du arbeitest von wo du willst, wir koordinieren async. Du investierst Zeit + Energie, wir geben dir Zugang zu echten Brands, echten Budgets und einem direkten Draht zum Team. Bei Conversion zur bezahlten Rolle nach Graduation: separater Vertrag.',
    formHeading: 'Jetzt bewerben',
    formSub: 'Ca. 10 Minuten. Wir antworten innerhalb einer Woche.',
  },
  en: {
    eyebrow: '/ 01 · FOUNDERS UNIVERSITY',
    titleLines: ['6 brands.', '12 weeks.', 'You build.'] as const,
    titleMidIndex: 1,
    sub: 'You work 12 weeks across our 6 brands in parallel — beauty, fashion, accessories, home. Real budgets, your own pitches, direct line to the founder. Marketing, e-commerce, ops, AI.',
    ctaPrimary: 'Apply now',
    ctaSecondary: 'What to expect',
    brandsLabel: 'You work simultaneously for',
    whyHeading: 'What you get with us.',
    why: [
      { tag: 'REAL OPS', title: 'Not a pitch-deck job', body: 'You work on real campaigns, real budgets, real customers. From day 1 to your final week. Output is measured.' },
      { tag: 'CROSS-BRAND', title: '6 brands, 1 team', body: 'You work simultaneously for Thiocyn, Paigh, Dr. Severin, Take A Shot, Wristr and Timber & John. Beauty, fashion, accessories, home — six markets as six labs. You see what works, where, and why.' },
      { tag: 'PITCH IT', title: 'Your ideas go live', body: 'See something that should be done differently? Pitch it. If it works, it ships — on one of the 6 brands. No "we noted it", actual ownership from week 1.' },
      { tag: 'MENTORING', title: 'Direct line to the founder', body: 'No corporate reporting chain. Weekly Interns Jour Fixe with Peter (founder) — he reviews your projects directly. Plus a buddy from the team.' },
      { tag: 'AI-NATIVE', title: 'You work with our AI stack', body: 'Higgsfield for video, automated content workflows, AI agents in daily ops. You work daily with a stack few outside top startups know.' },
    ],
    fitHeading: 'Who it\'s for.',
    fitBody: 'You\'ve built something or tried to — brand, side project, content account, campaign. You don\'t just want to execute, you want to understand why. You prefer real shipping over the perfect plan.',
    howHeading: 'How it works.',
    steps: [
      { n: '01', dur: 'today', title: 'Apply', body: 'Form below (4 steps, ~10 min). We ask for basics, your strongest project, preferences, and 15 personality questions.' },
      { n: '02', dur: '~1 week', title: 'Review', body: 'We read every application. Not just CV — also what you actually built.' },
      { n: '03', dur: '~2 weeks', title: 'Intro call', body: 'If fit: 30-minute call with onboarding lead and/or Peter. Both sides check match.' },
      { n: '04', dur: 'after', title: 'Case + start', body: 'Short practical case (~2h). On acceptance: start date, buddy, onboarding.' },
    ],
    trackRecordHeading: 'Built for you. Shaped with you.',
    trackRecordBody: 'Founders University is continuously shaped by former interns — with every new batch. Your feedback, your pitches, your ideas inform the next iteration. The goal isn\'t a standard internship; it\'s the right one for you. 3 months without a base salary, but with performance-based incentives. Anyone who actually moves the needle has a real shot at joining the team afterwards — the same path the people building this took.',
    trustHeading: 'We invest in you, not the other way around.',
    trustBody: 'No participation fee, no course fee, no hidden paywall. The fellowship is unpaid and fully remote — you work from wherever, we coordinate async. You invest your time + energy, we give you access to real brands, real budgets, and a direct line to the team. On conversion to a paid role after graduation: separate contract.',
    formHeading: 'Apply now',
    formSub: '~10 minutes. We reply within one week.',
  },
} as const;

export default function FoundersUniversityPage() {
  const locale = useLocale() as Locale;
  const t = COPY[locale];

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="bg-background text-foreground">
      <Navbar />

      <main className="pt-28">
        {/* HERO */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
            <div
              className="absolute left-[10%] top-[15%] h-[30rem] w-[30rem] rounded-full blur-[160px]"
              style={{ background: 'radial-gradient(circle, rgba(15,189,189,0.24) 0%, transparent 60%)' }}
            />
          </div>
          <div className="relative mx-auto max-w-5xl px-6 md:px-12">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.4em] text-teal">
              {t.eyebrow}
            </p>
            <h1 className="mt-6 text-pretty font-sans font-black leading-[0.95] tracking-tight text-[clamp(2.5rem,7vw,5.5rem)]">
              {t.titleLines.map((line, i) => (
                <span key={i} className={`block ${i === t.titleMidIndex ? 'text-teal' : ''}`}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
              {t.sub}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href="#form"
                className="inline-flex items-center justify-center rounded-full bg-teal px-7 py-3 text-base font-semibold text-background transition-colors hover:bg-teal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t.ctaPrimary}
              </a>
              <a
                href="#why"
                className="group inline-flex items-center gap-2 text-base font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {t.ctaSecondary}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* MARKEN-STRIP */}
        <section className="border-t border-border/30 bg-card/10 py-12 md:py-16">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground md:text-xs">
              {t.brandsLabel}
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {BRANDS.map((brand) => {
                const tagline = locale === 'de' ? brand.taglineDe : brand.taglineEn;
                return (
                  <li key={brand.slug} className="flex flex-col gap-3">
                    <div className="flex h-24 w-full items-center justify-center rounded-xl bg-white px-3 py-3 transition-transform hover:-translate-y-0.5">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <span className="text-center text-xs leading-snug text-muted-foreground/80 md:text-left">
                      {tagline}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* WHY / BENEFITS */}
        <section id="why" className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.whyHeading}
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {t.why.map((item, i) => (
                <article
                  key={item.tag}
                  className="relative isolate overflow-hidden rounded-2xl border border-border/40 bg-card/20 p-8 transition-colors hover:border-teal/40"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-4 -top-6 -z-10 select-none font-sans text-[140px] font-black leading-none text-white tabular-nums"
                    style={{ opacity: 0.035 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-teal">
                      {item.tag}
                    </p>
                    <h3 className="mt-4 font-sans text-2xl font-bold leading-tight tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                      {item.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* FIT */}
        <section className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 md:px-12">
            <h2 className="text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.fitHeading}
            </h2>
            <p className="mt-10 text-pretty text-lg leading-relaxed text-foreground/80 md:text-xl">
              {t.fitBody}
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.howHeading}
            </h2>
            <ol className="grid grid-cols-1 gap-10 md:grid-cols-4">
              {t.steps.map((s, i) => (
                <li key={i} className="relative isolate overflow-hidden">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-2 -top-4 -z-10 select-none font-sans text-[110px] font-black leading-none text-teal tabular-nums"
                    style={{ opacity: 0.08 }}
                  >
                    {s.n}
                  </span>
                  <div className="relative pt-12">
                    <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      {s.dur}
                    </p>
                    <h3 className="mt-3 font-sans text-lg font-bold leading-tight tracking-tight">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TRACK-RECORD — built by ex-fellows */}
        <section className="border-t border-border/30 bg-card/10 py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 md:px-12">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.4em] text-teal md:text-xs">
              {locale === 'de' ? 'Track Record' : 'Track Record'}
            </p>
            <h2 className="mt-4 text-pretty font-sans font-bold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.trackRecordHeading}
            </h2>
            <p className="mt-8 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              {t.trackRecordBody}
            </p>
          </div>
        </section>

        {/* TRUST */}
        <section className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 md:px-12 text-center">
            <h2 className="text-pretty font-serif italic text-[clamp(1.75rem,4vw,3rem)] leading-tight text-foreground">
              {t.trustHeading}
            </h2>
            <p className="mt-8 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              {t.trustBody}
            </p>
          </div>
        </section>

        {/* FORM */}
        <section id="form" className="border-t border-border/30 bg-card/10 py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-6 md:px-12">
            <header className="mb-12">
              <h2 className="text-pretty font-sans font-black leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
                {t.formHeading}
              </h2>
              <p className="mt-4 text-pretty text-base text-muted-foreground md:text-lg">
                {t.formSub}
              </p>
            </header>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner /></div>}>
              <ApplicationForm />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
