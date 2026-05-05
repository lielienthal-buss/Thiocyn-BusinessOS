import React, { Suspense } from 'react';
import { ArrowUpRight } from 'lucide-react';

const LinkedinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import Spinner from '@/components/ui/Spinner';
import { useLocale } from '@/lib/landing/i18n';

const PETER_LINKEDIN = 'https://www.linkedin.com/in/peter-hart-ffm';

const FoundersInquiryForm = React.lazy(() => import('../forms/FoundersInquiryForm'));

type Locale = 'de' | 'en';

const COPY = {
  de: {
    eyebrow: '/ 03 · FÜR GRÜNDER',
    titleLines: ['Deine Marke.', 'In die richtigen', 'Hände.'] as const,
    titleMidIndex: 1,
    sub: 'Wir übernehmen nachhaltige D2C-Marken und integrieren sie in unser House — in 3 Monaten, nicht 5 Jahren Earn-Out.',
    ctaPrimary: 'Anfrage starten',
    ctaSecondary: 'Wie der Verkauf läuft',
    whyHeading: 'Warum an HSB verkaufen?',
    why: [
      { tag: 'INTEGRATION', title: '3 Monate statt 5 Jahre', body: 'Kein ewiger Earn-Out. Unser in Ressorts aufgeteiltes Team übernimmt Marketing, E-Commerce, Kundenservice und Buchhaltung in 1–3 Monaten. Du bist dann frei.' },
      { tag: 'LEGACY', title: 'Deine Marke bleibt deine Marke', body: 'Wir kaufen keine Nummern — wir kaufen Marken. Story, Identity, Kundenbeziehung bleiben intakt. Keine Verwässerung im Billo-Portfolio.' },
      { tag: 'BRANCHEN-AGNOSTISCH', title: 'Wir sind keine Kategorie-Spezialisten', body: 'Unser Team hat selbst Marken in Beauty, Fashion, Accessoires, Home gebaut. Wir kaufen nach Qualität, nicht nach Sektor.' },
      { tag: 'CASH-FOKUS', title: 'Klare, cash-lastige Deals', body: 'Deal-Struktur: großer Cash-at-Closing-Anteil. Wenn du einen erfolgsabhängigen Anteil willst: klar abgegrenzt und zeitlich begrenzt.' },
    ],
    howHeading: 'So läuft es ab.',
    steps: [
      { n: '01', dur: 'heute', title: 'Anfrage', body: 'Du füllst das Formular unten aus. 2 Minuten. Antwort von Peter innerhalb von 5 Werktagen.' },
      { n: '02', dur: '~2 Wochen', title: 'NDA + Erstgespräch', body: 'NDA wird ausgetauscht. Telefonat oder Videocall. Wir sprechen über deine Marke und unsere Fit-Einschätzung.' },
      { n: '03', dur: '~4 Wochen', title: 'Indikatives Angebot / LOI', body: 'Bei beiderseitigem Fit: schriftliches indikatives Angebot mit Kaufpreis, Struktur, Bedingungen.' },
      { n: '04', dur: '~6–8 Wochen', title: 'Due Diligence', body: 'Zahlen, Operations, Legal. Wir koordinieren Anwälte, Steuerberater, Accounting. Du übergibst Infos strukturiert.' },
      { n: '05', dur: '~2 Wochen', title: 'Closing', body: 'Signing & Closing. Kaufpreis fließt. Übergang beginnt — parallel zu unserer Integration.' },
    ],
    trustHeading: 'Peter liest jede Anfrage selbst.',
    trustBody: '4 abgeschlossene Akquisitionen im Portfolio: Dr. Severin (2013), Take A Shot (Okt 2022), Paigh (März 2023), Timber & John (Jan 2024).',
    formHeading: 'Gespräch beginnen',
    formSub: 'Alle Angaben werden vertraulich behandelt und ausschließlich von der Geschäftsführung gelesen.',
  },
  en: {
    eyebrow: '/ 03 · FOR FOUNDERS',
    titleLines: ['Your brand.', 'In the right', 'hands.'] as const,
    titleMidIndex: 1,
    sub: 'We acquire sustainable D2C brands and integrate them into our house — in 3 months, not a 5-year earn-out.',
    ctaPrimary: 'Start inquiry',
    ctaSecondary: 'How the sale works',
    whyHeading: 'Why sell to HSB?',
    why: [
      { tag: 'INTEGRATION', title: '3 months, not 5 years', body: 'No endless earn-out. Our resourced team takes over marketing, e-commerce, customer service and finance in 1–3 months. You\'re free after that.' },
      { tag: 'LEGACY', title: 'Your brand stays your brand', body: 'We don\'t buy numbers — we buy brands. Story, identity, customer relationships stay intact. No dilution in a faceless portfolio.' },
      { tag: 'CATEGORY-AGNOSTIC', title: 'We\'re not category specialists', body: 'Our team has built brands in beauty, fashion, accessories, home. We buy for quality, not sector.' },
      { tag: 'CASH-HEAVY', title: 'Clear, cash-heavy deals', body: 'Structure: large cash-at-closing share. If you want a variable component, clearly scoped and time-capped.' },
    ],
    howHeading: 'How it works.',
    steps: [
      { n: '01', dur: 'today', title: 'Inquiry', body: 'Fill the form below. 2 minutes. Reply from Peter within 5 business days.' },
      { n: '02', dur: '~2 weeks', title: 'NDA + first call', body: 'NDA exchanged. Phone or video call. We talk about your brand and our fit assessment.' },
      { n: '03', dur: '~4 weeks', title: 'Indicative offer / LOI', body: 'If mutual fit: written indicative offer with price, structure, conditions.' },
      { n: '04', dur: '~6–8 weeks', title: 'Due diligence', body: 'Numbers, operations, legal. We coordinate lawyers, tax, accounting. You hand over info structured.' },
      { n: '05', dur: '~2 weeks', title: 'Closing', body: 'Signing & closing. Purchase price flows. Transition starts — in parallel with our integration.' },
    ],
    trustHeading: 'Peter reads every inquiry himself.',
    trustBody: '4 closed acquisitions in the portfolio: Dr. Severin (2013), Take A Shot (Oct 2022), Paigh (Mar 2023), Timber & John (Jan 2024).',
    formHeading: 'Start the conversation',
    formSub: 'All information is treated confidentially and read exclusively by leadership.',
  },
} as const;

export default function FoundersPage() {
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
                href="#how"
                className="group inline-flex items-center gap-2 text-base font-medium text-foreground/80 transition-colors hover:text-foreground"
              >
                {t.ctaSecondary}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* WHY / BENEFITS */}
        <section className="border-t border-border/30 py-24 md:py-32">
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

        {/* HOW IT WORKS */}
        <section id="how" className="border-t border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(1.75rem,4vw,3rem)]">
              {t.howHeading}
            </h2>
            <ol className="grid grid-cols-1 gap-10 md:grid-cols-5">
              {t.steps.map((s, i) => (
                <li key={i} className="relative isolate overflow-hidden">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -left-2 -top-4 -z-10 select-none font-sans text-[110px] font-black leading-none text-teal tabular-nums"
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
            <a
              href={PETER_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/30 px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-teal/60 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Peter Hart on LinkedIn"
            >
              <LinkedinIcon className="h-4 w-4" />
              <span>{locale === 'de' ? 'Peter Hart auf LinkedIn ansehen' : 'View Peter Hart on LinkedIn'}</span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 opacity-60" />
            </a>
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
              <FoundersInquiryForm />
            </Suspense>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
