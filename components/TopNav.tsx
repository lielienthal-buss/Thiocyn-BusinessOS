import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './icons/Logo';
import { useLang } from '../lib/i18n';
import { translations } from '../lib/translations';

const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { lang, setLang } = useLang();
  const t = translations[lang].public.nav;
  const [menuOpen, setMenuOpen] = useState(false);

  const LINKS = [
    { label: t.applyNow, path: '/' },
    { label: t.ambassadorProgram, path: '/creators' },
    { label: t.aboutUs, path: '/company' },
    { label: t.login, path: '/admin' },
  ];

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

      {/* Mobile — full-width bar */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Logo className="h-8 w-auto" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/creators')}
              className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary-600 text-white shadow-sm"
            >
              {t.ambassadorProgram}
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-full bg-white/10 border border-white/10"
              aria-label="Menu"
            >
              <span className={`block w-4 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-4 h-0.5 bg-white transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-4 h-0.5 bg-white transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/5 px-4 py-3 flex flex-col gap-1 bg-[#080808]/95 backdrop-blur-xl">
            {LINKS.map(({ label, path }) => {
              const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => { navigate(path); setMenuOpen(false); }}
                  className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    active ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            <button
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="text-left px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors"
            >
              {lang === 'de' ? 'Switch to EN' : 'Auf DE wechseln'}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default TopNav;
