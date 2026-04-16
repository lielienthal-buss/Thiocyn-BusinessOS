import React from 'react';

// ─── StatusBadge ──────────────────────────────────────────────────────────────

export function StatusBadge({
  status,
  styles,
}: {
  status: string;
  styles: Record<string, string>;
}) {
  const cls = styles[status] ?? 'bg-slate-500/15 text-slate-400';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {status}
    </span>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <svg
        className="w-10 h-10 mb-3 opacity-40"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

export function SummaryBar({ items }: { items: { label: string; value: string; color?: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-xl px-4 py-2.5 shadow-sm"
        >
          <span className="text-xs text-slate-500 font-medium">{item.label}</span>
          <span className={`text-sm font-bold ${item.color ?? 'text-slate-900'}`}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
