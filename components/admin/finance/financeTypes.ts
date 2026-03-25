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
export const INVOICE_STATUSES = ['pending', 'paid', 'overdue', 'disputed'] as const;
export const INVOICE_CATEGORIES = ['invoice', 'mahnung', 'subscription'] as const;

export type Brand = typeof BRANDS[number];
export type Platform = typeof PLATFORMS[number];
export type Currency = typeof CURRENCIES[number];
export type DisputeStatus = typeof DISPUTE_STATUSES[number];
export type InvoiceStatus = typeof INVOICE_STATUSES[number];
export type InvoiceCategory = typeof INVOICE_CATEGORIES[number];
export type FinanceTab = 'disputes' | 'invoices' | 'overview';

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

export interface Invoice {
  id: string;
  brand: Brand;
  vendor: string;
  amount: number;
  currency: Currency;
  invoice_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  category: InvoiceCategory;
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

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  paid: 'bg-green-100 text-green-700 border border-green-200',
  overdue: 'bg-red-100 text-red-700 border border-red-200',
  disputed: 'bg-orange-100 text-orange-700 border border-orange-200',
};

export const CATEGORY_STYLES: Record<InvoiceCategory, string> = {
  invoice: 'bg-blue-50 text-blue-600 border border-blue-100',
  mahnung: 'bg-red-50 text-red-600 border border-red-100',
  subscription: 'bg-purple-50 text-purple-600 border border-purple-100',
};
