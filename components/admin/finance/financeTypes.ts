// ─── Constants ────────────────────────────────────────────────────────────────

export const BRANDS = [
  'thiocyn',
  'take-a-shot',
  'dr-severin',
  'paigh',
  'wristr',
  'timber-john',
] as const;

export const PLATFORMS = ['PayPal', 'Stripe', 'Amazon', 'Klarna', 'Other'] as const;
export const CURRENCIES = ['EUR', 'USD'] as const;

export const DISPUTE_STATUSES = ['open', 'escalated', 'resolved', 'won', 'lost'] as const;

export type Brand = typeof BRANDS[number];
export type Platform = typeof PLATFORMS[number];
export type Currency = typeof CURRENCIES[number];
export type DisputeStatus = typeof DISPUTE_STATUSES[number];
export type FinanceTab = 'disputes' | 'invoices' | 'overview' | 'monthlyReporting' | 'pipeline';

// ─── Finance Pipeline ────────────────────────────────────────────────────────

export const ENTITIES = [
  'thiocyn',
  'hart-limes',
  'paigh',
  'dr-severin',
  'take-a-shot',
  'wristr',
  'timber-john',
] as const;

export const PAYMENT_METHODS = ['qonto', 'paypal', 'kreditkarte', 'wise', 'lastschrift', 'bar', 'other'] as const;
export const PIPELINE_STATUSES = ['offen', 'bezahlt', 'beleg_fehlt', 'erledigt', 'ueberfaellig'] as const;

// Welle 2 — Mahnstufen + Priority-Tier (per zahlungspriorisierung SOP)
// 0=keine, 1=Erinnerung, 2=1.Mahnung, 3=2./Letzte, 4=Inkasso
export type Mahnstufe = 0 | 1 | 2 | 3 | 4;
// 1=Logistik, 2=Behörden, 3=SV, 4=Gehälter, 5=Ads, 6=Lieferanten, 7=Tools, 8=Freelancer
export type PriorityTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type Entity = typeof ENTITIES[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type PipelineStatus = typeof PIPELINE_STATUSES[number];

export interface PipelineItem {
  id: string;
  vendor: string;
  invoice_number: string | null;
  amount: number;
  currency: Currency;
  entity: Entity;
  payment_method: PaymentMethod | null;
  due_date: string | null;
  notes: string | null;
  received_at: string | null;
  paid_at: string | null;
  receipt_attached: boolean;
  datev_exported: boolean;
  status: PipelineStatus;
  // Welle 2 — Treasury fields
  mahnstufe: Mahnstufe;
  priority_tier: PriorityTier | null;
  scheduled_pay_date: string | null;
  late_fee_risk_eur: number | null;
  auto_paid: boolean;
  schedule_rationale: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Welle 2 — Mahnungen 1:n History ──────────────────────────────────────────

export const MAHNUNG_STATUSES = ['open', 'paid', 'disputed', 'cancelled'] as const;
export type MahnungStatus = typeof MAHNUNG_STATUSES[number];

export interface Mahnung {
  id: string;
  pipeline_id: string | null;
  vendor: string;
  entity: Entity | string;
  stufe: 1 | 2 | 3 | 4;
  amount: number;
  currency: Currency;
  mahngebuehren: number;
  received_at: string;
  deadline: string | null;
  status: MahnungStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Welle 2 — Cash Snapshots ─────────────────────────────────────────────────

export const CASH_SNAPSHOT_SOURCES = ['manual', 'qonto_api', 'paypal_api'] as const;
export type CashSnapshotSource = typeof CASH_SNAPSHOT_SOURCES[number];

export interface CashSnapshot {
  id: string;
  account: string;
  account_label: string | null;
  balance: number;
  currency: Currency;
  snapshot_date: string;
  source: CashSnapshotSource;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const PIPELINE_STATUS_STYLES: Record<PipelineStatus, string> = {
  offen: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  bezahlt: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  beleg_fehlt: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  erledigt: 'bg-green-500/15 text-green-400 border border-green-500/20',
  ueberfaellig: 'bg-red-500/15 text-red-400 border border-red-500/20',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Dispute {
  id: string;
  brand: Brand;
  case_id: string;
  platform: Platform;
  amount: number;
  currency: Currency;
  deadline: string | null;
  status: DisputeStatus;
  notes: string | null;
  created_at: string;
}

// ─── Status style maps ────────────────────────────────────────────────────────

export const DISPUTE_STATUS_STYLES: Record<DisputeStatus, string> = {
  open: 'bg-red-100 text-red-700 border border-red-200',
  escalated: 'bg-orange-100 text-orange-700 border border-orange-200',
  resolved: 'bg-gray-100 text-gray-500 border border-gray-200',
  won: 'bg-green-100 text-green-700 border border-green-200',
  lost: 'bg-red-100 text-red-600 border border-red-200',
};
