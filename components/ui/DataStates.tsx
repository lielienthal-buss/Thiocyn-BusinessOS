import React from 'react';
import Spinner from './Spinner';

// ─── Loading State ───────────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Optional label (default: "Loading...") */
  label?: string;
  /** Compact: inline spinner. Full (default): centered block */
  compact?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'Loading...', compact }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
        <Spinner className="h-4 w-4 text-slate-400" />
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Spinner className="h-8 w-8 text-amber-400 mb-3" />
      <p className="text-sm text-slate-500 font-medium">{label}</p>
    </div>
  );
};

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📭',
  title = 'No data yet',
  description,
  action,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <span className="text-4xl mb-3">{icon}</span>
    <p className="text-sm font-semibold text-slate-300">{title}</p>
    {description && <p className="text-xs text-slate-500 mt-1 max-w-xs">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 px-4 py-2 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ─── Error State ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Something went wrong',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <span className="text-4xl mb-3">⚠️</span>
    <p className="text-sm font-semibold text-red-400">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 text-xs font-bold text-slate-300 bg-surface-700 border border-white/[0.08] rounded-lg hover:bg-surface-600 transition-colors"
      >
        Try again
      </button>
    )}
  </div>
);

// ─── Pagination Bar ──────────────────────────────────────────────────────────

interface PaginationBarProps {
  rangeLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  page: number;
  totalPages: number;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  rangeLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  page,
  totalPages,
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <span className="text-xs text-slate-500 font-medium">{rangeLabel}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/[0.06] bg-surface-800 text-slate-400 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        <span className="text-xs text-slate-500 px-2">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/[0.06] bg-surface-800 text-slate-400 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// ─── Refresh Button ──────────────────────────────────────────────────────────

interface RefreshButtonProps {
  onClick: () => void;
  refreshing?: boolean;
}

export const RefreshButton: React.FC<RefreshButtonProps> = ({ onClick, refreshing }) => (
  <button
    onClick={onClick}
    disabled={refreshing}
    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-400 bg-surface-800 border border-white/[0.06] rounded-lg hover:bg-surface-700 disabled:opacity-50 transition-colors"
  >
    <span className={refreshing ? 'animate-spin' : ''}>↻</span>
    {refreshing ? 'Refreshing...' : 'Refresh'}
  </button>
);
