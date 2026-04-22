import React from 'react';
import BlurText from '@/components/landing/effects/BlurText';
import SplitText from '@/components/landing/effects/SplitText';
import { useTranslations } from '@/lib/landing/i18n';

export function MissionNarrative() {
  const t = useTranslations('mission');

  return (
    <section className="relative overflow-hidden py-32 md:py-56">
      <div className="absolute left-1/4 top-1/4 h-[50rem] w-[50rem] rounded-full bg-teal/[0.06] blur-[180px]" aria-hidden />
      <div className="absolute bottom-1/3 right-1/4 h-[40rem] w-[40rem] rounded-full bg-coral/[0.05] blur-[180px]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-6 md:px-12">
        <div className="mb-24 flex justify-end">
          <BlurText
            text="MISSION"
            className="justify-end font-mono text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground"
            animateBy="words"
            direction="top"
            delay={60}
          />
        </div>

        <div className="grid grid-cols-12 gap-y-32 md:gap-y-40">
          <div className="col-span-12 md:col-span-8">
            <SplitText
              text={t('block1')}
              tag="p"
              className="mission-line font-sans font-semibold leading-[1.05] tracking-tight text-muted-foreground"
              textAlign="left"
              delay={18}
              duration={0.9}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              threshold={0.25}
            />
          </div>

          <div className="col-span-12 md:col-span-9 md:col-start-4">
            <SplitText
              text={t('block2')}
              tag="p"
              className="mission-line font-serif italic leading-[1.05] tracking-tight text-foreground"
              textAlign="left"
              delay={20}
              duration={0.95}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              threshold={0.25}
            />
          </div>

          <div className="col-span-12 md:col-span-10">
            <SplitText
              text={t('block3')}
              tag="p"
              className="mission-line font-sans font-bold leading-[1.0] tracking-tight text-foreground"
              textAlign="left"
              delay={18}
              duration={0.9}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              to={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              threshold={0.25}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default MissionNarrative;
