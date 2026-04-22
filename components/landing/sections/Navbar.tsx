import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslations, useLocale } from '@/lib/landing/i18n';
import { useLang } from '@/lib/i18n';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('nav');
  const locale = useLocale();
  const { setLang } = useLang();

  const links: Array<{ to: string; label: string }> = [
    { to: '/founders-university', label: t('foundersUniversity') },
    { to: '/brand-ambassador',    label: t('ambassadors') },
    { to: '/founders',            label: t('founders') },
    { to: '/#portfolio',          label: t('portfolio') },
    { to: '/about',               label: t('about') },
  ];

  const toggleLang = () => setLang(locale === 'de' ? 'en' : 'de');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="text-sm font-semibold tracking-tight md:text-base">
          House of Sustainable Brands
        </Link>

        <div className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <div className="h-4 w-px bg-border/60" aria-hidden />
          <button
            onClick={toggleLang}
            className="text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Switch language"
          >
            {locale === 'de' ? 'EN' : 'DE'}
          </button>
          <Link
            to="/admin"
            className="rounded-full border border-teal/40 px-4 py-1.5 text-sm font-medium text-teal transition-all hover:bg-teal/10"
          >
            {t('login')}
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border/40 bg-background md:hidden">
          <div className="flex flex-col gap-4 px-6 py-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-4">
              <button
                onClick={toggleLang}
                className="text-sm font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                {locale === 'de' ? 'English' : 'Deutsch'}
              </button>
              <Link
                to="/admin"
                className="rounded-full border border-teal/40 px-4 py-1.5 text-sm font-medium text-teal transition-all hover:bg-teal/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('login')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
