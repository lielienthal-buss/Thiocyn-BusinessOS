import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Aurora from '@/components/landing/effects/Aurora';
import SplitText from '@/components/landing/effects/SplitText';
import BlurText from '@/components/landing/effects/BlurText';
import { useTranslations } from '@/lib/landing/i18n';

type Accent = 'teal' | 'coral' | 'neutral';

interface StubPageProps {
  titleKey: 'foundersUniversity' | 'ambassadors' | 'founders';
  accent: Accent;
}

const ACCENT_COLOR_STOPS: Record<Accent, [string, string, string]> = {
  teal:    ['#0FBDBD', '#F5F5F4', '#0FBDBD'],
  coral:   ['#F27062', '#F5F5F4', '#F27062'],
  neutral: ['#0FBDBD', '#F5F5F4', '#F27062'],
};

export function StubPage({ titleKey, accent }: StubPageProps) {
  const tPaths = useTranslations('paths');
  const tStub = useTranslations('stub');

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0 opacity-60">
          <Aurora
            colorStops={ACCENT_COLOR_STOPS[accent]}
            amplitude={0.9}
            blend={0.5}
            speed={0.3}
          />
        </div>

        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(10,10,12,0.55) 100%)',
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <BlurText
            text={tStub('comingSoon').toUpperCase()}
            className="justify-center text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground"
            animateBy="words"
            direction="top"
            delay={50}
          />

          <SplitText
            text={tPaths(`${titleKey}.title`)}
            tag="h1"
            className="mt-10 text-balance text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl"
            textAlign="center"
            delay={25}
            duration={0.9}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
            to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          />

          <BlurText
            text={tPaths(`${titleKey}.hook`)}
            className="justify-center mx-auto mt-8 max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl"
            animateBy="words"
            direction="bottom"
            delay={80}
          />

          <BlurText
            text={tStub('description')}
            className="justify-center mx-auto mt-6 max-w-xl text-pretty text-sm text-muted-foreground/70 md:text-base"
            animateBy="words"
            direction="bottom"
            delay={60}
          />

          <div className="mt-16">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-6 py-3 text-sm font-medium backdrop-blur-xl transition-all hover:border-border hover:bg-card/60"
            >
              <ArrowLeft className="h-4 w-4" />
              {tStub('back')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default StubPage;
