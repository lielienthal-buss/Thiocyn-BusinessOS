import React from 'react';
import CountUp from '@/components/landing/effects/CountUp';
import BlurText from '@/components/landing/effects/BlurText';
import { useLocale, useTranslations } from '@/lib/landing/i18n';

const ACCENTS = ['teal', 'coral', 'indigo', 'amber'] as const;
const VALUES = [
  { value: 6, suffix: '', kicker: '/01', separator: '' },
  { value: 158000, suffix: '+', kicker: '/02', separator: '.' },
  { value: 11, suffix: '', kicker: '/03', separator: '' },
  { value: 2021, suffix: '', kicker: '/04', separator: '' },
] as const;

const ACCENT_RGB: Record<string, string> = {
  teal:   '15, 189, 189',
  coral:  '242, 112, 98',
  indigo: '99, 102, 241',
  amber:  '245, 158, 11',
};

export function MetricsSection() {
  const locale = useLocale();
  const t = useTranslations('metrics');
  const metrics = VALUES.map((v, i) => ({
    ...v,
    separator: locale === 'de' ? v.separator : (v.separator ? ',' : ''),
    accent: ACCENTS[i],
    label: t(`label${i}`),
    localeTag: locale === 'de' ? 'de-DE' : 'en-US',
  }));

  return (
    <section className="relative overflow-hidden border-t border-border/40 py-32 md:py-48">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="mb-24 flex items-end justify-between">
          <BlurText
            text={t('label')}
            className="justify-start font-mono text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground"
            animateBy="words"
            direction="top"
            delay={50}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60 md:text-xs">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-12 gap-y-20 md:gap-y-32">
          <MetricBlock m={metrics[0]} offset="md:col-span-8" />
          <MetricBlock m={metrics[1]} offset="md:col-span-10 md:col-start-3" align="right" />
          <MetricBlock m={metrics[2]} offset="md:col-span-7 md:col-start-2" />
          <MetricBlock m={metrics[3]} offset="md:col-span-8 md:col-start-5" align="right" />
        </div>
      </div>
    </section>
  );
}

interface MetricBlockProps {
  m: {
    value: number;
    suffix: string;
    kicker: string;
    label: string;
    accent: string;
    separator?: string;
    localeTag?: string;
  };
  offset: string;
  align?: 'left' | 'right';
}

function MetricBlock({ m, offset, align = 'left' }: MetricBlockProps) {
  const rgb = ACCENT_RGB[m.accent] ?? ACCENT_RGB.teal;
  return (
    <div className={`col-span-12 ${offset} ${align === 'right' ? 'md:text-right' : ''}`}>
      <div className={`flex items-baseline gap-4 ${align === 'right' ? 'justify-end' : ''}`}>
        <span
          className="font-mono text-xs font-medium uppercase tracking-[0.3em]"
          style={{ color: `rgb(${rgb})` }}
        >
          {m.kicker}
        </span>
      </div>
      <div
        className="metric-number mt-4 block font-sans font-black tracking-[-0.04em] tabular-nums"
        style={{ color: `rgb(${rgb})` }}
      >
        <CountUp to={m.value} duration={2.2} separator={m.separator ?? ''} locale={m.localeTag} />
        <span>{m.suffix}</span>
      </div>
      <p
        className={`mt-6 max-w-md font-sans text-base leading-relaxed text-muted-foreground md:text-lg ${
          align === 'right' ? 'md:ml-auto' : ''
        }`}
      >
        {m.label}
      </p>
    </div>
  );
}

export default MetricsSection;
