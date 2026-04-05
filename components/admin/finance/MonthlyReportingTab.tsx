import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ─── Config ───────────────────────────────────────────────────────────────────

type InventorySource = 'jtl' | 'fullmex' | 'shopify';
type B2bPlatform = 'billbee' | 'ankorstore' | 'lightspeed';
type ReportStatus = 'collecting' | 'review' | 'sent';

interface InventoryBrand {
  brand: string;
  source: InventorySource;
  label: string;
  hint: string;
}

interface B2bEntry {
  brand: string;
  platform: B2bPlatform;
  label: string;
  hint: string;
}

const INVENTORY_BRANDS: InventoryBrand[] = [
  { brand: 'take-a-shot', source: 'jtl',     label: 'Take A Shot',   hint: 'JTL Auto-Mail 01.' },
  { brand: 'timber-john', source: 'jtl',     label: 'Timber & John', hint: 'JTL Auto-Mail 01.' },
  { brand: 'dr-severin',  source: 'jtl',     label: 'Dr. Severin',   hint: 'JTL Auto-Mail 01.' },
  { brand: 'paigh',       source: 'jtl',     label: 'Paigh',         hint: 'JTL Auto-Mail 01.' },
  { brand: 'thiocyn',     source: 'fullmex', label: 'Thiocyn',       hint: 'FULLMEX → Restbestand (1PW)' },
  { brand: 'wristr',      source: 'shopify', label: 'Wristr',        hint: 'Shopify: Inventarwert am Monatsende' },
];

const B2B_ENTRIES: B2bEntry[] = [
  { brand: 'thiocyn',    platform: 'billbee',     label: 'Thiocyn B2B',             hint: 'Billbee Export' },
  { brand: 'dr-severin', platform: 'billbee',     label: 'Dr. Severin B2B',         hint: 'Billbee Export' },
  { brand: 'take-a-shot',platform: 'billbee',     label: 'TAS B2B',                 hint: 'Billbee Export' },
  { brand: 'take-a-shot',platform: 'lightspeed',  label: 'TAS B2B Lightspeed',      hint: 'Lightspeed Export' },
  { brand: 'dr-severin', platform: 'ankorstore',  label: 'Dr. Severin (Ankorstore)', hint: 'Ankorstore Monatsübersicht' },
];

const SOURCE_BADGES: Record<InventorySource, string> = {
  jtl:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  fullmex: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  shopify: 'bg-green-500/15 text-green-400 border-green-500/20',
};

const PLATFORM_BADGES: Record<B2bPlatform, string> = {
  billbee:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  ankorstore: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  lightspeed: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  collecting: { label: 'Collecting',       color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  review:     { label: 'In Review',        color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  sent:       { label: 'Sent to Amanda',   color: 'bg-green-500/15 text-green-400 border-green-500/20' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prevMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function monthLabel(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

function fmtEUR(val: number | null | undefined): string {
  if (val == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(val);
}

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 6; i++) {
    d.setMonth(d.getMonth() - 1);
    const iso = d.toISOString().slice(0, 10);
    opts.push({ value: iso, label: monthLabel(iso) });
  }
  return opts;
}

// ─── DB types ─────────────────────────────────────────────────────────────────

interface MonthlyReport {
  id: string;
  month: string;
  status: ReportStatus;
  sent_to: string | null;
  sent_at: string | null;
  paypal_statement_received: boolean;
  notes: string | null;
}

interface InventoryRow {
  id: string;
  month: string;
  brand: string;
  inventory_value: number | null;
  source: InventorySource;
  notes: string | null;
}

interface B2bRow {
  id: string;
  month: string;
  brand: string;
  platform: B2bPlatform;
  total_revenue: number | null;
  invoice_count: number;
  notes: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

function MonthlyReportingTab() {
  const [selectedMonth, setSelectedMonth] = useState(prevMonthISO());
  const [report, setReport]       = useState<MonthlyReport | null>(null);
  const [inventory, setInventory] = useState<Record<string, InventoryRow>>({});
  const [b2b, setB2b]             = useState<Record<string, B2bRow>>({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState<string | null>(null);
  const [mailCopied, setMailCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, invRes, b2bRes] = await Promise.all([
      supabase.from('monthly_reports').select('*').eq('month', selectedMonth).maybeSingle(),
      supabase.from('monthly_inventory').select('*').eq('month', selectedMonth),
      supabase.from('monthly_b2b_invoices').select('*').eq('month', selectedMonth),
    ]);

    setReport(rRes.data ?? null);

    const invMap: Record<string, InventoryRow> = {};
    for (const row of (invRes.data ?? [])) invMap[row.brand] = row as InventoryRow;
    setInventory(invMap);

    const b2bMap: Record<string, B2bRow> = {};
    for (const row of (b2bRes.data ?? [])) b2bMap[`${row.brand}__${row.platform}`] = row as B2bRow;
    setB2b(b2bMap);

    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { load(); }, [load]);

  async function ensureReport(): Promise<MonthlyReport | null> {
    if (report) return report;
    const { data } = await supabase
      .from('monthly_reports')
      .insert({ month: selectedMonth, status: 'collecting' })
      .select()
      .single();
    if (data) setReport(data as MonthlyReport);
    return data as MonthlyReport | null;
  }

  async function saveInventory(brand: string, source: InventorySource, value: string) {
    const num = parseFloat(value.replace(',', '.'));
    if (value !== '' && isNaN(num)) return;
    setSaving(`inv_${brand}`);
    await ensureReport();
    const existing = inventory[brand];
    const payload = { inventory_value: value === '' ? null : num };
    if (existing) {
      await supabase.from('monthly_inventory').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('monthly_inventory').insert({ month: selectedMonth, brand, source, ...payload });
    }
    await load();
    setSaving(null);
  }

  async function saveB2b(
    brand: string,
    platform: B2bPlatform,
    field: 'total_revenue' | 'invoice_count',
    value: string,
  ) {
    const num = parseFloat(value.replace(',', '.'));
    if (value !== '' && isNaN(num)) return;
    const key = `${brand}__${platform}`;
    setSaving(`b2b_${key}`);
    await ensureReport();
    const existing = b2b[key];
    const patch = { [field]: value === '' ? null : num };
    if (existing) {
      await supabase.from('monthly_b2b_invoices').update(patch).eq('id', existing.id);
    } else {
      await supabase.from('monthly_b2b_invoices').insert({ month: selectedMonth, brand, platform, ...patch });
    }
    await load();
    setSaving(null);
  }

  async function togglePayPal() {
    const r = await ensureReport();
    if (!r) return;
    const next = !report?.paypal_statement_received;
    await supabase.from('monthly_reports').update({ paypal_statement_received: next }).eq('id', r.id);
    setReport(prev => prev ? { ...prev, paypal_statement_received: next } : prev);
  }

  async function setStatus(status: ReportStatus) {
    const r = await ensureReport();
    if (!r) return;
    const patch: Partial<MonthlyReport> = { status };
    if (status === 'sent') {
      patch.sent_to = 'amanda@count.tax';
      patch.sent_at = new Date().toISOString();
    }
    await supabase.from('monthly_reports').update(patch).eq('id', r.id);
    setReport(prev => prev ? { ...prev, ...patch } : prev);
  }

  // ─── Completeness ─────────────────────────────────────────────────────────

  const invFilled = INVENTORY_BRANDS.filter(b => inventory[b.brand]?.inventory_value != null).length;
  const b2bFilled = B2B_ENTRIES.filter(e => b2b[`${e.brand}__${e.platform}`]?.total_revenue != null).length;
  const paypalDone = report?.paypal_statement_received ?? false;
  const totalItems = INVENTORY_BRANDS.length + B2B_ENTRIES.length + 1;
  const doneItems  = invFilled + b2bFilled + (paypalDone ? 1 : 0);
  const progress   = Math.round((doneItems / totalItems) * 100);
  const isComplete = doneItems === totalItems;

  // ─── Amanda mail ──────────────────────────────────────────────────────────

  function generateMail(): string {
    const label = monthLabel(selectedMonth);
    const invLines = INVENTORY_BRANDS.map(b => {
      const val = inventory[b.brand]?.inventory_value;
      return `  ${b.label}: ${val != null ? fmtEUR(val) : '—'}`;
    }).join('\n');
    const b2bLines = B2B_ENTRIES.map(e => {
      const row = b2b[`${e.brand}__${e.platform}`];
      return `  ${e.label}: ${row?.total_revenue != null ? fmtEUR(row.total_revenue) : '—'} (${row?.invoice_count ?? 0} Rechnungen)`;
    }).join('\n');
    return [
      `Betreff: Monatsabschluss ${label} — Hartlimes GmbH`,
      '',
      `Hallo Amanda,`,
      '',
      `anbei alle Unterlagen für ${label}.`,
      '',
      `Warenwert (Inventar per Monatsende):`,
      invLines,
      '',
      `B2B-Rechnungen ${label}:`,
      b2bLines,
      '',
      `PayPal-Kontoauszug ${label}: anbei als Anlage.`,
      '',
      `Bitte melde dich bei Rückfragen.`,
      '',
      `Viele Grüße`,
      `Jan-Luis`,
    ].join('\n');
  }

  function copyMail() {
    navigator.clipboard.writeText(generateMail());
    setMailCopied(true);
    setTimeout(() => setMailCopied(false), 2500);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="text-sm font-semibold bg-white/[0.07] border border-white/[0.1] rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500/50"
        >
          {monthOptions().map(o => (
            <option key={o.value} value={o.value} className="bg-slate-900">{o.label}</option>
          ))}
        </select>

        {report?.status && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_CONFIG[report.status].color}`}>
            {STATUS_CONFIG[report.status].label}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">{doneItems}/{totalItems}</span>
          <div className="w-24 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-green-400' : 'bg-amber-400'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-400">{progress}%</span>
        </div>
      </div>

      {/* ─── Warenwert ───────────────────────────────────────────────────── */}
      <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center">
          <span className="text-sm font-bold text-slate-100">Warenwert (Inventarwert)</span>
          <span className="ml-auto text-xs text-slate-500">{invFilled}/{INVENTORY_BRANDS.length} Brands</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {INVENTORY_BRANDS.map(({ brand, source, label, hint }) => {
            const row = inventory[brand];
            const isSaving = saving === `inv_${brand}`;
            const hasValue = row?.inventory_value != null;
            return (
              <div key={brand} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wide ${SOURCE_BADGES[source]}`}>
                  {source}
                </span>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue={row?.inventory_value ?? ''}
                    key={`${selectedMonth}_inv_${brand}`}
                    onBlur={e => saveInventory(brand, source, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder="0,00"
                    className="w-28 text-right text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                  {isSaving && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400">•••</span>
                  )}
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasValue ? 'bg-green-400' : 'bg-slate-600'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── B2B Rechnungen ──────────────────────────────────────────────── */}
      <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center">
          <span className="text-sm font-bold text-slate-100">B2B-Rechnungen</span>
          <span className="ml-auto text-xs text-slate-500">{b2bFilled}/{B2B_ENTRIES.length} Einträge</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {B2B_ENTRIES.map(({ brand, platform, label, hint }) => {
            const key = `${brand}__${platform}`;
            const row = b2b[key];
            const isSaving = saving === `b2b_${key}`;
            const hasValue = row?.total_revenue != null;
            return (
              <div key={key} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{hint}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wide ${PLATFORM_BADGES[platform]}`}>
                  {platform}
                </span>
                <input
                  type="text"
                  defaultValue={row?.invoice_count || ''}
                  key={`${selectedMonth}_b2b_${key}_count`}
                  onBlur={e => saveB2b(brand, platform, 'invoice_count', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  placeholder="#"
                  title="Anzahl Rechnungen"
                  className="w-14 text-center text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg px-2 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                />
                <div className="relative">
                  <input
                    type="text"
                    defaultValue={row?.total_revenue ?? ''}
                    key={`${selectedMonth}_b2b_${key}_rev`}
                    onBlur={e => saveB2b(brand, platform, 'total_revenue', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder="0,00"
                    title="Umsatz (€)"
                    className="w-28 text-right text-sm bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
                  />
                  {isSaving && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-amber-400">•••</span>
                  )}
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasValue ? 'bg-green-400' : 'bg-slate-600'}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Abschluss ───────────────────────────────────────────────────── */}
      <div className="bg-surface-800/60 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.06]">
          <span className="text-sm font-bold text-slate-100">Abschluss & Versand</span>
        </div>
        <div className="p-5 space-y-3">

          {/* PayPal toggle */}
          <button
            onClick={togglePayPal}
            className={`flex items-center gap-3 w-full text-left p-3 rounded-xl border transition-all ${
              paypalDone
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
            }`}
          >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
              paypalDone ? 'bg-green-500 border-green-500' : 'border-slate-600'
            }`}>
              {paypalDone && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">PayPal-Kontoauszug bereit</p>
              <p className="text-xs text-slate-500">Anfangs- + Endbestand als PDF — 1 Datei</p>
            </div>
          </button>

          {report?.status !== 'sent' && (
            <div className="flex gap-2">
              {report?.status !== 'review' && (
                <button
                  onClick={() => setStatus('review')}
                  className="flex-1 text-sm font-semibold px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-colors"
                >
                  Zur Prüfung
                </button>
              )}
              <button
                onClick={copyMail}
                className={`flex-1 text-sm font-semibold px-4 py-2 rounded-xl border transition-all ${
                  mailCopied
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-white/[0.05] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]'
                }`}
              >
                {mailCopied ? '✓ Kopiert!' : '📋 Amanda-Mail kopieren'}
              </button>
            </div>
          )}

          {report?.status !== 'sent' && (
            <button
              onClick={() => setStatus('sent')}
              disabled={!isComplete}
              className={`w-full text-sm font-bold px-4 py-2.5 rounded-xl border transition-all ${
                isComplete
                  ? 'bg-green-500/15 border-green-500/25 text-green-400 hover:bg-green-500/25 cursor-pointer'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-600 cursor-not-allowed'
              }`}
            >
              {isComplete
                ? '✓ Als gesendet markieren'
                : `${totalItems - doneItems} Einträge noch ausstehend`}
            </button>
          )}

          {report?.status === 'sent' && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Gesendet an {report.sent_to}
              {report.sent_at && ` · ${new Date(report.sent_at).toLocaleDateString('de-DE')}`}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default MonthlyReportingTab;
