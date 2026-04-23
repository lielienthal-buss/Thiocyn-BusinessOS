import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  const linkCls =
    'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className={`${linkCls} font-semibold tracking-tight text-foreground md:text-base`}>
          <span translate="no">House of Sustainable Brands</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex lg:gap-8">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={linkCls}>
              {l.label}
            </Link>
          ))}
          <div className="h-4 w-px bg-border/60" aria-hidden="true" />
          <button
            type="button"
            onClick={toggleLang}
            className="rounded-sm font-mono text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Switch language"
          >
            {locale === 'de' ? 'EN' : 'DE'}
          </button>
          <Link
            to="/admin"
            className="rounded-full border border-teal/40 px-4 py-1.5 text-sm font-medium text-teal transition-colors hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('login')}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-sm md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {mobileMenuOpen ? (
            <X aria-hidden="true" className="h-6 w-6" />
          ) : (
            <Menu aria-hidden="true" className="h-6 w-6" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-border/40 bg-background md:hidden"
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="flex flex-col gap-4 px-6 py-6">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={linkCls}
                onClick={() => setMobileMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-4">
              <button
                type="button"
                onClick={toggleLang}
                className="rounded-sm font-mono text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {locale === 'de' ? 'English' : 'Deutsch'}
              </button>
              <Link
                to="/admin"
                className="rounded-full border border-teal/40 px-4 py-1.5 text-sm font-medium text-teal transition-colors hover:bg-teal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
