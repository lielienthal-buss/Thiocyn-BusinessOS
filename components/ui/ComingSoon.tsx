import React from 'react';

export function ComingSoonBadge({ label = 'Coming Soon' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      {label}
    </span>
  );
}

export function ComingSoonBanner({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-6 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Coming Soon
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">{description}</p>}
    </div>
  );
}

export function ComingSoonOverlay({ children, title = 'Coming Soon', description }: { children: React.ReactNode; title?: string; description?: string }) {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-[2px] rounded-2xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Coming Soon
          </div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description && <p className="text-xs text-slate-600 mt-1 max-w-xs">{description}</p>}
        </div>
      </div>
    </div>
  );
}
