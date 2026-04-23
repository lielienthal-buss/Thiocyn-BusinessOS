import { useState } from 'react';

export function useHighPerfDevice(): boolean {
  const [ok] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    return cores >= 8 && mem >= 8;
  });
  return ok;
}
