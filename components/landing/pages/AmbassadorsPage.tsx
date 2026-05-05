import React, { Suspense } from 'react';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import Spinner from '@/components/ui/Spinner';
import { useLocale } from '@/lib/landing/i18n';

const AmbassadorForm = React.lazy(() => import('../forms/AmbassadorForm'));

type Locale = 'de' | 'en';

const COPY = {
  de: {
    eyebrow: '/ 02 · AMBASSADOR',
    titleLines: ['Bau die Marke.', 'Mit uns.', 'Von Anfang an.'] as const,
    titleMidIndex: 1,
    sub: 'Wir starten gerade mit unserem Ambassador-Programm. Selektiv, persönlich, direkter Draht zum Team. Du bist nicht Creator Nr. 247 auf einer Liste.',
    ctaPrimary: 'Jetzt bewerben',
    ctaSecondary: 'Was du bekommst',
    whyHeading: 'Was du bekommst.',
    why: [
      { tag: 'SAMPLES', title: 'Echte Produkte, nicht Schrott', body: 'Du testest die Produkte vor Posting. Sample-Versand binnen 14 Tagen nach Freigabe. Bei Nicht-Gefallen: kein Post, kein Druck.' },
      { tag: 'COMMISSIONS', title: 'Faire Provisionen, monatlich', body: 'Provisionssätze werden individuell vereinbart — abhängig von Produktmarge und deinem Reichweiten-Profil. Abrechnung per PayPal oder Banküberweisung am Monatsende. Tracking über eigene Codes.' },
      { tag: 'CROSS-BRAND', title: 'Du bleibst frei', body: 'Aktuell live für Paigh. Weitere HSB-Brands folgen schrittweise — du kannst dann erweitern, wenn du willst. Keine Exklusivität: parallele Kooperationen mit anderen Brands sind möglich.' },
      { tag: 'DIREKT', title: 'Direkter Kontakt', body: 'Noch keine Mass-Creator-Plattform. Du sprichst mit echten Menschen aus dem HSB-Team. Feedback kommt zügig. Anpassungen sind möglich.' },
    ],
    howHeading: 'So läuft es ab.',
    steps: [
      { n: '01', dur: 'jetzt', title: 'Bewerbung', body: 'Formular unten. 3 Minuten. Wir antworten innerhalb von 10 Tagen.' },
      { n: '02', dur: '~2 Wochen', title: 'Intro + Match', body: 'Kurzes Intro-Gespräch (Video oder Text). Wir matchen dich zu 1–3 Brands basierend auf Nische und Fit.' },
      { n: '03', dur: '~2 Wochen', title: 'Samples + Brief', body: 'Samples gehen raus. Du bekommst einen minimalen Brief — kein Micromanagement. Deine Stimme bleibt deine Stimme.' },
      { n: '04', dur: 'laufend', title: 'Content + Provision', body: 'Du postest. Tracking-Link oder Code liegt dir vor. Monatliche Abrechnung, transparentes Dashboard.' },
    ],
    trustHeading: 'Frühe Phase. Persönliche Betreuung.',
    trustBody: 'Wir bauen das Programm gerade auf. Das heißt: wenige, ausgewählte Creator, direkter Draht zum Team. Kein Lost-in-the-Crowd. Wenn du Marken inhaltlich verstehst und nicht nur Reach anbietest — wir hören dir zu.',
    formHeading: 'Jetzt bewerben',
    formSub: 'Wir lesen jede Bewerbung. Antwort innerhalb von 10 Tagen.',
  },
  en: {
    eyebrow: '/ 02 · AMBASSADOR',
    titleLines: ['Build the brand.', 'With us.', 'From day one.'] as const,
    titleMidIndex: 1,
    sub: 'We\'re starting our Ambassador Program. Selective, personal, direct line to the team. You\'re not creator #247 on a list.',
    ctaPrimary: 'Apply now',
    ctaSecondary: 'What you get',
    whyHeading: 'What you get.',
    why: [
      { tag: 'SAMPLES', title: 'Real products, not junk', body: 'You test products before posting. Samples shipped within 14 days of approval. If you don\'t like it: no post, no pressure.' },
      { tag: 'COMMISSIONS', title: 'Fair commissions, monthly', body: 'Commission rates are negotiated individually — based on product margin and your reach profile. Paid via PayPal or bank transfer at month-end. Tracking via your own codes.' },
      { tag: 'CROSS-BRAND', title: 'You stay free', body: 'Currently live for Paigh. More HSB brands roll out step by step — you can expand if you want. No exclusivity: parallel collaborations with other brands are possible.' },
      { tag: 'DIRECT', title: 'Direct contact', body: 'Not a mass creator platform. You talk to real people from the HSB team. Feedback comes fast. Adjustments possible.' },
    ],
    howHeading: 'How it works.',
    steps: [
      { n: '01', dur: 'today', title: 'Apply', body: 'Form below. 3 minutes. We reply within 10 days.' },
      { n: '02', dur: '~2 weeks', title: 'Intro + match', body: 'Short intro call (video or text). We match you to 1–3 brands based on niche and fit.' },
      { n: '03', dur: '~2 weeks', title: 'Samples + brief', body: 'Samples ship. You get a minimal brief — no micromanagement. Your voice stays your voice.' },
      { n: '04', dur: 'ongoing', title: 'Content + commission', body: 'You post. Tracking link or code is yours. Monthly payout, transparent dashboard.' },
    ],
    trustHeading: 'Early phase. Personal attention.',
    trustBody: 'We\'re building the program right now. That means: few, selected creators, direct line to the team. No lost-in-the-crowd. If you understand brands, not just numbers — we\'ll listen.',
    formHeading: 'Apply now',
    formSub: 'We read every application. Reply within 10 days.',
  },
} as const;

export default function AmbassadorsPage() {
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
              className="absolute right-[5%] top-[10%] h-[30rem] w-[30rem] rounded-full blur-[160px]"
              style={{ background: 'radial-gradient(circle, rgba(242,112,98,0.22) 0%, transparent 60%)' }}
            />
          </div>
          <div className="relative mx-auto max-w-5xl px-6 md:px-12">
            <p className="font-mono text-xs font-medium uppercase tracking-[0.4em] text-coral">
              {t.eyebrow}
            </p>
            <h1 className="mt-6 text-pretty font-sans font-black leading-[0.95] tracking-tight text-[clamp(2.5rem,7vw,5.5rem)]">
              {t.titleLines.map((line, i) => (
                <span key={i} className={`block ${i === t.titleMidIndex ? 'text-coral' : ''}`}>
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
                className="inline-flex items-center justify-center rounded-full bg-coral px-7 py-3 text-base font-semibold text-background transition-colors hover:bg-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
                  className="relative isolate overflow-hidden rounded-2xl border border-border/40 bg-card/20 p-8 transition-colors hover:border-coral/40"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-4 -top-6 -z-10 select-none font-sans text-[140px] font-black leading-none text-white tabular-nums"
                    style={{ opacity: 0.035 }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative">
                    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.3em] text-coral">
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
                    className="pointer-events-none absolute -left-2 -top-4 -z-10 select-none font-sans text-[110px] font-black leading-none text-coral tabular-nums"
                    style={{ opacity: 0.10 }}
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
              <AmbassadorForm />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
