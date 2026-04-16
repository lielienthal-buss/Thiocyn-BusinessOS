import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useBrand } from '@/lib/BrandContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_IDS = ['thiocyn', 'take-a-shot', 'dr-severin', 'paigh', 'wristr', 'timber-john'] as const;
type BrandId = typeof BRAND_IDS[number];

const BRAND_LABELS: Record<BrandId, { name: string; emoji: string }> = {
  'thiocyn':      { name: 'Thiocyn',       emoji: '💊' },
  'take-a-shot':  { name: 'Take A Shot',   emoji: '📸' },
  'dr-severin':   { name: 'Dr. Severin',   emoji: '🧬' },
  'paigh':        { name: 'Paigh',         emoji: '👜' },
  'wristr':       { name: 'Wristr',        emoji: '⌚' },
  'timber-john':  { name: 'Timber & John', emoji: '🪵' },
};

const PLATFORMS = ['Shopify', 'Amazon', 'OTTO', 'Etsy', 'Avocadostore'] as const;
type Platform = typeof PLATFORMS[number];

type OrderStatus = 'pending' | 'fulfilled' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
type InventoryStatus = 'ok' | 'low' | 'critical';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EcomMetric {
  id: string;
  brand_id: BrandId;
  revenue_today: number | null;
  revenue_mtd: number | null;
  revenue_target_mtd: number | null;
  orders_today: number | null;
  orders_mtd: number | null;
  aov: number | null;
  return_rate: number | null;
  inventory_status: InventoryStatus | null;
  updated_at: string | null;
  synced_at: string | null;
}

interface EcomOrder {
  id: string;
  brand_id: BrandId;
  order_id: string;
  platform: Platform;
  customer_email: string | null;
  amount: number;
  currency: string;
  status: OrderStatus;
  created_at: string;
  notes: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number | null | undefined, currency = 'EUR') => {
  if (n == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
};

const fmtTs = (ts: string | null | undefined) => {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const INVENTORY_DOT: Record<InventoryStatus, string> = {
  ok:       'bg-green-500',
  low:      'bg-yellow-400',
  critical: 'bg-red-500',
};

const INVENTORY_LABEL: Record<InventoryStatus, string> = {
  ok:       'OK',
  low:      'Low',
  critical: 'Critical',
};

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  fulfilled: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  returned:  'bg-orange-50 text-orange-700 border-orange-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────

const OverviewTab: React.FC = () => {
  const [metrics, setMetrics] = useState<EcomMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ecom_metrics')
      .select('*')
      .order('brand_id');
    setMetrics((data as EcomMetric[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleSync = async (metric: EcomMetric) => {
    setSyncingId(metric.id);
    const webhookUrl = (import.meta as any).env?.VITE_SHOPIFY_SYNC_WEBHOOK_URL as string | undefined;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: metric.brand_id }),
      });
    }
    await supabase
      .from('ecom_metrics')
      .update({ synced_at: new Date().toISOString() })
      .eq('id', metric.id);
    await fetchMetrics();
    setSyncingId(null);
  };

  // Build display list: merge fetched data with all 6 brand slots
  const cards = BRAND_IDS.map(brandId => {
    const m = metrics.find(x => x.brand_id === brandId) ?? null;
    return { brandId, m };
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Brand Revenue Overview</h3>
        <p className="text-xs text-slate-500 mt-0.5">Live ecommerce metrics across all 6 brands</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(({ brandId, m }) => {
          const { name, emoji } = BRAND_LABELS[brandId];
          const pct = m?.revenue_mtd != null && m?.revenue_target_mtd
            ? Math.min(100, Math.round((m.revenue_mtd / m.revenue_target_mtd) * 100))
            : null;
          const isEmpty = m == null;

          return (
            <div
              key={brandId}
              className="flex flex-col gap-3 p-5 bg-white ring-1 ring-slate-200 hover:ring-indigo-300 rounded-2xl transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{name}</p>
                    <p className="text-[10px] text-slate-500">{brandId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {m?.inventory_status ? (
                    <span
                      className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        m.inventory_status === 'ok'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : m.inventory_status === 'low'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${INVENTORY_DOT[m.inventory_status]}`} />
                      {INVENTORY_LABEL[m.inventory_status]}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-semibold">Inventory —</span>
                  )}
                </div>
              </div>

              {isEmpty ? (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center py-4 gap-2">
                  <span className="text-xs font-semibold text-slate-500">—</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full ring-1 ring-slate-200">
                    Waiting for data
                  </span>
                </div>
              ) : (
                <>
                  {/* Revenue MTD vs Target */}
                  <div className="space-y-1.5">
                    <div className="flex items-end justify-between text-xs">
                      <span className="text-slate-600 font-semibold">Revenue MTD</span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-900">{fmt(m.revenue_mtd)}</span>
                        {m.revenue_target_mtd != null && (
                          <span className="text-slate-500 ml-1">/ {fmt(m.revenue_target_mtd)}</span>
                        )}
                      </div>
                    </div>
                    {pct != null && (
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                    {pct != null && (
                      <p className="text-[10px] text-slate-500 text-right">{pct}% of target</p>
                    )}
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-600 font-semibold">Orders Today</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        {m.orders_today ?? '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-600 font-semibold">Orders MTD</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        {m.orders_mtd ?? '—'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-[10px] text-slate-600 font-semibold">AOV</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">
                        {fmt(m.aov)}
                      </p>
                    </div>
                  </div>

                  {m.return_rate != null && (
                    <p className="text-[11px] text-slate-500">
                      Return rate: <span className="font-semibold text-slate-600">{m.return_rate.toFixed(1)}%</span>
                    </p>
                  )}
                </>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 mt-auto">
                <p className="text-[10px] text-slate-500">
                  {m?.synced_at
                    ? <>Synced {fmtTs(m.synced_at)}</>
                    : m?.updated_at
                    ? <>Updated {fmtTs(m.updated_at)}</>
                    : 'Never synced'}
                </p>
                <button
                  onClick={() => m && handleSync(m)}
                  disabled={isEmpty || syncingId === m?.id}
                  className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {syncingId === m?.id ? (
                    <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  ) : '↻'}
                  Sync
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Orders Tab ───────────────────────────────────────────────────────────────

const EMPTY_ORDER: Omit<EcomOrder, 'id' | 'created_at'> = {
  brand_id: 'thiocyn',
  order_id: '',
  platform: 'Shopify',
  customer_email: '',
  amount: 0,
  currency: 'EUR',
  status: 'pending',
  notes: '',
};

const OrdersTab: React.FC = () => {
  const { activeBrand } = useBrand();
  const [orders, setOrders] = useState<EcomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_ORDER);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ecom_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setOrders((data as EcomOrder[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter(o => {
    if (activeBrand && o.brand_id !== (activeBrand.slug as BrandId)) return false;
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    return true;
  });

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const { error } = await supabase.from('ecom_orders').insert({
      ...formData,
      created_at: new Date().toISOString(),
    });
    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return;
    }
    setFormData(EMPTY_ORDER);
    setShowAddForm(false);
    setSaving(false);
    fetchOrders();
  };

  const ORDER_STATUSES: OrderStatus[] = ['pending', 'fulfilled', 'shipped', 'delivered', 'returned', 'cancelled'];

  // Inline mutations (with rollback on error)
  const updateOrder = async (id: string, changes: Partial<EcomOrder>) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));
    const { error } = await supabase.from('ecom_orders').update(changes).eq('id', id);
    if (error) fetchOrders(); // rollback
  };

  const deleteOrder = async (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    const { error } = await supabase.from('ecom_orders').delete().eq('id', id);
    if (error) fetchOrders(); // rollback
  };

  return (
    <div className="space-y-6">
      {/* Header + controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Orders</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} shown
            {activeBrand && <span className="ml-1">· filtered by {activeBrand.name}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as OrderStatus | 'all')}
            className="text-xs font-semibold ring-1 ring-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <button
            onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Manual Order
          </button>
        </div>
      </div>

      {/* Add order form */}
      {showAddForm && (
        <form
          onSubmit={handleAddOrder}
          className="p-5 bg-white ring-1 ring-slate-200 rounded-2xl space-y-4"
        >
          <p className="text-sm font-semibold text-slate-900">Add Manual Order</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Brand</label>
              <select
                required
                value={formData.brand_id}
                onChange={e => setFormData(f => ({ ...f, brand_id: e.target.value as BrandId }))}
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {BRAND_IDS.map(b => <option key={b} value={b}>{BRAND_LABELS[b].name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Order ID</label>
              <input
                required
                type="text"
                value={formData.order_id}
                onChange={e => setFormData(f => ({ ...f, order_id: e.target.value }))}
                placeholder="#1234"
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Platform</label>
              <select
                required
                value={formData.platform}
                onChange={e => setFormData(f => ({ ...f, platform: e.target.value as Platform }))}
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Customer Email</label>
              <input
                type="email"
                value={formData.customer_email ?? ''}
                onChange={e => setFormData(f => ({ ...f, customer_email: e.target.value }))}
                placeholder="customer@example.com"
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Amount</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={e => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Currency</label>
              <select
                value={formData.currency}
                onChange={e => setFormData(f => ({ ...f, currency: e.target.value }))}
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(f => ({ ...f, status: e.target.value as OrderStatus }))}
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-600 mb-1">Notes</label>
              <input
                type="text"
                value={formData.notes ?? ''}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional note..."
                className="w-full text-xs ring-1 ring-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {saveError && (
            <p className="text-xs text-red-600 font-semibold">{saveError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Order'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setSaveError(null); }}
              className="px-4 py-2 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-sm font-semibold text-slate-600">No orders found</p>
          <p className="text-xs text-slate-500 mt-1">Adjust your filters or add a manual order above.</p>
        </div>
      ) : (
        <div className="bg-white ring-1 ring-slate-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Brand</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Platform</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider text-right">Amount</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((order, i) => {
                const brand = BRAND_LABELS[order.brand_id] ?? { name: order.brand_id, emoji: '🏷️' };
                return (
                  <tr
                    key={order.id}
                    className={`group hover:bg-slate-50 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {order.order_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                        <span>{brand.emoji}</span>
                        {brand.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{order.platform}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">
                      {order.customer_email || '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-right whitespace-nowrap">
                      {fmt(order.amount, order.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status}
                        onChange={e => updateOrder(order.id, { status: e.target.value as OrderStatus })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none capitalize ${ORDER_STATUS_STYLES[order.status]}`}
                      >
                        {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {fmtTs(order.created_at)}
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <input
                        type="text"
                        value={order.notes ?? ''}
                        onChange={e => setOrders(prev => prev.map(o => o.id === order.id ? { ...o, notes: e.target.value } : o))}
                        onBlur={e => updateOrder(order.id, { notes: e.target.value || null })}
                        placeholder="Note..."
                        className="w-full text-xs bg-transparent border-none outline-none text-slate-500 placeholder-slate-400 hover:text-slate-900 focus:text-slate-900 transition-colors"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => { if (confirm('Delete order?')) deleteOrder(order.id); }}
                        className="text-slate-500 hover:text-red-600 transition-colors text-xs opacity-0 group-hover:opacity-100"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type EcomTab = 'overview' | 'orders' | 'shopify' | 'products';

const EcommerceView: React.FC = () => {
  const [tab, setTab] = useState<EcomTab>('overview');

  const TABS: { id: EcomTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'orders',   label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'shopify',  label: 'Shopify Sync' },
  ];

  return (
    <div className="animate-[fadeIn_0.3s_ease-out]">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">E-Commerce</h2>
        <p className="text-sm text-slate-500 mt-0.5">Revenue, orders and inventory across all brands</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px ${
              tab === t.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'orders'   && <OrdersTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'shopify'  && <ShopifySyncTab />}
    </div>
  );
};

// ─── Products Tab ─────────────────────────────────────────────────────────

const ProductsTab: React.FC = () => {
  const [products, setProducts] = useState<{ brand_slug: string; product_title: string; total_orders: number; total_revenue: number; total_units: number; creator_attributed_orders: number; creator_attributed_revenue: number; period: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('product_performance').select('*').order('total_revenue', { ascending: false }).limit(100);
      setProducts(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-slate-500 text-sm">Lade Produkte...</div>;
  if (products.length === 0) return <div className="text-center py-20 text-slate-500">Noch keine Produktdaten. Starte einen Shopify Sync.</div>;

  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Brand</th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Produkt</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Orders</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Revenue</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Units</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Creator Orders</th>
            <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Creator Rev</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {products.map((p, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-600 text-xs">{p.brand_slug}</td>
              <td className="px-4 py-3 text-slate-900 font-medium">{p.product_title}</td>
              <td className="px-4 py-3 text-right text-slate-900">{p.total_orders}</td>
              <td className="px-4 py-3 text-right text-slate-900 font-semibold">{fmt(p.total_revenue)}</td>
              <td className="px-4 py-3 text-right text-slate-600">{p.total_units}</td>
              <td className="px-4 py-3 text-right text-indigo-700">{p.creator_attributed_orders}</td>
              <td className="px-4 py-3 text-right text-indigo-700">{fmt(p.creator_attributed_revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

// ─── Shopify Sync Tab ─────────────────────────────────────────────────────

const ShopifySyncTab: React.FC = () => {
  const { activeBrand } = useBrand();
  const initialBrand: BrandId = (
    activeBrand && (BRAND_IDS as readonly string[]).includes(activeBrand.slug)
      ? (activeBrand.slug as BrandId)
      : 'paigh'
  );
  const [selectedBrand, setSelectedBrand] = useState<BrandId>(initialBrand);
  const [daysBack, setDaysBack] = useState(7);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ brand_slug: string; sync_type: string; orders_fetched: number; orders_matched: number; revenue_total: number; status: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('shopify_sync_log').select('*').order('created_at', { ascending: false }).limit(20);
      setLogs(data ?? []);
    })();
  }, [result]);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-shopify-sales', {
        body: { brand_slug: selectedBrand, days_back: daysBack },
      });
      if (error) throw error;
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(`Error: ${String(err)}`);
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      {/* Sync Controls */}
      <div className="bg-white ring-1 ring-slate-200 rounded-xl p-5">
        <h3 className="text-slate-900 font-semibold mb-4">Shopify Sync</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">Brand</label>
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value as BrandId)}
              className="px-3 py-2 ring-1 ring-slate-200 bg-white text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {BRAND_IDS.map(b => <option key={b} value={b}>{BRAND_LABELS[b].emoji} {BRAND_LABELS[b].name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">Zeitraum</label>
            <select value={daysBack} onChange={e => setDaysBack(Number(e.target.value))}
              className="px-3 py-2 ring-1 ring-slate-200 bg-white text-slate-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value={1}>Gestern</option>
              <option value={7}>Letzte 7 Tage</option>
              <option value={14}>Letzte 14 Tage</option>
              <option value={30}>Letzte 30 Tage</option>
            </select>
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
            {syncing ? 'Syncing...' : 'Sync starten'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Zieht Bestellungen aus Shopify, matched Affiliate-Codes auf Creator, aktualisiert Sales + Product Performance.
        </p>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-white ring-1 ring-slate-200 rounded-xl p-4 text-xs font-mono text-slate-900 relative">
          <button onClick={() => setResult(null)} className="absolute top-2 right-2 text-slate-500 hover:text-slate-900">×</button>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}

      {/* Sync Log */}
      {logs.length > 0 && (
        <div className="bg-white ring-1 ring-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Sync History</h3>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Zeit</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Brand</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Orders</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Matched</th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-600">Revenue</th>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {logs.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500 text-xs">{new Date(l.created_at).toLocaleString('de-DE')}</td>
                  <td className="px-4 py-2 text-slate-900">{l.brand_slug}</td>
                  <td className="px-4 py-2 text-right text-slate-900">{l.orders_fetched}</td>
                  <td className="px-4 py-2 text-right text-indigo-700">{l.orders_matched}</td>
                  <td className="px-4 py-2 text-right text-slate-900 font-semibold">{fmt(l.revenue_total)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${l.status === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EcommerceView;
