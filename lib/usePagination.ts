import { useState, useMemo, useCallback } from 'react';

interface UsePaginationOptions {
  /** Items per page (default: 25) */
  pageSize?: number;
  /** Total item count (from server) */
  totalCount: number | null;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  goToPage: (p: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPage: () => void;
  /** Display label: "1-25 of 120" */
  rangeLabel: string;
}

export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { pageSize = 25, totalCount } = options;
  const [page, setPage] = useState(0);

  const totalPages = useMemo(() => {
    if (totalCount == null || totalCount === 0) return 1;
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(0, Math.min(p, totalPages - 1)));
  }, [totalPages]);

  const nextPage = useCallback(() => { if (canNext) setPage(p => p + 1); }, [canNext]);
  const prevPage = useCallback(() => { if (canPrev) setPage(p => p - 1); }, [canPrev]);
  const resetPage = useCallback(() => setPage(0), []);

  const rangeLabel = useMemo(() => {
    if (totalCount == null || totalCount === 0) return 'No items';
    const from = page * pageSize + 1;
    const to = Math.min((page + 1) * pageSize, totalCount);
    return `${from}\u2013${to} of ${totalCount}`;
  }, [page, pageSize, totalCount]);

  return { page, pageSize, totalPages, canPrev, canNext, goToPage, nextPage, prevPage, resetPage, rangeLabel };
}
