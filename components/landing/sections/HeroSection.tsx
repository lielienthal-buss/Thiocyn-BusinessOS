import React from 'react';
import SplitText from '@/components/landing/effects/SplitText';
import BlurText from '@/components/landing/effects/BlurText';
import { useTranslations } from '@/lib/landing/i18n';
import { useHighPerfDevice } from '@/lib/landing/useHighPerfDevice';

const Aurora = React.lazy(() => import('@/components/landing/effects/Aurora'));

const STATIC_AURORA_FALLBACK = `
  radial-gradient(ellipse 80% 60% at 20% 30%, rgba(15, 189, 189, 0.35), transparent 60%),
  radial-gradient(ellipse 70% 70% at 80% 70%, rgba(242, 112, 98, 0.25), transparent 60%),
  radial-gradient(ellipse 60% 50% at 50% 90%, rgba(245, 245, 244, 0.08), transparent 70%)
`;

export function HeroSection() {
  const t = useTranslations('hero');
  const isHighPerf = useHighPerfDevice();

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-background pt-16">
      <div className="absolute inset-0 z-0 opacity-70">
        {isHighPerf ? (
          <React.Suspense fallback={<div className="h-full w-full" style={{ background: STATIC_AURORA_FALLBACK }} />}>
            <Aurora
              colorStops={['#0FBDBD', '#F5F5F4', '#F27062']}
              amplitude={1.1}
              blend={0.55}
              speed={0.5}
            />
          </React.Suspense>
        ) : (
          <div className="h-full w-full" style={{ background: STATIC_AURORA_FALLBACK }} />
        )}
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-background/0 via-background/10 to-background/80 pointer-events-none" />

      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <div className="relative z-10 grid flex-1 grid-cols-12 grid-rows-[auto_1fr_auto] gap-y-8 px-6 py-12 md:px-12 md:py-16">
        <div className="col-span-12 md:col-span-6">
          <BlurText
            text={t('eyebrow')}
            className="justify-start font-mono text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground md:text-xs"
            animateBy="words"
            direction="top"
            delay={40}
          />
        </div>

        <div className="col-span-12 row-start-2 flex flex-col justify-center">
          <div className="hero-type">
            <SplitText
              text="HOUSE"
              tag="h1"
              className="hero-word block font-sans font-black leading-[0.85] tracking-[-0.04em]"
              textAlign="left"
              delay={28}
              duration={0.95}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 80, filter: 'blur(10px)' }}
              to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            />
            <div className="hero-of-row">
              <SplitText
                text="of"
                tag="span"
                className="hero-of inline-block font-serif italic text-coral"
                textAlign="left"
                delay={40}
                duration={1.0}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
                to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              />
            </div>
            <SplitText
              text="SUSTAINABLE"
              tag="h1"
              className="hero-word block font-sans font-black leading-[0.85] tracking-[-0.04em]"
              textAlign="left"
              delay={24}
              duration={0.95}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 80, filter: 'blur(10px)' }}
              to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            />
            <SplitText
              text="BRANDS"
              tag="h1"
              className="hero-word block font-sans font-black leading-[0.85] tracking-[-0.04em]"
              textAlign="left"
              delay={24}
              duration={0.95}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 80, filter: 'blur(10px)' }}
              to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            />
          </div>
        </div>

        <div className="col-span-12 row-start-3 flex justify-end md:col-span-5 md:col-start-8">
          <div className="max-w-sm text-right">
            <BlurText
              text={t('tagline1')}
              className="justify-end text-pretty text-base text-muted-foreground md:text-lg"
              animateBy="words"
              direction="bottom"
              delay={70}
            />
            <BlurText
              text={t('tagline2')}
              className="justify-end text-pretty text-base text-muted-foreground md:text-lg"
              animateBy="words"
              direction="bottom"
              delay={80}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-muted-foreground/40 p-1.5">
          <div className="h-2 w-1 animate-pulse rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
