import React, { useEffect, useRef, useState } from 'react';
import { useLang } from '@/lib/i18n';
import { translations } from '@/lib/translations';

function useCounter(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => requestAnimationFrame(step), 500);
    return () => clearTimeout(timeout);
  }, [target, duration]);
  return count;
}

const StatBadge: React.FC<{ value: number; suffix: string; label: string }> = ({ value, suffix, label }) => {
  const count = useCounter(value);
  return (
    <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/[0.06] border border-white/[0.1] rounded-2xl">
      <span className="text-lg font-black text-white tabular-nums">{count}{suffix}</span>
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
};

const STATS_CONFIG = [
  { value: 6, suffix: '' as const, key: 'statBrands' as const },
  { value: 100, suffix: 'k+' as const, key: 'statCustomers' as const },
  { value: 5, suffix: ' min' as const, key: 'statApply' as const },
];

const Header: React.FC = () => {
  const { lang } = useLang();
  const t = translations[lang].public.header;

  const stats = STATS_CONFIG.map(s => ({ value: s.value, suffix: s.suffix, label: t[s.key] }));

  return (
    <header className="relative overflow-hidden rounded-[2.5rem] bg-[#0d0d0d] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)]">
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-20 w-[480px] h-[480px] bg-primary-600/[0.14] rounded-full blur-[150px] animate-mesh-1" />
        <div className="absolute -bottom-20 -right-20 w-[380px] h-[380px] bg-indigo-600/[0.12] rounded-full blur-[130px] animate-mesh-2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary-500/[0.08] rounded-full blur-[90px] animate-mesh-3" />
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-violet-600/[0.07] rounded-full blur-[80px] animate-mesh-4" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        {/* Top glow line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-px bg-gradient-to-r from-transparent via-primary-400/60 to-transparent" />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 50%, #0d0d0d 100%)' }} />
      </div>

      <div className="relative z-10 px-6 py-12 md:px-20 md:py-24 flex flex-col items-center text-center gap-10">

        {/* Live badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-400 text-[10px] font-black uppercase tracking-[0.25em]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 inline-block" />
          {t.badge}
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-[-0.04em] leading-[0.88]">
            {t.headlinePart1}{' '}
            <span className="text-primary-400">
              {t.headlinePart2}
            </span>
          </h1>
          <p className="text-base md:text-lg font-semibold text-gray-500 tracking-tight">
            {t.subline}
          </p>
        </div>

        {/* Body */}
        <p className="text-gray-500 text-sm md:text-base max-w-xl leading-relaxed">
          {t.body}
        </p>

        {/* Stats */}
        <div className="animate-slide-up-3 flex flex-wrap items-center justify-center gap-4 md:gap-3">
          {stats.map(s => <StatBadge key={s.label} value={s.value} suffix={s.suffix} label={s.label} />)}
        </div>

        {/* Scroll cue */}
        <div className="animate-slide-up-4 flex flex-col items-center gap-2">
          <span className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">{t.scrollCue}</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-600/60 to-transparent animate-float" />
        </div>
      </div>
    </header>
  );
};

export default Header;
