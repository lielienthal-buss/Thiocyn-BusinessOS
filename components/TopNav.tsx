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

  if (variant === 'dark') {
    return (
      <nav className="w-full">
        {/* Desktop — dark variant */}
        <div className="hidden md:flex justify-center">
          <div className="flex justify-between items-center w-full max-w-5xl mx-auto px-6">
            <Logo className="h-8 w-auto brightness-0 invert opacity-90" />
            <div className="flex items-center gap-1">
              {LINKS.map(({ label, path }) => {
                const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                      active ? 'text-white' : 'text-gray-600 hover:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
                className="ml-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 text-gray-600 hover:text-gray-300 transition-all duration-200"
              >
                {lang === 'de' ? 'DE | EN' : 'EN | DE'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile — dark variant */}
        <div className="md:hidden overflow-x-auto">
          <div className="flex justify-between items-center px-6">
            <Logo className="h-7 w-auto brightness-0 invert opacity-90" />
            <div className="flex items-center gap-0.5">
              {LINKS.map(({ label, path }) => {
                const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-200 ${
                      active ? 'text-white' : 'text-gray-600 hover:text-gray-300'
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
          <Logo className="h-9 w-auto ml-1" />
          <div className="flex gap-1">
            {LINKS.map(({ label, path }) => {
              const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
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
          <Logo className="h-7 w-auto ml-1 shrink-0" />
          <div className="flex gap-0.5">
            {LINKS.map(({ label, path }) => {
              const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
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
