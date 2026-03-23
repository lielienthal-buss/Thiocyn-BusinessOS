import React from 'react';

const STATS = [
  { value: '6', label: 'Brands' },
  { value: '100k+', label: 'Customers' },
  { value: '5 min', label: 'To apply' },
];

const Header: React.FC = () => {
  return (
    <header className="relative overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 shadow-2xl shadow-gray-900/40">
      {/* Decorative glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary-600/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 px-10 py-14 md:px-16 md:py-20 flex flex-col items-center text-center gap-8">
        {/* Brand badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-400 text-[11px] font-black uppercase tracking-widest">
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
          Now hiring — Thiocyn
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none">
            Work with brands{' '}
            <span className="text-primary-400">people love.</span>
          </h1>
          <p className="text-lg md:text-xl font-bold text-gray-300">
            Real work. Real responsibility. Real growth.
          </p>
        </div>

        {/* Body copy */}
        <p className="text-gray-400 text-base md:text-lg font-medium max-w-2xl leading-relaxed">
          We're looking for driven people who want to build something meaningful — not just tick boxes. Join the team behind 6 high-growth D2C brands and get real ownership from day one.
        </p>

        {/* Stat badges */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {STATS.map(stat => (
            <div
              key={stat.label}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm"
            >
              <span className="text-xl font-black text-white">{stat.value}</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Scroll cue */}
        <div className="flex flex-col items-center gap-1.5 text-gray-500 text-xs font-semibold uppercase tracking-widest mt-2 animate-bounce">
          <span>Apply below — takes 5 minutes</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </header>
  );
};

export default Header;
