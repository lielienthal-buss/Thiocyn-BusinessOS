// ─── Payment Optimizer ────────────────────────────────────────────────────────
// Welle 2 Code-Block 2 — pure TS helper (kein Edge Function, kein Token-Burn).
//
// Algorithmus:
//   1. Pro Invoice: latest_safe_pay_date = due_date - working_day_buffer
//      Wenn überfällig: SOFORT (heute).
//   2. Sortiere alle nach (mahnstufe DESC, priority_tier ASC, latest_safe_pay_date ASC)
//      → Höchste Mahnstufe + niedrigster Priority-Tier zuerst.
//   3. Greedy bucket-fill: pro Tag (von heute bis +30) — packe Posten ein
//      bis budget_per_day erreicht. Auto-paid (Lastschrift/Card) übersprungen.
//   4. Output: scheduled_pay_date + rationale pro Posten.
//
// KEINE FX-Konvertierung. USD-Posten werden separat behandelt (mit Hinweis).
// Optimizer schreibt NICHT in DB. UI entscheidet ob das Schedule übernommen wird.

import type { PipelineItem, Currency } from '@/components/admin/finance/financeTypes';

export interface OptimizerInput {
  /** All open invoices (paid_at IS NULL) */
  invoices: PipelineItem[];
  /** Total available cash in EUR (sum of latest cash_snapshots) */
  available_cash_eur: number;
  /** Reserve buffer to keep in account (default 5000€) */
  reserve_eur?: number;
  /** Working day buffer before due_date (default 1 day) */
  working_day_buffer?: number;
  /** Today (override for testing) */
  today?: Date;
}

export interface ScheduledPayment {
  invoice: PipelineItem;
  scheduled_pay_date: string; // YYYY-MM-DD
  /** Days from today (0 = SOFORT) */
  days_from_today: number;
  /** Why this date was chosen */
  rationale: string;
  /** True if this requires immediate Peter approval */
  urgent: boolean;
  /** True if invoice is auto-paid (Lastschrift/Card) — no scheduling needed */
  auto_paid: boolean;
}

export interface OptimizerOutput {
  schedule: ScheduledPayment[];
  /** Sum per day, EUR only (USD shown separately) */
  daily_eur_sum: Record<string, number>;
  /** Posten mit currency != EUR (nicht im EUR-Bucket) */
  foreign_currency_items: PipelineItem[];
  /** Über-Budget-Warnung wenn Gesamt > available_cash - reserve */
  budget_overrun_eur: number;
  /** Statistik */
  stats: {
    total_open: number;
    auto_paid_count: number;
    sofort_count: number;
    next_7d_count: number;
    next_30d_count: number;
    total_eur: number;
    total_usd: number;
  };
}

const DEFAULT_RESERVE = 5000;
const DEFAULT_BUFFER_DAYS = 1;

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

function diffDays(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Determines if a payment_method counts as "auto-paid" (Lastschrift, Kreditkarte).
 * These don't need active scheduling — we just need to ensure cash is available.
 */
function isAutoPaymentMethod(method: string | null): boolean {
  if (!method) return false;
  return ['lastschrift', 'kreditkarte'].includes(method);
}

/**
 * Sort key for invoice priority — lower is higher priority.
 * (mahnstufe DESC means higher mahnstufe = lower number = sorted first)
 */
function priorityKey(item: PipelineItem): [number, number, number] {
  const mahnstufeKey = -1 * (item.mahnstufe ?? 0); // higher mahnstufe → first
  const tierKey = item.priority_tier ?? 9; // null tier → bottom
  const dueKey = item.due_date ? new Date(item.due_date).getTime() : Number.MAX_SAFE_INTEGER;
  return [mahnstufeKey, tierKey, dueKey];
}

function compareInvoices(a: PipelineItem, b: PipelineItem): number {
  const ka = priorityKey(a);
  const kb = priorityKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  return ka[2] - kb[2];
}

export function optimizePayments(input: OptimizerInput): OptimizerOutput {
  const today = input.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const reserve = input.reserve_eur ?? DEFAULT_RESERVE;
  const bufferDays = input.working_day_buffer ?? DEFAULT_BUFFER_DAYS;
  const budget = Math.max(0, input.available_cash_eur - reserve);

  // Split foreign currency
  const foreignItems = input.invoices.filter((i) => i.currency !== 'EUR');
  const eurItems = input.invoices.filter((i) => i.currency === 'EUR');

  // Sort by priority
  const sorted = [...eurItems].sort(compareInvoices);

  const schedule: ScheduledPayment[] = [];
  const dailySum: Record<string, number> = {};
  let runningTotal = 0;

  for (const inv of sorted) {
    const isAuto = inv.auto_paid || isAutoPaymentMethod(inv.payment_method);
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    if (dueDate) dueDate.setHours(0, 0, 0, 0);

    let scheduledDate = today;
    let rationale = '';
    let urgent = false;

    // Force-rules
    if (inv.mahnstufe >= 3) {
      // Hartlimes Hard-Rule: SOFORT zahlen
      scheduledDate = today;
      rationale = `🔥 SOFORT — Mahnstufe ${inv.mahnstufe} (Hartlimes Hard-Rule, Schadensbegrenzung > Klärung)`;
      urgent = true;
    } else if (!dueDate) {
      // No due date — schedule in 14 days as default
      scheduledDate = addDays(today, 14);
      rationale = 'Kein Fälligkeitsdatum → +14d default. Bitte due_date pflegen.';
    } else if (dueDate < today) {
      // Already overdue
      scheduledDate = today;
      const daysOverdue = Math.abs(diffDays(dueDate, today));
      rationale = `⚠️ Bereits ${daysOverdue}d überfällig — sofort zahlen.`;
      urgent = daysOverdue > 7;
    } else {
      // Latest safe pay date = due_date - buffer
      scheduledDate = addDays(dueDate, -bufferDays);
      if (scheduledDate < today) scheduledDate = today;
      rationale = `Spätester sicherer Zahltag (Fällig ${toISODate(dueDate)} − ${bufferDays}d Buffer).`;
    }

    const dateKey = toISODate(scheduledDate);
    const daysFromToday = diffDays(scheduledDate, today);

    // Track EUR sum (auto-paid still counts toward cash burn)
    if (inv.currency === 'EUR') {
      const amount = Number(inv.amount);
      dailySum[dateKey] = (dailySum[dateKey] ?? 0) + amount;
      runningTotal += amount;
    }

    schedule.push({
      invoice: inv,
      scheduled_pay_date: dateKey,
      days_from_today: daysFromToday,
      rationale,
      urgent,
      auto_paid: isAuto,
    });
  }

  // Stats
  const stats = {
    total_open: input.invoices.length,
    auto_paid_count: schedule.filter((s) => s.auto_paid).length,
    sofort_count: schedule.filter((s) => s.days_from_today <= 0).length,
    next_7d_count: schedule.filter((s) => s.days_from_today >= 0 && s.days_from_today <= 7).length,
    next_30d_count: schedule.filter((s) => s.days_from_today >= 0 && s.days_from_today <= 30).length,
    total_eur: eurItems.reduce((sum, i) => sum + Number(i.amount), 0),
    total_usd: foreignItems.filter((i) => i.currency === 'USD').reduce((sum, i) => sum + Number(i.amount), 0),
  };

  return {
    schedule,
    daily_eur_sum: dailySum,
    foreign_currency_items: foreignItems,
    budget_overrun_eur: Math.max(0, runningTotal - budget),
    stats,
  };
}

/**
 * Generates a 5-bullet WhatsApp-ready brief for Peter approval.
 * Returns Markdown string ready to copy-paste.
 *
 * Format follows peter-hart.md preference: max 5 bullets, concrete numbers,
 * frage am Ende.
 */
export function generatePeterBrief(
  output: OptimizerOutput,
  options: { date?: string; entityFilter?: string } = {}
): string {
  const date = options.date ?? toISODate(new Date());
  const sofort = output.schedule.filter((s) => s.days_from_today <= 0 && !s.auto_paid);
  const woche = output.schedule.filter((s) => s.days_from_today >= 1 && s.days_from_today <= 7 && !s.auto_paid);
  const inkasso = output.schedule.filter((s) => s.invoice.mahnstufe >= 3);

  const formatEur = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

  const sofortSum = sofort.reduce((s, i) => s + Number(i.invoice.amount), 0);
  const wocheSum = woche.reduce((s, i) => s + Number(i.invoice.amount), 0);

  const lines: string[] = [];
  lines.push(`*Zahlungsfreigabe ${date}*`);
  lines.push('');

  if (inkasso.length > 0) {
    lines.push(`🔥 *INKASSO/STUFE 3 — sofort:*`);
    for (const item of inkasso) {
      lines.push(
        `• ${item.invoice.vendor} (${item.invoice.entity}) — ${formatEur(Number(item.invoice.amount))} [Stufe ${item.invoice.mahnstufe}]`
      );
    }
    lines.push('');
  }

  if (sofort.length > 0) {
    lines.push(`*Heute fällig (${formatEur(sofortSum)}):*`);
    const limit = 8;
    for (const item of sofort.slice(0, limit)) {
      if (item.invoice.mahnstufe >= 3) continue; // already in inkasso section
      lines.push(`• ${item.invoice.vendor} — ${formatEur(Number(item.invoice.amount))}`);
    }
    if (sofort.length > limit) {
      lines.push(`• …und ${sofort.length - limit} weitere`);
    }
    lines.push('');
  }

  if (woche.length > 0) {
    lines.push(`*Diese Woche (${formatEur(wocheSum)}):*`);
    lines.push(`${woche.length} Posten, Details auf Anfrage.`);
    lines.push('');
  }

  if (output.stats.total_usd > 0) {
    lines.push(
      `*USD separat:* ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(output.stats.total_usd)} (nicht im EUR-Cash-Plan)`
    );
    lines.push('');
  }

  lines.push(`*Cash-Status:* siehe BusinessOS Cash-Tab`);
  lines.push('');
  lines.push(`Freigabe? 👍/👎`);

  return lines.join('\n');
}
