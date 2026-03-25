import type { Currency } from './financeTypes';

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineColor(
  dateStr: string | null,
  resolved = false,
): string {
  if (resolved) return 'text-gray-400';
  const days = daysUntil(dateStr);
  if (days === null) return 'text-gray-400';
  if (days <= 7) return 'text-red-600 font-semibold';
  if (days <= 30) return 'text-amber-600 font-semibold';
  return 'text-green-600';
}

export function deadlineBg(dateStr: string | null, resolved = false): string {
  if (resolved) return 'bg-gray-50';
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days <= 7) return 'bg-red-50';
  if (days <= 30) return 'bg-amber-50';
  return 'bg-green-50';
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
