import React from 'react';
import { BRANDS } from '@/lib/landing/brands';
import { useTranslations } from '@/lib/landing/i18n';

export default function BrandsTrustBar() {
  const t = useTranslations('portfolio');
  return (
    <section className="border-t border-border/30 bg-background py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-6 md:px-12">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground md:text-xs">
          {t('subtitle')}
        </p>
        <ul className="mt-6 grid grid-cols-3 items-center gap-x-8 gap-y-6 md:grid-cols-6 md:gap-x-10">
          {BRANDS.map((brand) => (
            <li key={brand.slug} className="flex h-10 items-center justify-center md:justify-start">
              <img
                src={brand.logoLight}
                alt={brand.name}
                loading="lazy"
                className="max-h-8 w-auto max-w-full object-contain opacity-80 transition-opacity hover:opacity-100"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
