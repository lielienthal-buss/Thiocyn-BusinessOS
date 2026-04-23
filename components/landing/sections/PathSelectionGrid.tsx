import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Handshake, ArrowRight } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useTranslations } from '@/lib/landing/i18n';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Accent = 'teal' | 'coral' | 'neutral';

interface PathDef {
  key: 'foundersUniversity' | 'ambassadors' | 'founders';
  href: string;
  Icon: typeof GraduationCap;
  accent: Accent;
  number: string;
}

const PATHS: PathDef[] = [
  { key: 'foundersUniversity', href: '/founders-university', Icon: GraduationCap, accent: 'teal',    number: '01' },
  { key: 'ambassadors',        href: '/brand-ambassador',    Icon: Users,          accent: 'coral',   number: '02' },
  { key: 'founders',           href: '/founders',            Icon: Handshake,      accent: 'neutral', number: '03' },
];

const ACCENT_RGB: Record<Accent, string> = {
  teal:    '15, 189, 189',
  coral:   '242, 112, 98',
  neutral: '200, 200, 205',
};

export function PathSelectionGrid() {
  const t = useTranslations('paths');
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;

      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const distance = track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: -distance,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${Math.round(distance * 2.2)}`,
            scrub: 1.2,
            pin: true,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-background"
      aria-label="Path selection"
    >
      <div className="pointer-events-none absolute left-6 top-6 z-20 md:left-12 md:top-12">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground">
          {t('title')}
        </p>
      </div>

      <div ref={trackRef} className="flex h-screen w-max will-change-transform md:w-[300vw]">
        {PATHS.map((p) => (
          <PathPanel
            key={p.key}
            href={p.href}
            Icon={p.Icon}
            accent={p.accent}
            number={p.number}
            title={t(`${p.key}.title`)}
            hook={t(`${p.key}.hook`)}
            cta={t(`${p.key}.cta`)}
          />
        ))}
      </div>
    </section>
  );
}

interface PathPanelProps {
  href: string;
  Icon: typeof GraduationCap;
  accent: Accent;
  number: string;
  title: string;
  hook: string;
  cta: string;
}

function PathPanel({ href, Icon, accent, number, title, hook, cta }: PathPanelProps) {
  const rgb = ACCENT_RGB[accent];

  return (
    <div className="relative flex h-screen w-screen shrink-0 items-center justify-center overflow-hidden border-r border-border/20">
      <div
        className="absolute -right-[20%] top-1/4 h-[70vh] w-[70vh] rounded-full blur-[140px] opacity-60"
        style={{ background: `rgba(${rgb}, 0.18)` }}
        aria-hidden
      />
      <div
        className="absolute -left-[10%] bottom-[10%] h-[50vh] w-[50vh] rounded-full blur-[160px] opacity-50"
        style={{ background: `rgba(${rgb}, 0.10)` }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-12 gap-8 px-8 md:px-16">
        <div className="col-span-12 md:col-span-5">
          <span
            className="path-number block font-serif italic leading-none"
            style={{ color: `rgb(${rgb})` }}
          >
            {number}
          </span>
        </div>

        <div className="col-span-12 md:col-span-6 md:col-start-7 flex flex-col justify-center">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: `rgba(${rgb}, 0.12)`, color: `rgb(${rgb})` }}
            aria-hidden="true"
          >
            <Icon className="h-7 w-7" />
          </div>

          <h3 className="path-title mt-8 font-sans font-bold leading-[0.95] tracking-tight">
            {title}
          </h3>

          <p className="path-hook mt-6 max-w-md text-pretty leading-relaxed text-muted-foreground">
            {hook}
          </p>

          <Link
            to={href}
            data-tactile
            className="mt-12 inline-flex items-center gap-3 self-start rounded-full border border-border/60 bg-card/30 px-8 py-4 text-sm font-semibold uppercase tracking-[0.2em] backdrop-blur-xl transition-[transform,border-color,background-color] duration-300 hover:-translate-y-0.5 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ color: `rgb(${rgb})` }}
          >
            {cta}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PathSelectionGrid;
