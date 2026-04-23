import React from 'react';
import BlurText from '@/components/landing/effects/BlurText';
import SplitText from '@/components/landing/effects/SplitText';
import { useTranslations } from '@/lib/landing/i18n';

export function AIFeatureSection() {
  const t = useTranslations('ai');
  const c = {
    label: t('label'),
    kicker: t('kicker'),
    heading: t('heading'),
    paragraph: t('paragraph'),
    capability1Tag: t('capability1Tag'),
    capability1: t('capability1'),
    capability2Tag: t('capability2Tag'),
    capability2: t('capability2'),
    capability3Tag: t('capability3Tag'),
    capability3: t('capability3'),
  };

  return (
    <section className="relative overflow-hidden border-t border-border/40 py-32 md:py-48">
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-30 blur-[180px]"
        style={{ background: 'radial-gradient(circle, rgba(242, 112, 98, 0.18) 0%, transparent 60%)' }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-6 md:px-12">
        <BlurText
          text={c.label}
          className="justify-start font-mono text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground"
          animateBy="words"
          direction="top"
          delay={50}
        />

        <div className="mt-24 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <BlurText
              text={c.kicker}
              className="justify-start text-pretty font-serif italic text-xl leading-relaxed text-coral md:text-2xl"
              animateBy="words"
              direction="top"
              delay={60}
            />
          </div>
        </div>

        <div className="mt-10 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-10">
            <SplitText
              text={c.heading}
              tag="h2"
              className="pythia-heading font-sans font-semibold leading-[0.98] tracking-tight"
              textAlign="left"
              delay={16}
              duration={0.9}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 40 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.2}
            />
          </div>
        </div>

        <div className="mt-20 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5 md:col-start-8">
            <BlurText
              text={c.paragraph}
              className="justify-start text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl"
              animateBy="words"
              direction="bottom"
              delay={35}
              threshold={0.25}
            />
          </div>
        </div>

        <div className="mt-32 grid grid-cols-12 gap-x-8 gap-y-16 md:mt-40">
          <Capability tag={c.capability1Tag} text={c.capability1} index="/01" offset="md:col-span-10" />
          <Capability tag={c.capability2Tag} text={c.capability2} index="/02" offset="md:col-span-9 md:col-start-3" />
          <Capability tag={c.capability3Tag} text={c.capability3} index="/03" offset="md:col-span-10" />
        </div>
      </div>
    </section>
  );
}

interface CapabilityProps {
  tag: string;
  text: string;
  index: string;
  offset: string;
}

function Capability({ tag, text, index, offset }: CapabilityProps) {
  return (
    <div className={`col-span-12 ${offset}`}>
      <div className="flex items-baseline gap-6">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.3em] text-coral">
          {index}
        </span>
        <span className="font-mono text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          {tag}
        </span>
      </div>
      <BlurText
        text={text}
        className="justify-start mt-4 text-pretty text-2xl font-medium leading-[1.15] tracking-tight text-foreground md:text-4xl"
        animateBy="words"
        direction="bottom"
        delay={28}
        threshold={0.25}
      />
    </div>
  );
}

export default AIFeatureSection;
