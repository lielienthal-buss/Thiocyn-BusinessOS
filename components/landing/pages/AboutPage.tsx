import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Linkedin } from 'lucide-react';

const PETER_LINKEDIN = 'https://www.linkedin.com/in/peter-hart-ffm';
import Navbar from '../sections/Navbar';
import Footer from '../sections/Footer';
import BlurText from '../effects/BlurText';
import SplitText from '../effects/SplitText';
import { useLocale } from '@/lib/landing/i18n';

type Locale = 'de' | 'en';

const COPY = {
  de: {
    eyebrow: '/ FOUNDER',
    name: 'Peter Hart',
    role: 'Gründer & Managing Director',
    kicker: 'Unternehmer seit 2013. Baut heute sechs Marken unter einem Dach.',

    quote:
      '"Der kürzeste Weg zu einer guten Marke ist, selbst eine gebaut zu haben. Der kürzeste Weg zu sechs guten Marken ist ein Team, das in allen sechs gebaut hat."',

    storyHeading: 'Die Geschichte dahinter.',
    storyLead:
      'Mit 22 das erste Unternehmen gegründet. Mit 26 in Silicon Valley. Mit 30+ eine Holding, die nachhaltige D2C-Marken akquiriert und betreibt.',
    storyParagraph:
      'Peter baut, seit er denken kann. Sein erstes Unternehmen, Dr. Severin, gründete er 2013 noch während des Studiums an der Goethe-Universität. Die Marke existiert bis heute — und ist heute Teil des HSB-Portfolios. Zwischendurch: ein Preis für Unternehmertum, ein Stanford-Programm über Unternehmenskultur, ein Silicon-Valley-Batch-Winner-Ticket mit eigenem Office in Sunnyvale.',
    storyParagraph2:
      'Heute ist HSB das Vehikel für das, was er von Anfang an wollte: gute Marken bauen — mehr als eine, parallel, mit einem Team, das wirklich operativ versteht, wovon es redet.',

    arcHeading: 'Karriere-Arc',
    timeline: [
      { year: '2013', title: 'Studium + Gründung', body: 'B.Sc. Wirtschaftswissenschaften an der Goethe-Universität in 4 Semestern. Parallel gründet Peter Dr. Severin — Premium-Hautpflege. Die Marke läuft bis heute.' },
      { year: '2015', title: '1. Platz Goethe-Innovationspreis', body: 'Prämiert als Unternehmer des Jahrgangs. 10.000 € Startkapital für das nächste Kapitel.' },
      { year: '2015–17', title: 'Internationale Stationen', body: 'Singapore Ministry of Manpower. Prag, Budapest, Warschau. Continental Automotive. Deutsche Börse. Aerospace-Hintergrund vom TU-München-Racing-Team.' },
      { year: '2019', title: 'Silicon Valley', body: 'Plug&Play Batch Winner. 150.000 € + ein Jahr Office in Sunnyvale, CA. Stanford-Programm: Building Company Culture.' },
      { year: '2022', title: 'House of Sustainable Brands', body: 'Erste Akquisition: Take A Shot (nachhaltige Eyewear, Leipzig). Der Startpunkt der Gruppe.' },
      { year: '2023–24', title: 'Portfolio-Expansion', body: 'Paigh (Slow Fashion), Timber & John (Naturmode + Holzuhren), Dr. Severin ins HSB-Portfolio, zwei weitere Brands folgen.' },
      { year: 'heute', title: '6 Brands. Ein Haus.', body: 'Shared Ops, geteilte Intelligenz, gemeinsame Infrastruktur. Pipeline: 20+ Targets, Umsatzbereich 500k bis 27M €.' },
    ],

    milestonesHeading: 'In Zahlen.',
    milestones: [
      { number: '11', label: 'Jahre Unternehmer' },
      { number: '6', label: 'Marken unter einem Dach' },
      { number: '4', label: 'Akquisitionen abgeschlossen' },
      { number: '1', label: 'Silicon-Valley-Batch-Winner' },
    ],

    whyHeading: 'Warum HSB.',
    whyBody:
      'Die meisten Holdings kaufen, melken, verlassen. Peters These: Wer selbst gebaut hat, weiß, wie man baut. HSB integriert Brands in 3 Monaten statt 5 Jahre Earn-Out. Das Team läuft operativ — Marketing, E-Commerce, Kundenservice, Buchhaltung — und zieht gleichzeitig an sechs Marken.',

    connectHeading: 'Connect.',
    connectBody: 'Direkter Draht für Gründer, die über einen Verkauf nachdenken.',
    ctaSell: 'Marke verkaufen',
    ctaHome: 'Zurück zur Landing',
  },
  en: {
    eyebrow: '/ FOUNDER',
    name: 'Peter Hart',
    role: 'Founder & Managing Director',
    kicker: 'Entrepreneur since 2013. Building six brands under one house today.',

    quote:
      '"The shortest path to one good brand is to have built one yourself. The shortest path to six good brands is a team that has built in all six."',

    storyHeading: 'The story behind it.',
    storyLead:
      'Started the first company at 22. Silicon Valley at 26. Now runs a holding that acquires and operates sustainable D2C brands.',
    storyParagraph:
      'Peter has been building since he can remember. His first company, Dr. Severin, was founded in 2013 while he was still a student at Goethe University. The brand still exists today — and is now part of the HSB portfolio. In between: an entrepreneurship prize, a Stanford program on company culture, a Silicon Valley batch-winner ticket with his own office in Sunnyvale.',
    storyParagraph2:
      'HSB is the vehicle for what he wanted from the start: to build good brands — more than one, in parallel, with a team that actually understands the operations underneath.',

    arcHeading: 'Career arc',
    timeline: [
      { year: '2013', title: 'Studies + First company', body: 'B.Sc. Business at Goethe University, completed in four semesters. In parallel, founded Dr. Severin — premium skincare. Still running today.' },
      { year: '2015', title: '1st place Goethe Innovation Prize', body: 'Recognized as entrepreneur of the class. €10k seed capital for the next chapter.' },
      { year: '2015–17', title: 'International stations', body: 'Singapore Ministry of Manpower. Prague, Budapest, Warsaw. Continental Automotive. Deutsche Börse. Aerospace background via TU Munich Racing Team.' },
      { year: '2019', title: 'Silicon Valley', body: 'Plug&Play Batch Winner. €150k + one year in Sunnyvale, CA. Stanford program: Building Company Culture.' },
      { year: '2022', title: 'House of Sustainable Brands', body: 'First acquisition: Take A Shot (sustainable eyewear, Leipzig). Start of the group.' },
      { year: '2023–24', title: 'Portfolio expansion', body: 'Paigh (slow fashion), Timber & John (natural apparel + wood watches), Dr. Severin rolled in, two more brands following.' },
      { year: 'today', title: '6 brands. One house.', body: 'Shared ops, shared intelligence, shared infrastructure. Pipeline: 20+ targets, revenue range 500k to 27M €.' },
    ],

    milestonesHeading: 'In numbers.',
    milestones: [
      { number: '11', label: 'Years as founder' },
      { number: '6', label: 'Brands under one roof' },
      { number: '4', label: 'Acquisitions closed' },
      { number: '1', label: 'Silicon Valley batch winner' },
    ],

    whyHeading: 'Why HSB.',
    whyBody:
      "Most holdings acquire, extract, exit. Peter's thesis: if you've built it yourself, you know how to build. HSB integrates brands in 3 months instead of a 5-year earn-out. The team runs operations — marketing, e-commerce, customer service, finance — and pulls on six brands at once.",

    connectHeading: 'Connect.',
    connectBody: 'Direct line for founders thinking about selling.',
    ctaSell: 'Sell your brand',
    ctaHome: 'Back to landing',
  },
} as const;

export default function AboutPage() {
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
        <section className="relative overflow-hidden border-b border-border/30 py-24 md:py-32">
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
            <div
              className="absolute left-[10%] top-[10%] h-[32rem] w-[32rem] rounded-full blur-[160px]"
              style={{ background: 'radial-gradient(circle, rgba(15,189,189,0.22) 0%, transparent 60%)' }}
            />
            <div
              className="absolute right-[5%] bottom-[-10%] h-[28rem] w-[28rem] rounded-full blur-[160px]"
              style={{ background: 'radial-gradient(circle, rgba(242,112,98,0.16) 0%, transparent 60%)' }}
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 md:px-12">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:items-start md:gap-16">
              <div className="md:col-span-7">
                <BlurText
                  text={t.eyebrow}
                  className="justify-start font-mono text-xs font-medium uppercase tracking-[0.4em] text-coral"
                  animateBy="words"
                  direction="top"
                  delay={40}
                />

                <h1 className="mt-8 text-pretty font-sans font-black leading-[0.9] tracking-[-0.04em] text-[clamp(3rem,9vw,7rem)]">
                  <SplitText
                    text={t.name}
                    tag="span"
                    className="block"
                    textAlign="left"
                    delay={24}
                    duration={0.95}
                    splitType="chars"
                    from={{ opacity: 0, y: 80 }}
                    to={{ opacity: 1, y: 0 }}
                  />
                </h1>

                <p className="mt-4 font-serif italic text-xl text-muted-foreground md:text-2xl">
                  {t.role}
                </p>
                <p className="mt-8 text-pretty text-lg text-foreground/80 md:text-xl">
                  {t.kicker}
                </p>
                <a
                  href={PETER_LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/30 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-teal/60 hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label="Peter Hart on LinkedIn"
                >
                  <Linkedin aria-hidden="true" className="h-4 w-4" />
                  <span>LinkedIn</span>
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4 opacity-60" />
                </a>
              </div>

              <div className="md:col-span-5">
                <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/30 shadow-[0_40px_80px_-30px_rgba(15,189,189,0.35)]">
                  <img
                    src="/team/peter-hart.jpg"
                    alt="Peter Hart"
                    width={1200}
                    height={1200}
                    loading="eager"
                    fetchPriority="high"
                    className="block h-full w-full object-cover"
                  />
                </div>
                <figcaption className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
                  Founder · 2026
                </figcaption>
              </div>
            </div>

            <blockquote className="mt-20 max-w-4xl border-l-2 border-coral/60 pl-6 font-serif text-2xl italic leading-relaxed text-foreground/90 md:text-3xl">
              {t.quote}
            </blockquote>
          </div>
        </section>

        {/* STORY */}
        <section className="border-b border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 md:px-12">
            <h2 className="text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(2rem,5vw,4rem)]">
              {t.storyHeading}
            </h2>
            <p className="mt-10 text-pretty font-serif text-2xl leading-relaxed italic text-foreground/90 md:text-3xl">
              {t.storyLead}
            </p>
            <div className="mt-10 space-y-6 text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
              <p>{t.storyParagraph}</p>
              <p>{t.storyParagraph2}</p>
            </div>
          </div>
        </section>

        {/* TIMELINE */}
        <section className="border-b border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 font-mono text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground">
              {t.arcHeading}
            </h2>

            <ol className="relative space-y-12 border-l border-border/40 pl-8 md:space-y-16 md:pl-12">
              {t.timeline.map((item, i) => (
                <li key={i} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[calc(2rem+5px)] top-2 h-3 w-3 rounded-full bg-coral md:-left-[calc(3rem+5px)]"
                  />
                  <div className="font-mono text-sm uppercase tracking-[0.3em] text-coral">
                    {item.year}
                  </div>
                  <h3 className="mt-2 font-sans text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* MILESTONES */}
        <section className="border-b border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6 md:px-12">
            <h2 className="mb-16 font-mono text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground">
              {t.milestonesHeading}
            </h2>
            <div className="grid grid-cols-2 gap-y-16 md:grid-cols-4">
              {t.milestones.map((m, i) => (
                <div key={i}>
                  <div className="font-sans text-[clamp(3rem,8vw,6rem)] font-black leading-none tracking-tight tabular-nums text-teal">
                    {m.number}
                  </div>
                  <p className="mt-4 max-w-[14rem] text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    {m.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY HSB */}
        <section className="border-b border-border/30 py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 md:px-12">
            <h2 className="text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(2rem,5vw,4rem)]">
              {t.whyHeading}
            </h2>
            <p className="mt-10 text-pretty text-xl leading-relaxed text-foreground/80 md:text-2xl">
              {t.whyBody}
            </p>
          </div>
        </section>

        {/* CONNECT */}
        <section className="py-24 md:py-32">
          <div className="mx-auto max-w-4xl px-6 md:px-12 text-center">
            <h2 className="text-pretty font-sans font-semibold leading-tight tracking-tight text-[clamp(2rem,5vw,4rem)]">
              {t.connectHeading}
            </h2>
            <p className="mt-6 text-pretty text-lg text-muted-foreground md:text-xl">
              {t.connectBody}
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row">
              <Link
                to="/founders"
                className="inline-flex items-center gap-3 rounded-full bg-teal px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-background transition-colors hover:bg-teal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t.ctaSell}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-3 rounded-full border border-border/60 px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t.ctaHome}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
