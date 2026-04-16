import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseSupabaseQueryOptions<T> {
  /** Supabase table name */
  table: string;
  /** Columns to select (default: '*') */
  select?: string;
  /** Apply filters to the query builder */
  filter?: (query: PostgrestFilterBuilder<any, any, any, any>) => PostgrestFilterBuilder<any, any, any, any>;
  /** Order by column */
  orderBy?: { column: string; ascending?: boolean };
  /** Pagination: page size (0 = no pagination) */
  pageSize?: number;
  /** Pagination: current page (0-indexed) */
  page?: number;
  /** Skip initial fetch (useful for conditional queries) */
  enabled?: boolean;
  /** Dependencies that trigger a refetch when changed */
  deps?: any[];
}

interface UseSupabaseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  /** Total count (when paginated) */
  count: number | null;
  /** Refetch data */
  refetch: () => Promise<void>;
  /** Is currently refetching (not initial load) */
  refreshing: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSupabaseQuery<T = any>(
  options: UseSupabaseQueryOptions<T>
): UseSupabaseQueryResult<T> {
  const {
    table,
    select = '*',
    filter,
    orderBy,
    pageSize = 0,
    page = 0,
    enabled = true,
    deps = [],
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const fetch = useCallback(async (isRefresh = false) => {
    if (!enabled) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from(table)
        .select(select, pageSize > 0 ? { count: 'exact' } : undefined);

      if (filter) query = filter(query);
      if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });

      if (pageSize > 0) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      const { data: rows, error: err, count: totalCount } = await query;

      if (!mountedRef.current) return;

      if (err) {
        setError(err.message);
        setData([]);
      } else {
        setData((rows as T[]) ?? []);
        if (totalCount != null) setCount(totalCount);
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e?.message ?? 'Unknown error');
        setData([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, pageSize, page, enabled, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetch();
    return () => { mountedRef.current = false; };
  }, [fetch]);

  const refetch = useCallback(() => fetch(true), [fetch]);

  return { data, loading, error, count, refetch, refreshing };
}

// ─── Mutation helpers ────────────────────────────────────────────────────────

interface MutationResult<T = any> {
  data: T | null;
  error: string | null;
}

export async function supabaseInsert<T = any>(
  table: string,
  values: Partial<T> | Partial<T>[],
): Promise<MutationResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .insert(values as any)
    .select()
    .single();
  return { data: data as T | null, error: error?.message ?? null };
}

export async function supabaseUpdate<T = any>(
  table: string,
  id: string,
  values: Partial<T>,
  idColumn = 'id',
): Promise<MutationResult<T>> {
  const { data, error } = await supabase
    .from(table)
    .update(values as any)
    .eq(idColumn, id)
    .select()
    .single();
  return { data: data as T | null, error: error?.message ?? null };
}

export async function supabaseDelete(
  table: string,
  id: string,
  idColumn = 'id',
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq(idColumn, id);
  return { error: error?.message ?? null };
}
