import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Section, Card, Button, Pill, IconCheck, IconDocument } from '@/components/ui/light';

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

const SOURCE_VARIANT: Record<InventorySource, 'blue' | 'gold' | 'success'> = {
  jtl: 'blue',
  fullmex: 'gold',
  shopify: 'success',
};

const PLATFORM_VARIANT: Record<B2bPlatform, 'gold' | 'blue' | 'warning'> = {
  billbee: 'gold',
  ankorstore: 'blue',
  lightspeed: 'warning',
};

const STATUS_CONFIG: Record<ReportStatus, { label: string; variant: 'neutral' | 'warning' | 'success' }> = {
  collecting: { label: 'Collecting',     variant: 'neutral' },
  review:     { label: 'In Review',      variant: 'warning' },
  sent:       { label: 'Sent to Amanda', variant: 'success' },
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

  // Completeness
  const invFilled = INVENTORY_BRANDS.filter(b => inventory[b.brand]?.inventory_value != null).length;
  const b2bFilled = B2B_ENTRIES.filter(e => b2b[`${e.brand}__${e.platform}`]?.total_revenue != null).length;
  const paypalDone = report?.paypal_statement_received ?? false;
  const totalItems = INVENTORY_BRANDS.length + B2B_ENTRIES.length + 1;
  const doneItems  = invFilled + b2bFilled + (paypalDone ? 1 : 0);
  const progress   = Math.round((doneItems / totalItems) * 100);
  const isComplete = doneItems === totalItems;

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

  if (loading) {
    return (
      <Section>
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--tc-gold)' }} />
        </div>
      </Section>
    );
  }

  return (
    <Section className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="lt-select"
          style={{ width: 'auto', minWidth: '180px' }}
        >
          {monthOptions().map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {report?.status && (
          <Pill variant={STATUS_CONFIG[report.status].variant}>
            {STATUS_CONFIG[report.status].label}
          </Pill>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="lt-text-meta">{doneItems}/{totalItems}</span>
          <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: isComplete ? '#1a8a2e' : 'var(--tc-gold)',
              }}
            />
          </div>
          <span className="lt-text-body lt-tabular">{progress}%</span>
        </div>
      </div>

      {/* Warenwert */}
      <Card padding="none">
        <div className="px-5 py-3.5 lt-header-divider flex items-center">
          <span className="lt-text-h1">Warenwert (Inventarwert)</span>
          <span className="ml-auto lt-text-meta">{invFilled}/{INVENTORY_BRANDS.length} Brands</span>
        </div>
        <div className="lt-divide">
          {INVENTORY_BRANDS.map(({ brand, source, label, hint }) => {
            const row = inventory[brand];
            const isSaving = saving === `inv_${brand}`;
            const hasValue = row?.inventory_value != null;
            return (
              <div key={brand} className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02]">
                <div className="min-w-0 flex-1">
                  <p className="lt-text-body">{label}</p>
                  <p className="lt-text-meta">{hint}</p>
                </div>
                <Pill variant={SOURCE_VARIANT[source]}>{source}</Pill>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue={row?.inventory_value ?? ''}
                    key={`${selectedMonth}_inv_${brand}`}
                    onBlur={e => saveInventory(brand, source, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder="0,00"
                    className="lt-input lt-tabular text-right"
                    style={{ width: '8rem' }}
                  />
                  {isSaving && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 lt-text-meta" style={{ color: 'var(--tc-gold)' }}>•••</span>
                  )}
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: hasValue ? '#1a8a2e' : 'rgba(0,0,0,0.15)' }}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* B2B Rechnungen */}
      <Card padding="none">
        <div className="px-5 py-3.5 lt-header-divider flex items-center">
          <span className="lt-text-h1">B2B-Rechnungen</span>
          <span className="ml-auto lt-text-meta">{b2bFilled}/{B2B_ENTRIES.length} Einträge</span>
        </div>
        <div className="lt-divide">
          {B2B_ENTRIES.map(({ brand, platform, label, hint }) => {
            const key = `${brand}__${platform}`;
            const row = b2b[key];
            const isSaving = saving === `b2b_${key}`;
            const hasValue = row?.total_revenue != null;
            return (
              <div key={key} className="flex items-center gap-3 px-5 py-3 hover:bg-black/[0.02]">
                <div className="min-w-0 flex-1">
                  <p className="lt-text-body">{label}</p>
                  <p className="lt-text-meta">{hint}</p>
                </div>
                <Pill variant={PLATFORM_VARIANT[platform]}>{platform}</Pill>
                <input
                  type="text"
                  defaultValue={row?.invoice_count || ''}
                  key={`${selectedMonth}_b2b_${key}_count`}
                  onBlur={e => saveB2b(brand, platform, 'invoice_count', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  placeholder="#"
                  title="Anzahl Rechnungen"
                  className="lt-input text-center"
                  style={{ width: '3.5rem' }}
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
                    className="lt-input lt-tabular text-right"
                    style={{ width: '8rem' }}
                  />
                  {isSaving && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 lt-text-meta" style={{ color: 'var(--tc-gold)' }}>•••</span>
                  )}
                </div>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: hasValue ? '#1a8a2e' : 'rgba(0,0,0,0.15)' }}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Abschluss */}
      <Card padding="none">
        <div className="px-5 py-3.5 lt-header-divider">
          <span className="lt-text-h1">Abschluss & Versand</span>
        </div>
        <div className="p-5 space-y-3">
          {/* PayPal toggle */}
          <button
            onClick={togglePayPal}
            className="flex items-center gap-3 w-full text-left p-3 rounded-xl border transition-all hover:bg-black/[0.02]"
            style={{
              background: paypalDone ? 'rgba(26,138,46,0.08)' : 'transparent',
              borderColor: paypalDone ? 'rgba(26,138,46,0.25)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{
                background: paypalDone ? '#1a8a2e' : 'transparent',
                border: paypalDone ? '1px solid #156d24' : '1px solid rgba(0,0,0,0.2)',
              }}
            >
              {paypalDone && (
                <span style={{ color: '#ffffff' }}>
                  <IconCheck size={12} />
                </span>
              )}
            </div>
            <div>
              <p className="lt-text-body">PayPal-Kontoauszug bereit</p>
              <p className="lt-text-meta">Anfangs- + Endbestand als PDF — 1 Datei</p>
            </div>
          </button>

          {report?.status !== 'sent' && (
            <div className="flex gap-2">
              {report?.status !== 'review' && (
                <Button variant="neutral" onClick={() => setStatus('review')} fullWidth>
                  Zur Prüfung
                </Button>
              )}
              <Button
                variant={mailCopied ? 'success' : 'neutral'}
                icon={<IconDocument />}
                onClick={copyMail}
                fullWidth
              >
                {mailCopied ? 'Kopiert!' : 'Amanda-Mail kopieren'}
              </Button>
            </div>
          )}

          {report?.status !== 'sent' && (
            <Button
              variant={isComplete ? 'success' : 'neutral'}
              onClick={() => setStatus('sent')}
              disabled={!isComplete}
              fullWidth
              icon={isComplete ? <IconCheck /> : undefined}
            >
              {isComplete
                ? 'Als gesendet markieren'
                : `${totalItems - doneItems} Einträge noch ausstehend`}
            </Button>
          )}

          {report?.status === 'sent' && (
            <div className="flex items-center gap-2 lt-text-body lt-text-success">
              <IconCheck size={16} />
              Gesendet an {report.sent_to}
              {report.sent_at && ` · ${new Date(report.sent_at).toLocaleDateString('de-DE')}`}
            </div>
          )}
        </div>
      </Card>
    </Section>
  );
}

export default MonthlyReportingTab;
