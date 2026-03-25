import { useEffect, useState, useCallback } from 'react';
import type { RecruiterSettings } from '@/types';
import { getSettings, updateSettings } from './actions';

type UseSettingsReturn = {
  settings: RecruiterSettings | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (changes: Partial<RecruiterSettings>) => Promise<boolean>;
};

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<RecruiterSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await getSettings();
      setSettings(res);
    } catch (err: unknown) {
      console.error('useSettings load error', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const save = useCallback(
    async (changes: Partial<RecruiterSettings>) => {
      setError(null);
      try {
        const ok = await updateSettings(changes);
        if (ok) {
          // Refresh local copy after successful update
          await load();
          return true;
        } else {
          setError('Failed to save settings');
          return false;
        }
      } catch (err: unknown) {
        console.error('useSettings save error', err);
        setError('Failed to save settings');
        return false;
      }
    },
    [load]
  );

  return {
    settings,
    loading,
    refreshing,
    error,
    refresh,
    save,
  };
}
