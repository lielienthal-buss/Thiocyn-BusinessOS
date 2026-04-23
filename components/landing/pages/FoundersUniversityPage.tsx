import React, { Suspense } from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import Spinner from '@/components/ui/Spinner';
import { useLocale } from '@/lib/landing/i18n';

const ApplicationForm = React.lazy(() => import('@/components/ApplicationForm'));

type Locale = 'de' | 'en';

const COPY = {
  de: {
    eyebrow: '/ 01 · FOUNDERS UNIVERSITY',
    title: 'Baue Marken von innen. Mit den Leuten, die sie bauen.',
    sub: '3–6 Monate Fellowship in unserem House. Marketing, E-Commerce, Ops, AI — über 6 Marken gleichzeitig. Für alle, die nicht Theorie lernen wollen, sondern Realität.',
    whyHeading: 'Was du bei uns bekommst.',
    why: [
      { tag: 'REAL OPS', title: 'Kein Pitch-Deck-Job', body: 'Du arbeitest an echten Kampagnen, echten Budgets, echten Kund:innen. Von Tag 1 bis Tag 180. Output wird gemessen.' },
      { tag: 'CROSS-BRAND', title: '6 Marken, 1 Team', body: 'Du lernst Marketing in Beauty, Fashion, Accessoires, Home — gleichzeitig. Jede Brand ist ein eigenes Labor. Du siehst was funktioniert, wo und warum.' },
      { tag: 'MENTORING', title: 'Direkter Draht zu Gründer + Team', body: 'Kein Corporate-Reporting-Chain. Peter (Founder) reviewed deine Projekte selbst. Dazu: Buddy aus dem Team, monatliche 1:1s.' },
      { tag: 'AI-NATIVE', title: 'Du arbeitest mit unserem AI-Stack', body: 'Pythia (Trend-Forecast), Content-Pipelines, Agent-Systeme. Du verstehst AI-Ops auf der Ebene, die außerhalb der Top-Startups niemand beherrscht.' },
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
    trustHeading: 'Wir investieren in dich, nicht umgekehrt.',
    trustBody: 'Keine Teilnahmegebühr, keine Kursgebühren, kein verstecktes Paywall. Fellowship ist vergütet, du arbeitest remote oder hybrid (HQ Hamburg). Einarbeitung läuft über unseren Onboarding Lead — du bist nie allein am Puzzle.',
    formHeading: 'Jetzt bewerben',
    formSub: 'Ca. 10 Minuten. Wir antworten innerhalb einer Woche.',
  },
  en: {
    eyebrow: '/ 01 · FOUNDERS UNIVERSITY',
    title: 'Build brands from the inside. With the people who build them.',
    sub: '3–6 month fellowship in our house. Marketing, e-commerce, ops, AI — across 6 brands at once. For people who want to learn reality, not theory.',
    whyHeading: 'What you get with us.',
    why: [
      { tag: 'REAL OPS', title: 'Not a pitch-deck job', body: 'You work on real campaigns, real budgets, real customers. From day 1 to day 180. Output is measured.' },
      { tag: 'CROSS-BRAND', title: '6 brands, 1 team', body: 'You learn marketing in beauty, fashion, accessories, home — simultaneously. Each brand is its own lab. You see what works, where, and why.' },
      { tag: 'MENTORING', title: 'Direct line to founder + team', body: 'No corporate reporting chain. Peter (founder) reviews your projects himself. Plus: buddy from the team, monthly 1:1s.' },
      { tag: 'AI-NATIVE', title: 'You work with our AI stack', body: 'Pythia (trend forecast), content pipelines, agent systems. You understand AI-ops at a level few outside top startups have.' },
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
    trustHeading: 'We invest in you, not the other way around.',
    trustBody: 'No participation fee, no course fee, no hidden paywall. The fellowship is paid, you work remote or hybrid (HQ Hamburg). Onboarding runs through our onboarding lead — you\'re never alone with the puzzle.',
    formHeading: 'Apply now',
    formSub: '~10 minutes. We reply within one week.',
  },
} as const;

export default function FoundersUniversityPage() {
  const locale = useLocale() as Locale;
  const t = COPY[locale];

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
              {t.title}
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
              {t.sub}
            </p>
          </div>
        </section>

        {/* WHY / BENEFITS */}
        <section className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.whyHeading}
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {t.why.map((item) => (
                <article
                  key={item.tag}
                  className="rounded-2xl border border-border/40 bg-card/20 p-8 transition-colors hover:border-teal/40"
                >
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-teal">
                    {item.tag}
                  </p>
                  <h3 className="mt-4 font-sans text-2xl font-bold leading-tight tracking-tight">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                    {item.body}
                  </p>
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
        <section className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.howHeading}
            </h2>
            <ol className="grid grid-cols-1 gap-10 md:grid-cols-4">
              {t.steps.map((s, i) => (
                <li key={i} className="relative">
                  <div className="font-serif italic text-6xl text-teal/70 leading-none tabular-nums">
                    {s.n}
                  </div>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                    {s.dur}
                  </p>
                  <h3 className="mt-3 font-sans text-lg font-bold leading-tight tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
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
