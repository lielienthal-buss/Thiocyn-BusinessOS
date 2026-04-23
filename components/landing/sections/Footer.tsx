import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslations } from '@/lib/landing/i18n';

export function Footer() {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              to="/"
              className="rounded-sm text-xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              HSB
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{t('tagline')}</p>
            <p className="mt-6 text-xs text-muted-foreground/70">{t('operated')}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium">{t('explore')}</h4>
            <ul className="mt-4 flex flex-col gap-2">
              <FooterLink to="/founders-university">{tNav('foundersUniversity')}</FooterLink>
              <FooterLink to="/brand-ambassador">{tNav('ambassadors')}</FooterLink>
              <FooterLink to="/founders">{tNav('founders')}</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium">{t('company')}</h4>
            <ul className="mt-4 flex flex-col gap-2">
              <FooterLink to="/about">{tNav('about')}</FooterLink>
              <FooterLink to="/#portfolio">{tNav('portfolio')}</FooterLink>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium">{t('contact')}</h4>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <a
                  href="mailto:info@hartlimesgmbh.de"
                  className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  info@hartlimesgmbh.de
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-border/40 pt-8">
          <p className="text-center text-xs text-muted-foreground/70">
            © {year} Hart Limes GmbH · {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {children}
      </Link>
    </li>
  );
}

export default Footer;
