import React from 'react';
import { ArrowUpRight, Instagram } from 'lucide-react';
import BlurText from '@/components/landing/effects/BlurText';
import SplitText from '@/components/landing/effects/SplitText';
import { BRANDS, type Brand } from '@/lib/landing/brands';
import { useLocale, useTranslations } from '@/lib/landing/i18n';

const ACCENT_RGB: Record<Brand['accent'], string> = {
  teal:    '15, 189, 189',
  coral:   '242, 112, 98',
  indigo:  '99, 102, 241',
  amber:   '245, 158, 11',
  emerald: '16, 185, 129',
  violet:  '139, 92, 246',
};

export function PortfolioShowcase() {
  const locale = useLocale();
  const t = useTranslations('portfolio');

  return (
    <section
      id="portfolio"
      className="relative overflow-hidden border-t border-border/40 py-32 md:py-48"
    >
      <div className="mx-auto mb-24 max-w-7xl px-6 md:px-12">
        <div className="flex items-end justify-between">
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
      </div>

      <div className="mx-auto max-w-7xl">
        {BRANDS.map((brand, i) => (
          <BrandRow key={brand.slug} brand={brand} index={i} locale={locale} visitLabel={t('visit')} />
        ))}
      </div>
    </section>
  );
}

interface BrandRowProps {
  brand: Brand;
  index: number;
  locale: string;
  visitLabel: string;
}

function BrandRow({ brand, index, locale, visitLabel }: BrandRowProps) {
  const rgb = ACCENT_RGB[brand.accent];
  const isRight = index % 2 === 1;
  const tagline = locale === 'de' ? brand.taglineDe : brand.taglineEn;
  const story = locale === 'de' ? brand.storyDe : brand.storyEn;
  const metricLabel = locale === 'de' ? brand.metricLabelDe : brand.metricLabelEn;

  return (
    <div className="group relative border-t border-border/20 last:border-b">
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle 800px at ${isRight ? '80%' : '20%'} 50%, rgba(${rgb}, 0.08) 0%, transparent 60%)`,
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid grid-cols-12 gap-8 px-6 py-20 md:px-12 md:py-32">
        <div className={`col-span-12 md:col-span-1 ${isRight ? 'md:order-2 md:col-start-12' : ''}`}>
          <span
            className="font-mono text-xs font-medium uppercase tracking-[0.3em]"
            style={{ color: `rgb(${rgb})` }}
          >
            /{String(index + 1).padStart(2, '0')}
          </span>
        </div>

        <div className={`col-span-12 md:col-span-7 ${isRight ? 'md:col-start-5' : 'md:col-start-2'}`} translate="no">
          <SplitText
            text={brand.name}
            tag="h3"
            className="brand-name block font-sans font-black leading-[0.85] tracking-[-0.04em]"
            textAlign="left"
            delay={22}
            duration={0.9}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 60 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.2}
          />
          <p
            className="brand-tagline mt-6 font-serif italic"
            style={{ color: `rgb(${rgb})` }}
          >
            {tagline}
          </p>
        </div>

        <div
          className={`col-span-12 md:col-span-4 flex flex-col gap-8 ${
            isRight ? 'md:col-start-1 md:row-start-1 md:justify-end md:text-left' : 'md:col-start-9 md:text-right'
          }`}
        >
          <BlurText
            text={story}
            className={`${
              isRight ? 'justify-start' : 'md:justify-end'
            } text-pretty text-base leading-relaxed text-muted-foreground md:text-lg`}
            animateBy="words"
            direction="bottom"
            delay={40}
            threshold={0.2}
          />

          <div className={`flex flex-col gap-1 ${isRight ? '' : 'md:items-end'}`}>
            <span
              className="font-sans text-2xl font-bold tabular-nums md:text-3xl"
              style={{ color: `rgb(${rgb})` }}
            >
              {brand.metric}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 md:text-xs">
              {metricLabel}
            </span>
          </div>

          {(brand.href || brand.instagram) && (
            <div
              className={`flex flex-wrap items-center gap-x-6 gap-y-3 ${
                isRight ? '' : 'md:justify-end'
              }`}
            >
              {brand.href && (
                <a
                  href={brand.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link inline-flex items-center gap-2 rounded-sm text-sm font-semibold uppercase tracking-[0.2em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={{ color: `rgb(${rgb})` }}
                >
                  {visitLabel}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                  />
                </a>
              )}
              {brand.instagram && (
                <a
                  href={brand.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/ig inline-flex items-center gap-2 rounded-sm text-xs font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Instagram ${brand.instagramHandle ?? brand.name}`}
                >
                  <Instagram aria-hidden="true" className="h-4 w-4 transition-colors group-hover/ig:text-foreground" />
                  <span>{brand.instagramHandle}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortfolioShowcase;
