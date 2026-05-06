import React from 'react';
import BlurText from '@/components/landing/effects/BlurText';
import { useLocale, useTranslations } from '@/lib/landing/i18n';

const VALUES = [
  { value: 6, suffix: '', kicker: '/01', separator: '' },
  { value: 150000, suffix: '+', kicker: '/02', separator: '.' },
  { value: 10, suffix: '+', kicker: '/03', separator: '' },
  { value: 2022, suffix: '', kicker: '/04', separator: '' },
] as const;

function formatNumber(n: number, separator: string, localeTag: string): string {
  if (!separator) return String(n);
  return new Intl.NumberFormat(localeTag).format(n);
}

export function MetricsSection() {
  const locale = useLocale();
  const t = useTranslations('metrics');
  const localeTag = locale === 'de' ? 'de-DE' : 'en-US';
  const metrics = VALUES.map((v, i) => ({
    ...v,
    separator: locale === 'de' ? v.separator : (v.separator ? ',' : ''),
    label: t(`label${i}`),
    formatted: formatNumber(v.value, locale === 'de' ? v.separator : (v.separator ? ',' : ''), localeTag),
  }));

  return (
    <section className="relative overflow-hidden border-t border-border/40 py-32 md:py-48">
      <div className="mx-auto max-w-7xl px-6 md:px-12">
        <div className="mb-20 flex items-end justify-between">
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

        <div className="grid grid-cols-1 gap-y-16 sm:grid-cols-2 sm:gap-y-20 md:grid-cols-4 md:gap-x-8">
          {metrics.map((m) => (
            <div key={m.kicker} className="flex flex-col">
              <span className="font-mono text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground/70">
                {m.kicker}
              </span>
              <div className="metric-number mt-4 block font-sans font-black tracking-[-0.04em] tabular-nums text-foreground">
                {m.formatted}
                {m.suffix && <span>{m.suffix}</span>}
              </div>
              <p className="mt-4 max-w-xs text-pretty font-sans text-sm leading-relaxed text-muted-foreground md:text-base">
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MetricsSection;
