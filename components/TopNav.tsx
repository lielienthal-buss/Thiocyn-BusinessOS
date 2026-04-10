import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './icons/Logo';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';

const TopNav: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { lang, setLang } = useLang();
  const t = translations[lang].public.nav;

  const LINKS = [
    { label: t.applyNow, path: '/' },
    { label: t.ambassadorProgram, path: '/creators' },
    { label: t.aboutUs, path: '/company' },
    { label: t.login, path: '/admin' },
  ];

  const handleNav = (path: string) => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => navigate(path));
    } else {
      navigate(path);
    }
  };

  if (variant === 'dark') {
    return (
      <nav className="w-full">
        {/* Desktop — dark variant with liquid glass pill */}
        <div className="hidden md:flex justify-center">
          <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
            <Logo className="h-8 w-auto brightness-0 invert opacity-90" />
            {/* Liquid glass nav pill */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_8px_32px_rgba(0,0,0,0.3)]">
              {LINKS.map(({ label, path }) => {
                const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => handleNav(path)}
                    className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                      active
                        ? 'bg-white/[0.1] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                        : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
                className="ml-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/[0.08] text-gray-600 hover:text-gray-300 transition-all duration-200"
              >
                {lang === 'de' ? 'DE' : 'EN'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile — dark variant */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex justify-between items-center">
            <Logo className="h-7 w-auto brightness-0 invert opacity-90" />
            <div className="flex items-center gap-0.5 px-2 py-1 rounded-full bg-white/[0.05] backdrop-blur-2xl border border-white/[0.08]">
              {LINKS.map(({ label, path }) => {
                const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => handleNav(path)}
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
                      active ? 'bg-white/[0.1] text-white' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="w-full">
      {/* Desktop — pill nav */}
      <div className="hidden md:flex justify-center">
        <div className="px-2 py-1.5 rounded-full flex items-center gap-2 bg-white border border-gray-200 shadow-sm">
          {/* Welle 1 Item 4: Logo SVG is white-on-transparent (Thiocyn CDN), invisible on white BG.
              Filter `brightness-0` makes it solid black, opacity adds polish. */}
          <Logo className="h-9 w-auto ml-1 brightness-0 opacity-90" />
          <div className="flex gap-1">
            {LINKS.map(({ label, path }) => {
              const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    active
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="ml-1 mr-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all duration-200"
          >
            {lang === 'de' ? 'DE | EN' : 'EN | DE'}
          </button>
        </div>
      </div>

      {/* Mobile — scrollable pill */}
      <div className="md:hidden overflow-x-auto">
        <div className="px-2 py-1.5 rounded-full flex items-center gap-1 bg-white border border-gray-200 shadow-sm w-max mx-auto">
          {/* Welle 1 Item 4: same fix as desktop variant — make white SVG visible on white BG */}
          <Logo className="h-7 w-auto ml-1 shrink-0 brightness-0 opacity-90" />
          <div className="flex gap-0.5">
            {LINKS.map(({ label, path }) => {
              const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => handleNav(path)}
                  className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                    active
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="mr-1 px-2 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-200 text-gray-500 shrink-0"
          >
            {lang === 'de' ? 'DE' : 'EN'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
